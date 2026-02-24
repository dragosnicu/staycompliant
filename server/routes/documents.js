// server/routes/documents.js
const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const pool    = require('../db');
const auth    = require('../middleware/auth');

// ── Multer storage config ───────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Store under uploads/{userId}/{propertyId}/
    const dir = path.join(__dirname, '..', 'uploads', String(req.user.id), String(req.params.propertyId));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Timestamp prefix to avoid collisions
    const ext  = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and image files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ── Helper ──────────────────────────────────────────────────
async function ownsProperty(userId, propertyId) {
  const { rows } = await pool.query(
    'SELECT id FROM properties WHERE id = $1 AND user_id = $2',
    [propertyId, userId]
  );
  return rows.length > 0;
}

// ── GET /api/documents/:propertyId ─────────────────────────
// List all docs for a property
router.get('/:propertyId', auth, async (req, res) => {
  try {
    const { propertyId } = req.params;

    if (!(await ownsProperty(req.user.id, propertyId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { rows } = await pool.query(
      `SELECT
         d.id, d.name, d.original_name, d.file_size, d.mime_type,
         d.uploaded_at, d.permit_id,
         p.name AS permit_name
       FROM documents d
       LEFT JOIN permits p ON p.id = d.permit_id
       WHERE d.property_id = $1
       ORDER BY d.uploaded_at DESC`,
      [propertyId]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/documents/:propertyId ────────────────────────
// Upload a document
router.post('/:propertyId', auth, upload.single('file'), async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { name, permit_id } = req.body;

    if (!(await ownsProperty(req.user.id, propertyId))) {
      // Clean up uploaded file if auth fails
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Relative path stored in DB (don't store absolute paths)
    const relativePath = path.join(
      String(req.user.id),
      String(propertyId),
      req.file.filename
    );

    const { rows } = await pool.query(
      `INSERT INTO documents
         (property_id, permit_id, name, original_name, file_path, file_size, mime_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        propertyId,
        permit_id || null,
        name || req.file.originalname,
        req.file.originalname,
        relativePath,
        req.file.size,
        req.file.mimetype,
      ]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ── GET /api/documents/:propertyId/:docId/download ─────────
// Download / preview a document
router.get('/:propertyId/:docId/download', auth, async (req, res) => {
  try {
    const { propertyId, docId } = req.params;

    if (!(await ownsProperty(req.user.id, propertyId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { rows } = await pool.query(
      'SELECT * FROM documents WHERE id = $1 AND property_id = $2',
      [docId, propertyId]
    );

    if (!rows.length) return res.status(404).json({ error: 'Document not found' });

    const doc      = rows[0];
    const fullPath = path.join(__dirname, '..', 'uploads', doc.file_path);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.setHeader('Content-Type', doc.mime_type);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${doc.original_name}"`
    );
    res.sendFile(fullPath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE /api/documents/:propertyId/:docId ───────────────
router.delete('/:propertyId/:docId', auth, async (req, res) => {
  try {
    const { propertyId, docId } = req.params;

    if (!(await ownsProperty(req.user.id, propertyId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { rows } = await pool.query(
      'DELETE FROM documents WHERE id = $1 AND property_id = $2 RETURNING file_path',
      [docId, propertyId]
    );

    if (!rows.length) return res.status(404).json({ error: 'Document not found' });

    // Delete from disk
    const fullPath = path.join(__dirname, '..', 'uploads', rows[0].file_path);
    try { fs.unlinkSync(fullPath); } catch (_) {}

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
