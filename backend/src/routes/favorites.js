const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authMiddleware');

router.use(authenticateToken);

// GET /api/favorites?profileId=...
router.get('/', async (req, res) => {
  const { profileId } = req.query;
  if (!profileId) return res.status(400).json({ error: 'profileId is required' });

  try {
    const result = await pool.query(
      'SELECT id, media_id, media_type, title, poster_url, backdrop_url, added_at FROM favorites WHERE profile_id = $1 ORDER BY added_at DESC',
      [profileId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Errore nel recupero dei preferiti' });
  }
});

// POST /api/favorites
router.post('/', async (req, res) => {
  const { profileId, mediaId, mediaType, title, posterUrl, backdropUrl } = req.body;
  if (!profileId || !mediaId || !mediaType || !title) {
    return res.status(400).json({ error: 'Dati mancanti per aggiungere ai preferiti' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO favorites (profile_id, media_id, media_type, title, poster_url, backdrop_url) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       ON CONFLICT (profile_id, media_id, media_type) DO NOTHING
       RETURNING id, media_id, media_type, title, poster_url, backdrop_url, added_at`,
      [profileId, mediaId, mediaType, title, posterUrl, backdropUrl]
    );
    
    // If it was already there (ON CONFLICT DO NOTHING), return success anyway
    if (result.rows.length === 0) {
      return res.json({ success: true, message: 'Già nei preferiti' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ error: 'Errore nell\'aggiunta ai preferiti' });
  }
});

// DELETE /api/favorites/:mediaId?profileId=...&mediaType=...
router.delete('/:mediaId', async (req, res) => {
  const { mediaId } = req.params;
  const { profileId, mediaType } = req.query;
  
  if (!profileId || !mediaType) return res.status(400).json({ error: 'profileId e mediaType sono obbligatori' });

  try {
    await pool.query(
      'DELETE FROM favorites WHERE profile_id = $1 AND media_id = $2 AND media_type = $3',
      [profileId, mediaId, mediaType]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ error: 'Errore nella rimozione dai preferiti' });
  }
});

module.exports = router;
