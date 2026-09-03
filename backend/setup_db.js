const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function setupDatabase() {
  try {
    console.log('Connessione al database...');
    
    const schemaPath = path.join(__dirname, 'update_schema.sql');
    if (!fs.existsSync(schemaPath)) {
        console.error('File update_schema.sql non trovato.');
        process.exit(1);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    if (schemaSql.trim().length === 0) {
        console.log('Nessuna tabella da creare (il file update_schema.sql è vuoto).');
    } else {
        console.log('Creazione delle tabelle...');
        await pool.query(schemaSql);
        console.log('Tabelle create con successo!');
    }
  } catch (err) {
    console.error('Errore durante la configurazione del database:', err);
  } finally {
    await pool.end();
    console.log('Connessione chiusa.');
  }
}

setupDatabase();
