const express = require('express');
const router = express.Router();
const pool = require('../db');
const axios = require('axios');
const authenticateToken = require('../middleware/authMiddleware');
const { sendNotificationEmail } = require('../services/emailService');

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

// Aggiungi un preferito (e sincronizza con followed_media)
router.post('/', async (req, res) => {
  const { profileId, mediaId, mediaType, title, posterUrl, backdropUrl } = req.body;
  if (!profileId || !mediaId || !mediaType || !title) {
    return res.status(400).json({ error: 'Dati mancanti' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Inserisci in favorites
    const result = await client.query(
      `INSERT INTO favorites (profile_id, media_id, media_type, title, poster_url, backdrop_url) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       ON CONFLICT (profile_id, media_id, media_type) DO NOTHING RETURNING *`,
      [profileId, mediaId, mediaType, title, posterUrl, backdropUrl]
    );
    
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
        if (!releaseDate) releaseDate = null; // Gestisci stringhe vuote
      }
    } catch (tmdbErr) {
      console.error('Errore nel fetch TMDB per release_date:', tmdbErr.message);
    }

    // Inserisci in followed_media
    await client.query(
      `INSERT INTO followed_media (profile_id, media_id, media_type, title, poster_url, backdrop_url, release_date, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'favorite')
       ON CONFLICT (profile_id, media_id, media_type, source) DO NOTHING`,
      [profileId, mediaId, mediaType, title, posterUrl, backdropUrl, releaseDate]
    );

    // INVIA EMAIL IN TEMPO REALE
    try {
      const userRes = await client.query(`
        SELECT p.name as profile_name, u.email as user_email 
        FROM profiles p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = $1
      `, [profileId]);
      
      if (userRes.rows.length > 0 && result.rows.length > 0) {
        const { profile_name, user_email } = userRes.rows[0];
        
        // Crea anche una notifica istantanea in-app!
        await client.query(
          `INSERT INTO notifications (profile_id, media_id, title, message)
           VALUES ($1, $2, $3, $4)`,
          [profileId, mediaId, 'Preferito aggiunto!', `Hai appena salvato "${title}" tra i tuoi preferiti.`]
        );

        // Invia la mail
        await sendNotificationEmail(
          user_email, 
          profile_name, 
          'Nuovo Titolo nei Preferiti - Daisy Movie', 
          `Hai appena aggiunto "${title}" ai tuoi preferiti. Lo troverai nella tua area personale, pronto per essere guardato!`
        );
      }
    } catch (emailErr) {
      console.error('Errore invio email in tempo reale:', emailErr);
    }

    await client.query('COMMIT');

    if (result.rows.length > 0) {
      res.status(201).json(result.rows[0]);
    } else {
      res.status(409).json({ error: 'Già nei preferiti' });
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Errore aggiunta preferito:', error);
    res.status(500).json({ error: 'Errore server' });
  } finally {
    client.release();
  }
});

// Rimuovi un preferito (e rimuovi da followed_media per source='favorite')
router.delete('/:mediaId', async (req, res) => {
  const { mediaId } = req.params;
  const { profileId, mediaType } = req.query;

  if (!profileId || !mediaType) {
    return res.status(400).json({ error: 'Dati mancanti' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      'DELETE FROM favorites WHERE profile_id = $1 AND media_id = $2 AND media_type = $3',
      [profileId, mediaId, mediaType]
    );
    
    // Rimuovi anche da followed_media per source = favorite
    await client.query(
      `DELETE FROM followed_media 
       WHERE profile_id = $1 AND media_id = $2 AND media_type = $3 AND source = 'favorite'`,
      [profileId, mediaId, mediaType]
    );

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Errore rimozione preferito:', error);
    res.status(500).json({ error: 'Errore server' });
  } finally {
    client.release();
  }
});

module.exports = router;
