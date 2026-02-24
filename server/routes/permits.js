const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const auth    = require('../middleware/auth');

async function ownsProperty(userId, propertyId) {
  const { rows } = await pool.query(
    'SELECT id FROM properties WHERE id=$1 AND user_id=$2',
    [propertyId, userId]
  );
  return rows.length > 0;
}

// GET /api/permits/dashboard  — all permits across all properties, sorted by urgency
router.get('/dashboard', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT pm.*, p.name AS property_name, p.city,
         (pm.expiry_date - CURRENT_DATE) AS days_until_expiry
       FROM permits pm
       JOIN properties p ON p.id = pm.property_id
       WHERE p.user_id = $1 AND pm.status = 'active'
       ORDER BY pm.expiry_date ASC NULLS LAST`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/permits/:propertyId
router.get('/:propertyId', auth, async (req, res) => {
  try {
    if (!(await ownsProperty(req.user.id, req.params.propertyId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { rows } = await pool.query(
      `SELECT *, (expiry_date - CURRENT_DATE) AS days_until_expiry
       FROM permits WHERE property_id=$1 ORDER BY expiry_date ASC NULLS LAST`,
      [req.params.propertyId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/permits/:propertyId
router.post('/:propertyId', auth, async (req, res) => {
  try {
    if (!(await ownsProperty(req.user.id, req.params.propertyId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { name, permit_number, issue_date, expiry_date, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Permit name is required' });

    const { rows } = await pool.query(
      `INSERT INTO permits (property_id, name, permit_number, issue_date, expiry_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.propertyId, name, permit_number, issue_date || null, expiry_date || null, notes]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/permits/:propertyId/:permitId
router.put('/:propertyId/:permitId', auth, async (req, res) => {
  try {
    if (!(await ownsProperty(req.user.id, req.params.propertyId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { name, permit_number, issue_date, expiry_date, status, notes } = req.body;
    const { rows } = await pool.query(
      `UPDATE permits SET name=$1, permit_number=$2, issue_date=$3,
        expiry_date=$4, status=$5, notes=$6
       WHERE id=$7 AND property_id=$8 RETURNING *`,
      [name, permit_number, issue_date || null, expiry_date || null, status, notes,
       req.params.permitId, req.params.propertyId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/permits/:propertyId/:permitId
router.delete('/:propertyId/:permitId', auth, async (req, res) => {
  try {
    if (!(await ownsProperty(req.user.id, req.params.propertyId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await pool.query('DELETE FROM permits WHERE id=$1 AND property_id=$2',
      [req.params.permitId, req.params.propertyId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
