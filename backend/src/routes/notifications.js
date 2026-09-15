const express = require('express');
const router = express.Router();
const pool = require('../db');

// Recupera tutte le notifiche di un profilo
router.get('/', async (req, res) => {
  try {
    const profileId = req.query.profileId;
    if (!profileId) {
      return res.status(400).json({ error: 'profileId richiesto' });
    }

    const result = await pool.query(
      `SELECT * FROM notifications 
       WHERE profile_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [profileId]
    );

    // Mappa le notifiche per il frontend
    const notifications = result.rows.map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      time: 'Poco fa', // Mock o converti created_at
      unread: !n.is_read,
      icon: 'alert', // Puoi aggiungere un campo icon nel DB in futuro se serve
      targetUrl: n.media_id ? `/movie/${n.media_id}` : '/'
    }));

    res.json(notifications);
  } catch (error) {
    console.error('Errore nel recupero notifiche:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Crea una notifica di prova
router.post('/test', async (req, res) => {
  try {
    const { profileId, title, message, mediaId } = req.body;
    if (!profileId) {
      return res.status(400).json({ error: 'profileId richiesto' });
    }

    const result = await pool.query(
      `INSERT INTO notifications (profile_id, title, message, media_id, is_read) 
       VALUES ($1, $2, $3, $4, FALSE) RETURNING *`,
      [profileId, title || 'Nuova Notifica', message || 'Questa è una notifica di prova salvata nel DB!', mediaId || null]
    );

    res.json({ success: true, notification: result.rows[0] });
  } catch (error) {
    console.error('Errore creazione notifica:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Segna come letta
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1',
      [id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Errore aggiornamento notifica:', error);
    res.status(500).json({ error: 'Errore interno' });
  }
});

// Segna tutte come lette per un profilo
router.put('/read-all', async (req, res) => {
  try {
    const { profileId } = req.body;
    if (!profileId) {
      return res.status(400).json({ error: 'profileId richiesto' });
    }

    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE profile_id = $1 AND is_read = FALSE',
      [profileId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Errore read-all notifiche:', error);
    res.status(500).json({ error: 'Errore interno' });
  }
});

module.exports = router;
