// server/routes/bookings.js
const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const auth    = require('../middleware/auth');

// ── helpers ────────────────────────────────────────────────
// Verify the requesting user owns the property
async function ownsPropery(userId, propertyId) {
  const { rows } = await pool.query(
    'SELECT id FROM properties WHERE id = $1 AND user_id = $2',
    [propertyId, userId]
  );
  return rows.length > 0;
}

// ── GET /api/bookings/:propertyId ───────────────────────────
// All bookings for a property + year-to-date night total
router.get('/:propertyId', auth, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { year } = req.query; // optional ?year=2025

    if (!(await ownsPropery(req.user.id, propertyId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const targetYear = year || new Date().getFullYear();

    // All bookings for this property (newest first)
    const { rows: bookings } = await pool.query(
      `SELECT
         id, platform, guest_name,
         check_in, check_out,
         (check_out - check_in) AS nights,
         notes, created_at
       FROM bookings
       WHERE property_id = $1
       ORDER BY check_in DESC`,
      [propertyId]
    );

    // YTD nights (calendar year of check_in)
    const { rows: ytd } = await pool.query(
      `SELECT COALESCE(SUM(check_out - check_in), 0)::int AS total_nights
       FROM bookings
       WHERE property_id = $1
         AND EXTRACT(YEAR FROM check_in) = $2`,
      [propertyId, targetYear]
    );

    // Fetch night cap for this property
    const { rows: prop } = await pool.query(
      'SELECT night_cap FROM properties WHERE id = $1',
      [propertyId]
    );

    res.json({
      bookings,
      summary: {
        year:         parseInt(targetYear),
        total_nights: ytd[0].total_nights,
        night_cap:    prop[0]?.night_cap || null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/bookings/:propertyId ──────────────────────────
// Add a booking
router.post('/:propertyId', auth, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { platform, guest_name, check_in, check_out, notes } = req.body;

    if (!(await ownsPropery(req.user.id, propertyId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!check_in || !check_out) {
      return res.status(400).json({ error: 'check_in and check_out are required' });
    }

    if (new Date(check_out) <= new Date(check_in)) {
      return res.status(400).json({ error: 'check_out must be after check_in' });
    }

    const { rows } = await pool.query(
      `INSERT INTO bookings (property_id, platform, guest_name, check_in, check_out, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *, (check_out - check_in) AS nights`,
      [propertyId, platform || 'other', guest_name || null, check_in, check_out, notes || null]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PUT /api/bookings/:propertyId/:bookingId ────────────────
// Edit a booking
router.put('/:propertyId/:bookingId', auth, async (req, res) => {
  try {
    const { propertyId, bookingId } = req.params;
    const { platform, guest_name, check_in, check_out, notes } = req.body;

    if (!(await ownsPropery(req.user.id, propertyId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (new Date(check_out) <= new Date(check_in)) {
      return res.status(400).json({ error: 'check_out must be after check_in' });
    }

    const { rows } = await pool.query(
      `UPDATE bookings
       SET platform = $1, guest_name = $2, check_in = $3, check_out = $4, notes = $5
       WHERE id = $6 AND property_id = $7
       RETURNING *, (check_out - check_in) AS nights`,
      [platform, guest_name, check_in, check_out, notes, bookingId, propertyId]
    );

    if (!rows.length) return res.status(404).json({ error: 'Booking not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE /api/bookings/:propertyId/:bookingId ─────────────
router.delete('/:propertyId/:bookingId', auth, async (req, res) => {
  try {
    const { propertyId, bookingId } = req.params;

    if (!(await ownsPropery(req.user.id, propertyId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await pool.query(
      'DELETE FROM bookings WHERE id = $1 AND property_id = $2',
      [bookingId, propertyId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
