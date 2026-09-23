const pool = require('./src/db');

async function createEpisodeProgressTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS episode_progress (
        id SERIAL PRIMARY KEY,
        profile_id UUID NOT NULL,
        media_id INT NOT NULL,
        season INT NOT NULL,
        episode INT NOT NULL,
        progress INT DEFAULT 0,
        total_seconds INT DEFAULT 0,
        accent_color VARCHAR(50),
        last_watched TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (profile_id, media_id, season, episode)
      );
    `);
    console.log('Successfully created episode_progress table');
  } catch (err) {
    console.error('Error creating table:', err);
  } finally {
    await pool.end();
  }
}

createEpisodeProgressTable();
