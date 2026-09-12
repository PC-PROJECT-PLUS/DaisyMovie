const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authMiddleware');

// Proteggi tutte le rotte di profiles
router.use(authenticateToken);

// GET /api/profiles - Ottieni tutti i profili dell'utente
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, avatar_url as avatar, (maturity_rating = \'Kids\') as "isKids" FROM profiles WHERE user_id = $1 ORDER BY created_at ASC', 
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ error: 'Errore durante il caricamento dei profili' });
  }
});

// POST /api/profiles - Crea un nuovo profilo
router.post('/', async (req, res) => {
  const { name, avatar, isKids } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Il nome del profilo è obbligatorio' });
  }

  try {
    // Controlla quanti profili ha l'utente
    const countResult = await pool.query('SELECT COUNT(*) FROM profiles WHERE user_id = $1', [req.user.userId]);
    const profileCount = parseInt(countResult.rows[0].count, 10);

    if (profileCount >= 5) {
      return res.status(403).json({ error: 'Hai raggiunto il limite massimo di 5 profili' });
    }

    const defaultAvatar = avatar || `assets/avatar/avatar${Math.floor(Math.random() * 5) + 1}.jpg`;
    const maturityRating = isKids ? 'Kids' : 'Adults';

    const result = await pool.query(
      'INSERT INTO profiles (user_id, name, avatar_url, maturity_rating) VALUES ($1, $2, $3, $4) RETURNING id, name, avatar_url as avatar, (maturity_rating = \'Kids\') as "isKids"',
      [req.user.userId, name, defaultAvatar, maturityRating]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(500).json({ error: 'Errore durante la creazione del profilo' });
  }
});

module.exports = router;
