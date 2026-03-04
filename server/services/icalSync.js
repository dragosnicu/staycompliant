// server/services/icalSync.js
// Fetches + parses iCal feeds from Airbnb/VRBO and upserts into bookings table.
// Handles all platform-specific quirks for 100% accuracy.

const https  = require('https');
const http   = require('http');
const pool   = require('../db');

// ── iCal parser (no external dep needed — pure regex on .ics format) ────────
// We implement our own lightweight parser to avoid node-ical version issues.

/**
 * Fetch raw iCal text from a URL.
 * Returns the .ics body as a string.
 */
function fetchIcal(url, redirectCount = 0) {
  if (redirectCount > 5) {
    return Promise.reject(new Error('Too many redirects fetching iCal URL'));
  }
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 10000 }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        res.resume(); // consume body to free socket before redirecting
        const location = res.headers.location;
        if (!location) return reject(new Error('Redirect with no Location header'));
        return fetchIcal(location, redirectCount + 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} fetching iCal URL`));
      }
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout fetching iCal URL'));
    });
  });
}

/**
 * Unfold iCal lines (RFC 5545: lines can be continued with CRLF + space/tab)
 */
function unfoldLines(raw) {
  return raw.replace(/\r?\n[ \t]/g, '');
}

/**
 * Parse iCal text into an array of VEVENT objects.
 * Each event: { uid, summary, dtstart, dtend, description, status }
 */
function parseIcal(raw) {
  const text   = unfoldLines(raw);
  const lines  = text.split(/\r?\n/);
  const events = [];
  let current  = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current) events.push(current);
      current = null;
      continue;
    }
    if (!current) continue;

    // Split key;params:value
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const keyFull = line.slice(0, colonIdx).toUpperCase();
    const value   = line.slice(colonIdx + 1).trim();

    // Extract base key (before any ;PARAM=xxx)
    const baseKey = keyFull.split(';')[0];

    // Parse TZID parameter if present
    const tzMatch = keyFull.match(/TZID=([^;:]+)/);
    const tzid    = tzMatch ? tzMatch[1] : null;

    switch (baseKey) {
      case 'UID':
        current.uid = value;
        break;
      case 'SUMMARY':
        current.summary = unescapeIcal(value);
        break;
      case 'DESCRIPTION':
        current.description = unescapeIcal(value);
        break;
      case 'STATUS':
        current.status = value.toUpperCase();
        break;
      case 'DTSTART':
        current.dtstart     = parseIcalDate(value, tzid);
        current.dtstart_raw = value;
        break;
      case 'DTEND':
        current.dtend     = parseIcalDate(value, tzid);
        current.dtend_raw = value;
        break;
    }
  }

  return events;
}

/**
 * Parse iCal date value to a JS Date.
 * Handles: DATE (YYYYMMDD), DATETIME (YYYYMMDDTHHmmssZ), floating times.
 */
function parseIcalDate(value, tzid) {
  if (!value) return null;

  // All-day date: YYYYMMDD
  if (/^\d{8}$/.test(value)) {
    const y = value.slice(0, 4);
    const m = value.slice(4, 6);
    const d = value.slice(6, 8);
    return new Date(`${y}-${m}-${d}T00:00:00Z`);
  }

  // UTC datetime: YYYYMMDDTHHmmssZ
  if (/Z$/.test(value)) {
    const y  = value.slice(0, 4);
    const mo = value.slice(4, 6);
    const d  = value.slice(6, 8);
    const h  = value.slice(9, 11);
    const mi = value.slice(11, 13);
    const s  = value.slice(13, 15);
    return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
  }

  // Local/floating datetime: YYYYMMDDTHHmmss
  // Treat as UTC (safest for compliance tracking — we only care about date, not hour)
  if (/T/.test(value)) {
    const y  = value.slice(0, 4);
    const mo = value.slice(4, 6);
    const d  = value.slice(6, 8);
    const h  = value.slice(9, 11);
    const mi = value.slice(11, 13);
    const s  = value.slice(13, 15);
    return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
  }

  return null;
}

function unescapeIcal(str) {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

/**
 * Convert a JS Date to YYYY-MM-DD string (for PostgreSQL DATE columns).
 */
function toDateStr(date) {
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

// ── Platform detection & filtering ──────────────────────────────────────────

/**
 * Airbnb iCal quirks:
 * - SUMMARY for BLOCKED/unavailable nights is literally "Airbnb (Not available)" 
 *   or "Blocked" or "Not available" — these are NOT actual bookings
 * - Real bookings have SUMMARY like "Reserved" or guest name
 * - STATUS:CANCELLED should be skipped
 */
function isAirbnbBooking(event) {
  if (!event.uid || !event.dtstart || !event.dtend) return false;
  if (event.status === 'CANCELLED') return false;

  const summary = (event.summary || '').toLowerCase();

  // Skip blocked/unavailable slots
  const BLOCKED_PATTERNS = [
    'not available',
    'airbnb (not available)',
    'blocked',
    'unavailable',
    'owner block',
    'maintenance',
    'hold',
  ];
  if (BLOCKED_PATTERNS.some(p => summary.includes(p))) return false;

  return true;
}

/**
 * VRBO iCal quirks:
 * - Similar to Airbnb but SUMMARY can be "Owner Block" or "HOLD"
 * - STATUS:TENTATIVE counts as a booking (confirmed booking = CONFIRMED or no STATUS)
 */
function isVrboBooking(event) {
  if (!event.uid || !event.dtstart || !event.dtend) return false;
  if (event.status === 'CANCELLED') return false;

  const summary = (event.summary || '').toLowerCase();

  const BLOCKED_PATTERNS = [
    'owner block',
    'hold',
    'maintenance',
    'blocked',
    'not available',
  ];
  if (BLOCKED_PATTERNS.some(p => summary.includes(p))) return false;

  return true;
}

/**
 * iCal DTEND for all-day events is EXCLUSIVE (checkout day).
 * e.g., check-in Jan 5, check-out Jan 8 → DTSTART=20240105, DTEND=20240108
 * This is correct for night counting: 3 nights (5th, 6th, 7th)
 * So check_in = DTSTART, check_out = DTEND — no adjustment needed.
 */
function extractDates(event) {
  const checkIn  = toDateStr(event.dtstart);
  const checkOut = toDateStr(event.dtend);
  return { checkIn, checkOut };
}

// ── Main sync function ───────────────────────────────────────────────────────

/**
 * Sync one iCal feed for a property.
 *
 * @param {number} propertyId
 * @param {string} icalUrl
 * @param {string} platform  - 'airbnb_ical' | 'vrbo_ical'
 * @returns {{ imported: number, updated: number, skipped: number, errors: string[] }}
 */
async function syncIcalFeed(propertyId, icalUrl, platform) {
  const result = { imported: 0, updated: 0, skipped: 0, errors: [] };

  // 1. Fetch raw iCal
  let raw;
  try {
    raw = await fetchIcal(icalUrl);
  } catch (err) {
    throw new Error(`Failed to fetch iCal feed: ${err.message}`);
  }

  // 2. Parse events
  const events = parseIcal(raw);

  // 3. Filter to real bookings only
  const isBooking = platform === 'vrbo_ical' ? isVrboBooking : isAirbnbBooking;
  const bookings  = events.filter(isBooking);

  // 4. Upsert each booking
  for (const event of bookings) {
    try {
      const { checkIn, checkOut } = extractDates(event);

      if (!checkIn || !checkOut) {
        result.skipped++;
        continue;
      }

      if (new Date(checkOut) <= new Date(checkIn)) {
        result.skipped++;
        continue;
      }

      // Extract guest name from SUMMARY (Airbnb puts it there for confirmed bookings)
      // VRBO sometimes puts a booking ID. We store whatever's there.
      const summary   = event.summary || '';
      const guestName = extractGuestName(summary, platform);
      const notes     = event.description ? event.description.slice(0, 500) : null;

      // platform column stores display value ('airbnb'/'vrbo') for CSS compatibility
      // with BookingLog.jsx platform-tag classes.
      // source column stores the full identifier ('airbnb_ical'/'vrbo_ical') for filtering.
      const platformDisplay = platform === 'airbnb_ical' ? 'airbnb' : 'vrbo';

      // UPSERT: if uid already exists for this property, update dates.
      // This handles Airbnb updating an existing booking (date changes).
      const { rows } = await pool.query(
        `INSERT INTO bookings
           (property_id, platform, guest_name, check_in, check_out, notes, ical_uid, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (property_id, ical_uid)
         DO UPDATE SET
           check_in   = EXCLUDED.check_in,
           check_out  = EXCLUDED.check_out,
           guest_name = EXCLUDED.guest_name,
           notes      = EXCLUDED.notes,
           platform   = EXCLUDED.platform
         RETURNING (xmax = 0) AS inserted`,
        [propertyId, platformDisplay, guestName, checkIn, checkOut, notes, event.uid, platform]
      );

      if (rows[0]?.inserted) {
        result.imported++;
      } else {
        result.updated++;
      }
    } catch (err) {
      result.errors.push(`UID ${event.uid}: ${err.message}`);
    }
  }

  return result;
}

/**
 * Sync all iCal feeds for a single property.
 * Updates ical_last_sync and ical_sync_status on the property record.
 */
async function syncProperty(propertyId) {
  // Get iCal URLs
  const { rows } = await pool.query(
    'SELECT ical_airbnb_url, ical_vrbo_url FROM properties WHERE id = $1',
    [propertyId]
  );
  if (!rows.length) throw new Error('Property not found');

  const { ical_airbnb_url, ical_vrbo_url } = rows[0];
  const results  = {};
  let   hasError = false;

  if (ical_airbnb_url) {
    try {
      results.airbnb = await syncIcalFeed(propertyId, ical_airbnb_url, 'airbnb_ical');
    } catch (err) {
      results.airbnb = { error: err.message };
      hasError = true;
    }
  }

  if (ical_vrbo_url) {
    try {
      results.vrbo = await syncIcalFeed(propertyId, ical_vrbo_url, 'vrbo_ical');
    } catch (err) {
      results.vrbo = { error: err.message };
      hasError = true;
    }
  }

  // Update sync metadata
  await pool.query(
    `UPDATE properties
     SET ical_last_sync   = NOW(),
         ical_sync_status = $2
     WHERE id = $1`,
    [propertyId, hasError ? 'error' : 'ok']
  );

  return results;
}

/**
 * Sync ALL properties that have at least one iCal URL.
 * Called by the cron job every 6 hours.
 */
async function syncAllProperties() {
  const { rows } = await pool.query(
    `SELECT id FROM properties
     WHERE ical_airbnb_url IS NOT NULL
        OR ical_vrbo_url   IS NOT NULL`
  );

  const summary = { total: rows.length, success: 0, failed: 0 };

  for (const { id } of rows) {
    try {
      await syncProperty(id);
      summary.success++;
    } catch (err) {
      summary.failed++;
      console.error(`[iCal] Failed to sync property ${id}:`, err.message);
    }
  }

  console.log(`[iCal] Cron sync complete: ${summary.success}/${summary.total} properties synced`);
  return summary;
}

// ── Guest name extraction ────────────────────────────────────────────────────

function extractGuestName(summary, platform) {
  if (!summary) return null;

  // Airbnb: "Reserved" (confirmed but no name), or sometimes the actual name
  if (platform === 'airbnb_ical') {
    if (summary.toLowerCase() === 'reserved') return 'Airbnb Guest';
    // If it's a real name (not "Reserved"), return it
    return summary.length > 0 && summary.length < 100 ? summary : 'Airbnb Guest';
  }

  // VRBO: usually a booking reference or guest name
  if (platform === 'vrbo_ical') {
    return summary.length > 0 && summary.length < 100 ? summary : 'VRBO Guest';
  }

  return summary || null;
}

module.exports = { syncProperty, syncAllProperties, syncIcalFeed };
