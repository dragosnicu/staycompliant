// server/routes/ical.js
// Endpoints for managing iCal feed URLs and triggering syncs.

const express  = require('express');
const router   = express.Router();
const pool     = require('../db');
const auth     = require('../middleware/auth');
const { syncProperty } = require('../services/icalSync');

// ── helpers ──────────────────────────────────────────────────────────────────

async function ownsProperty(userId, propertyId) {
  const { rows } = await pool.query(
    'SELECT id FROM properties WHERE id = $1 AND user_id = $2',
    [propertyId, userId]
  );
  return rows.length > 0;
}

function isValidIcalUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

// ── GET /api/ical/:propertyId ─────────────────────────────────────────────────
// Returns saved iCal URLs + sync status for a property
router.get('/:propertyId', auth, async (req, res) => {
  try {
    const { propertyId } = req.params;
    if (!(await ownsProperty(req.user.id, propertyId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { rows } = await pool.query(
      `SELECT
         ical_airbnb_url,
         ical_vrbo_url,
         ical_last_sync,
         ical_sync_status
       FROM properties
       WHERE id = $1`,
      [propertyId]
    );

    if (!rows.length) return res.status(404).json({ error: 'Property not found' });

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PUT /api/ical/:propertyId ─────────────────────────────────────────────────
// Save iCal URLs (without syncing yet)
router.put('/:propertyId', auth, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { ical_airbnb_url, ical_vrbo_url } = req.body;

    if (!(await ownsProperty(req.user.id, propertyId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Validate URLs if provided
    if (ical_airbnb_url && !isValidIcalUrl(ical_airbnb_url)) {
      return res.status(400).json({ error: 'Invalid Airbnb iCal URL' });
    }
    if (ical_vrbo_url && !isValidIcalUrl(ical_vrbo_url)) {
      return res.status(400).json({ error: 'Invalid VRBO iCal URL' });
    }

    const { rows } = await pool.query(
      `UPDATE properties
       SET ical_airbnb_url  = $2,
           ical_vrbo_url    = $3,
           ical_sync_status = 'never'
       WHERE id = $1
       RETURNING ical_airbnb_url, ical_vrbo_url, ical_last_sync, ical_sync_status`,
      [propertyId, ical_airbnb_url || null, ical_vrbo_url || null]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/ical/:propertyId/sync ──────────────────────────────────────────
// Trigger an immediate sync for a property (called from UI "Sync Now" button)
router.post('/:propertyId/sync', auth, async (req, res) => {
  try {
    const { propertyId } = req.params;

    if (!(await ownsProperty(req.user.id, propertyId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Verify at least one URL is set
    const { rows: prop } = await pool.query(
      'SELECT ical_airbnb_url, ical_vrbo_url FROM properties WHERE id = $1',
      [propertyId]
    );
    if (!prop[0]?.ical_airbnb_url && !prop[0]?.ical_vrbo_url) {
      return res.status(400).json({ error: 'No iCal URL configured for this property' });
    }

    // Run sync (can take 2-5 seconds — synchronous is fine for MVP)
    const results = await syncProperty(parseInt(propertyId));

    // Summarize for the response
    const summary = { airbnb: null, vrbo: null };

    if (results.airbnb) {
      summary.airbnb = results.airbnb.error
        ? { error: results.airbnb.error }
        : {
            imported: results.airbnb.imported,
            updated:  results.airbnb.updated,
            skipped:  results.airbnb.skipped,
          };
    }
    if (results.vrbo) {
      summary.vrbo = results.vrbo.error
        ? { error: results.vrbo.error }
        : {
            imported: results.vrbo.imported,
            updated:  results.vrbo.updated,
            skipped:  results.vrbo.skipped,
          };
    }

    res.json({ success: true, results: summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Sync failed' });
  }
});

// ── DELETE /api/ical/:propertyId/:platform ────────────────────────────────────
// Remove a single iCal feed URL (and its imported bookings)
router.delete('/:propertyId/:platform', auth, async (req, res) => {
  try {
    const { propertyId, platform } = req.params;

    if (!(await ownsProperty(req.user.id, propertyId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!['airbnb', 'vrbo'].includes(platform)) {
      return res.status(400).json({ error: 'platform must be airbnb or vrbo' });
    }

    const col = platform === 'airbnb' ? 'ical_airbnb_url' : 'ical_vrbo_url';
    const src = platform === 'airbnb' ? 'airbnb_ical'     : 'vrbo_ical';

    // Remove the URL
    await pool.query(`UPDATE properties SET ${col} = NULL WHERE id = $1`, [propertyId]);

    // Remove all bookings imported from this platform for this property
    const { rowCount } = await pool.query(
      'DELETE FROM bookings WHERE property_id = $1 AND source = $2',
      [propertyId, src]
    );

    res.json({ success: true, bookings_removed: rowCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
