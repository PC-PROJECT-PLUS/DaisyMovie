const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function run() {
  try {
    await pool.query(`
      ALTER TABLE preferences 
      ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(20) DEFAULT 'yellow',
      ADD COLUMN IF NOT EXISTS glass_blur INTEGER DEFAULT 15,
      ADD COLUMN IF NOT EXISTS glass_opacity INTEGER DEFAULT 15,
      ADD COLUMN IF NOT EXISTS popup_glass_blur INTEGER DEFAULT 25,
      ADD COLUMN IF NOT EXISTS popup_glass_opacity INTEGER DEFAULT 45,
      ADD COLUMN IF NOT EXISTS global_background_url VARCHAR(255),
      ADD COLUMN IF NOT EXISTS default_collection_id INTEGER,
      ADD COLUMN IF NOT EXISTS collection_hero_modes JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS notify_bell BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS notify_favorites BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS notify_history BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS notify_recommendations BOOLEAN DEFAULT TRUE;
    `);
    console.log("Tabella preferences aggiornata con successo.");
  } catch(e) {
    console.error("Errore alter table:", e);
  } finally {
    await pool.end();
  }
}

run();
