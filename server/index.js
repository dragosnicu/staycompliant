require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const path       = require('path');

const authRouter       = require('./routes/auth');
const propertiesRouter = require('./routes/properties');
const permitsRouter    = require('./routes/permits');
const bookingsRouter   = require('./routes/bookings');
const documentsRouter  = require('./routes/documents');

require('./cron/reminders'); // start the daily cron job

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ─────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
}));
app.use(express.json());

// ── Routes ─────────────────────────────────────────────────
app.use('/api/auth',       authRouter);
app.use('/api/properties', propertiesRouter);
app.use('/api/permits',    permitsRouter);
app.use('/api/bookings',   bookingsRouter);
app.use('/api/documents',  documentsRouter);

// ── Health check ───────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
