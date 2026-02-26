require('dotenv').config();
const express    = require('express');
const cors       = require('cors');

const authRouter       = require('./routes/auth');
const propertiesRouter = require('./routes/properties');
const permitsRouter    = require('./routes/permits');
const bookingsRouter   = require('./routes/bookings');
const documentsRouter  = require('./routes/documents');
const billingRouter    = require('./routes/billing');

require('./cron/reminders');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));

// Stripe webhook needs raw body — MUST be before express.json()
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

app.use('/api/auth',       authRouter);
app.use('/api/properties', propertiesRouter);
app.use('/api/permits',    permitsRouter);
app.use('/api/bookings',   bookingsRouter);
app.use('/api/documents',  documentsRouter);
app.use('/api/billing',    billingRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
