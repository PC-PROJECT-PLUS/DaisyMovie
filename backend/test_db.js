const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function testConnection() {
  try {
    console.log('Tentativo di connessione al database PostgreSQL...');
    const result = await pool.query('SELECT version();');
    console.log('Connessione riuscita!');
    console.log('Versione Database:', result.rows[0].version);
  } catch (err) {
    console.error('Errore durante la connessione al database:', err);
  } finally {
    await pool.end();
  }
}

testConnection();
