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
      'SELECT id, media_id, media_type, title, poster_url, backdrop_url, progress as progress_seconds, season, episode, last_watched as watched_at, total_seconds, accent_color FROM history WHERE profile_id = $1 ORDER BY last_watched DESC',
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
const { profileId, mediaId, mediaType, title, posterUrl, backdropUrl, progressSeconds, season, episode, totalSeconds, accentColor } = req.body;
  
  if (!profileId || !mediaId || !mediaType || !title) {
    return res.status(400).json({ error: 'Dati mancanti per aggiungere alla cronologia' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO history (profile_id, media_id, media_type, title, poster_url, backdrop_url, progress, season, episode, last_watched, total_seconds, accent_color) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $10, $11) 
       ON CONFLICT (profile_id, media_id, media_type) 
       DO UPDATE SET 
         last_watched = CURRENT_TIMESTAMP, 
         progress = EXCLUDED.progress,
         poster_url = EXCLUDED.poster_url,
         backdrop_url = EXCLUDED.backdrop_url,
         season = EXCLUDED.season,
         episode = EXCLUDED.episode,
         total_seconds = EXCLUDED.total_seconds,
         accent_color = EXCLUDED.accent_color
       RETURNING id, media_id, media_type, title, poster_url, backdrop_url, progress as progress_seconds, season, episode, last_watched as watched_at, total_seconds, accent_color`,
      [profileId, mediaId, mediaType, title, posterUrl || '', backdropUrl || '', progressSeconds || 0, season || null, episode || null, totalSeconds || 0, accentColor || '']
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding to history:', error);
    res.status(500).json({ error: 'Errore nell\'aggiunta alla cronologia' });
  }
});

// DELETE /api/history/:mediaId?profileId=...&mediaType=...
router.delete('/:mediaId', async (req, res) => {
  const { mediaId } = req.params;
  const { profileId, mediaType } = req.query;

  if (!profileId || !mediaType) {
    return res.status(400).json({ error: 'profileId e mediaType sono richiesti' });
  }

  try {
    await pool.query(
      'DELETE FROM history WHERE profile_id = $1 AND media_id = $2 AND media_type = $3',
      [profileId, mediaId, mediaType]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting from history:', error);
    res.status(500).json({ error: 'Errore nella rimozione dalla cronologia' });
  }
});

module.exports = router;
