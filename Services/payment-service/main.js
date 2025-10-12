const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Sequelize, DataTypes, Op } = require('sequelize');
const db = require('./models');
const { register, collectHttpMetrics } = require('./src/metrics');

const app = express();
const PORT = process.env.PORT || 3007;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

app.use(cors());
app.use(express.json());
app.use(collectHttpMetrics);

// Attach sequelize models
const { sequelize, Transaction } = { sequelize: db.sequelize, Transaction: db.Transaction };

// JWT middleware and admin check
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token required' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (error) {
        res.status(500).end(error);
    }
});

// Create a transaction (user)
app.post('/transactions', authenticateToken, async (req, res) => {
  try {
    const { booking_id, amount, payment_method, proof_path } = req.body || {};
    if (!booking_id || !amount) {
      return res.status(400).json({ message: 'booking_id and amount are required' });
    }
    const tx = await Transaction.create({
      booking_id,
      amount,
      payment_method: payment_method || 'qr',
      payment_date: new Date(),
      status: 'success',
      proof_path: proof_path || null,
    });
    return res.status(201).json({ message: 'Transaction recorded', transaction: tx });
  } catch (err) {
    console.error('Create transaction error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Admin: get revenue summary (total and by month for last 12 months)
app.get('/admin/revenue/summary', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    // Total revenue from successful transactions
    const total = await Transaction.sum('amount', {
      where: { status: 'success' }
    });

    // Monthly revenue for last 12 months
    const tx = await Transaction.findAll({
      attributes: [
        [sequelize.fn('YEAR', sequelize.col('payment_date')), 'year'],
        [sequelize.fn('MONTH', sequelize.col('payment_date')), 'month'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'sum']
      ],
      where: {
        status: 'success',
        payment_date: { [Op.gte]: startOfYear }
      },
      group: ['year', 'month'],
      order: [[sequelize.literal('year'), 'ASC'], [sequelize.literal('month'), 'ASC']]
    });

    const map = new Map();
    tx.forEach(r => {
      const year = Number(r.get('year'));
      const month = Number(r.get('month')) - 1;
      const sum = Number(r.get('sum')) || 0;
      map.set(`${year}-${month}`, sum);
    });

    const labels = [];
    const series = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      labels.push(d.toLocaleString('th-TH', { month: 'short' }));
      series.push(map.get(key) || 0);
    }

    res.json({ totalRevenue: Number(total || 0), monthly: { labels, series } });
  } catch (err) {
    console.error('Revenue summary error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Utility: wait function
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Start server with DB retry
async function start() {
  const maxAttempts = Number(process.env.DB_MAX_ATTEMPTS || 20);
  const delayMs = Number(process.env.DB_RETRY_DELAY_MS || 1500);
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt++;
    try {
      console.log(`Connecting to DB (attempt ${attempt}/${maxAttempts})...`);
      await sequelize.authenticate();
      console.log('Payment DB connected.');
      await sequelize.sync();
      console.log('Payment DB synced.');
      app.listen(PORT, '0.0.0.0', () => console.log(`Payment service on http://0.0.0.0:${PORT}`));
      return;
    } catch (e) {
      console.error(`DB connect/sync failed (attempt ${attempt}):`, e?.message || e);
      if (attempt >= maxAttempts) {
        console.error('Exceeded max DB connection attempts. Exiting.');
        process.exit(1);
      }
      await sleep(delayMs);
    }
  }
}

start();
