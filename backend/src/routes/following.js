const express = require('express');
const router = express.Router();
const pool = require('../db');
const axios = require('axios');
const authenticateToken = require('../middleware/authMiddleware');

router.use(authenticateToken);

// Aggiungi un media ai "seguiti" (campanellina)
router.post('/', async (req, res) => {
  const { profileId, mediaId, mediaType, title, posterUrl, backdropUrl } = req.body;
  
  if (!profileId || !mediaId || !mediaType || !title) {
    return res.status(400).json({ error: 'Dati mancanti' });
  }

  try {
    // Recupera la release_date da TMDB
    let releaseDate = null;
    try {
      const tmdbApiKey = process.env.TMDB_API_KEY;
      if (tmdbApiKey) {
        const tmdbUrl = mediaType === 'movie' 
          ? `https://api.themoviedb.org/3/movie/${mediaId}?api_key=${tmdbApiKey}`
          : `https://api.themoviedb.org/3/tv/${mediaId}?api_key=${tmdbApiKey}`;
        const tmdbRes = await axios.get(tmdbUrl);
        releaseDate = mediaType === 'movie' ? tmdbRes.data.release_date : tmdbRes.data.first_air_date;
        if (!releaseDate) releaseDate = null;
      }
    } catch (tmdbErr) {
      console.error('Errore nel fetch TMDB per release_date:', tmdbErr.message);
    }

    const result = await pool.query(
      `INSERT INTO followed_media (profile_id, media_id, media_type, title, poster_url, backdrop_url, release_date, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'bell')
       ON CONFLICT (profile_id, media_id, media_type, source) DO NOTHING RETURNING *`,
      [profileId, mediaId, mediaType, title, posterUrl, backdropUrl, releaseDate]
    );

    if (result.rows.length > 0) {
      res.status(201).json(result.rows[0]);
    } else {
      res.status(409).json({ error: 'Già seguito' });
    }
  } catch (error) {
    console.error('Errore aggiunta followed media:', error);
    res.status(500).json({ error: 'Errore server' });
  }
});

// Rimuovi un media dai "seguiti"
router.delete('/:mediaId', async (req, res) => {
  const { mediaId } = req.params;
  const { profileId, mediaType } = req.query;

  if (!profileId || !mediaType) {
    return res.status(400).json({ error: 'Dati mancanti' });
  }

  try {
    await pool.query(
      `DELETE FROM followed_media 
       WHERE profile_id = $1 AND media_id = $2 AND media_type = $3 AND source = 'bell'`,
      [profileId, mediaId, mediaType]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Errore rimozione followed media:', error);
    res.status(500).json({ error: 'Errore server' });
  }
});

module.exports = router;
