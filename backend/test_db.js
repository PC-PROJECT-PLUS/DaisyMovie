const pool = require('./src/db');
require('dotenv').config();

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
