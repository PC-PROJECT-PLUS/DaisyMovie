const pool = require('./src/db');

async function alterTable() {
  try {
    await pool.query('ALTER TABLE profiles ALTER COLUMN avatar_url TYPE TEXT;');
    console.log('Successfully altered avatar_url to TEXT');
  } catch (err) {
    console.error('Error altering table:', err);
  } finally {
    await pool.end();
  }
}

alterTable();
