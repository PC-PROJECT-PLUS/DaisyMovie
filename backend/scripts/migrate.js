require('dotenv').config({ path: '../.env' });
const pool = require('../src/db');

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS favorite_collections (
          id SERIAL PRIMARY KEY,
          profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS favorite_collection_items (
          collection_id INTEGER REFERENCES favorite_collections(id) ON DELETE CASCADE,
          favorite_id UUID REFERENCES favorites(id) ON DELETE CASCADE,
          added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (collection_id, favorite_id)
      );
    `);
    console.log('Tables created');
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

migrate();
