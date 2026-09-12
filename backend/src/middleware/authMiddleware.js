const jwt = require('jsonwebtoken');
const pool = require('../db');
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) return res.status(401).json({ error: 'Token mancante' });

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) return res.status(403).json({ error: 'Token non valido o scaduto' });
    
    // Controlla che l'utente esista ancora nel database
    try {
      const result = await pool.query('SELECT id FROM users WHERE id = $1', [user.userId]);
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Utente non trovato o eliminato' });
      }
      req.user = user;
      next();
    } catch (dbErr) {
      console.error('Auth middleware DB error:', dbErr);
      return res.status(500).json({ error: 'Errore interno del server' });
    }
  });
}

module.exports = authenticateToken;
