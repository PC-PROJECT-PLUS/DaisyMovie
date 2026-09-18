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

// --- COLLECTIONS API ---

// GET /api/favorites/collections?profileId=...
router.get('/collections', async (req, res) => {
  const { profileId } = req.query;
  if (!profileId) return res.status(400).json({ error: 'profileId is required' });

  try {
    const collRes = await pool.query(
      'SELECT id, name, created_at FROM favorite_collections WHERE profile_id = $1 ORDER BY created_at ASC',
      [profileId]
    );

    const collections = collRes.rows;
    for (let c of collections) {
      const itemsRes = await pool.query(
        'SELECT favorite_id FROM favorite_collection_items WHERE collection_id = $1',
        [c.id]
      );
      c.items = itemsRes.rows.map(r => r.favorite_id);
    }

    res.json(collections);
  } catch (error) {
    console.error('Errore fetch collections:', error);
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST /api/favorites/collections
router.post('/collections', async (req, res) => {
  const { profileId, name } = req.body;
  if (!profileId || !name) return res.status(400).json({ error: 'Dati mancanti' });

  try {
    const result = await pool.query(
      'INSERT INTO favorite_collections (profile_id, name) VALUES ($1, $2) RETURNING id, name, created_at',
      [profileId, name]
    );
    res.status(201).json({ ...result.rows[0], items: [] });
  } catch (error) {
    console.error('Errore creazione collezione:', error);
    res.status(500).json({ error: 'Errore server' });
  }
});

// PUT /api/favorites/collections/:id
router.put('/collections/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Dati mancanti' });

  try {
    const result = await pool.query(
      'UPDATE favorite_collections SET name = $1 WHERE id = $2 RETURNING id, name',
      [name, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Collezione non trovata' });
    }
    res.json({ success: true, collection: result.rows[0] });
  } catch (error) {
    console.error('Errore aggiornamento collezione:', error);
    res.status(500).json({ error: 'Errore server' });
  }
});

// DELETE /api/favorites/collections/:id
router.delete('/collections/:id', async (req, res) => {
  const { id } = req.params;
  const { profileId } = req.query;

  try {
    await pool.query('DELETE FROM favorite_collections WHERE id = $1 AND profile_id = $2', [id, profileId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Errore eliminazione collezione:', error);
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST /api/favorites/collections/:id/items
router.post('/collections/:id/items', async (req, res) => {
  const { id } = req.params;
  const { favoriteId } = req.body;
  if (!favoriteId) return res.status(400).json({ error: 'favoriteId is required' });

  try {
    await pool.query(
      'INSERT INTO favorite_collection_items (collection_id, favorite_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [id, favoriteId]
    );
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Errore aggiunta item a collezione:', error);
    res.status(500).json({ error: 'Errore server' });
  }
});

// DELETE /api/favorites/collections/:id/items/:favoriteId
router.delete('/collections/:id/items/:favoriteId', async (req, res) => {
  const { id, favoriteId } = req.params;

  try {
    await pool.query(
      'DELETE FROM favorite_collection_items WHERE collection_id = $1 AND favorite_id = $2',
      [id, favoriteId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Errore rimozione item da collezione:', error);
    res.status(500).json({ error: 'Errore server' });
  }
});

module.exports = router;
