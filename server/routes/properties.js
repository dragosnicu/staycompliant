const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const auth    = require('../middleware/auth');

// GET /api/properties
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*,
        COUNT(DISTINCT pm.id) AS permit_count,
        MIN(pm.expiry_date)   AS next_expiry
       FROM properties p
       LEFT JOIN permits pm ON pm.property_id = p.id AND pm.status = 'active'
       WHERE p.user_id = $1
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/properties/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM properties WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/properties
router.post('/', auth, async (req, res) => {
  try {
    const { name, address, city, state, platform, night_cap } = req.body;
    if (!name) return res.status(400).json({ error: 'Property name is required' });

    const { rows } = await pool.query(
      `INSERT INTO properties (user_id, name, address, city, state, platform, night_cap)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id, name, address, city, state, platform, night_cap || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/properties/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, address, city, state, platform, night_cap } = req.body;
    const { rows } = await pool.query(
      `UPDATE properties SET name=$1, address=$2, city=$3, state=$4, platform=$5, night_cap=$6
       WHERE id=$7 AND user_id=$8 RETURNING *`,
      [name, address, city, state, platform, night_cap || null, req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/properties/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM properties WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
