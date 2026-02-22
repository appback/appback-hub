const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const pool = require('./db');
const rateLimiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const v1Routes = require('./routes/v1');

const app = express();
const PORT = process.env.PORT || 3100;

app.use(cors());
app.use(express.json());
app.use(rateLimiter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/v1', v1Routes);
app.use(errorHandler);

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (rows.length > 0) return;

  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)',
    [email, hash, 'admin']
  );
  console.log(`Admin user seeded: ${email}`);
}

async function start() {
  // Wait for DB
  for (let i = 0; i < 30; i++) {
    try {
      await pool.query('SELECT 1');
      break;
    } catch {
      console.log('Waiting for database...');
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  await seedAdmin();

  app.listen(PORT, () => {
    console.log(`Appback Hub API running on port ${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
