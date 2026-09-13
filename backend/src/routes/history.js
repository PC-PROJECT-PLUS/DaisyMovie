const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authMiddleware');

router.use(authenticateToken);

// GET /api/history?profileId=...
router.get('/', async (req, res) => {
  const { profileId } = req.query;
  if (!profileId) return res.status(400).json({ error: 'profileId is required' });

  try {
    const result = await pool.query(
      'SELECT id, media_id, media_type, title, poster_url, backdrop_url, progress as progress_seconds, last_watched as watched_at FROM history WHERE profile_id = $1 ORDER BY last_watched DESC',
      [profileId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Errore nel recupero della cronologia' });
  }
});

// POST /api/history
router.post('/', async (req, res) => {
  const { profileId, mediaId, mediaType, title, posterUrl, backdropUrl, progressSeconds } = req.body;
  
  if (!profileId || !mediaId || !mediaType || !title) {
    return res.status(400).json({ error: 'Dati mancanti per aggiungere alla cronologia' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO history (profile_id, media_id, media_type, title, poster_url, backdrop_url, progress, last_watched) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP) 
       ON CONFLICT (profile_id, media_id, media_type) 
       DO UPDATE SET 
         last_watched = CURRENT_TIMESTAMP, 
         progress = GREATEST(history.progress, EXCLUDED.progress),
         poster_url = EXCLUDED.poster_url,
         backdrop_url = EXCLUDED.backdrop_url
       RETURNING id, media_id, media_type, title, poster_url, backdrop_url, progress as progress_seconds, last_watched as watched_at`,
      [profileId, mediaId, mediaType, title, posterUrl || '', backdropUrl || '', progressSeconds || 0]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding to history:', error);
    res.status(500).json({ error: 'Errore nell\'aggiunta alla cronologia' });
  }
});

module.exports = router;
