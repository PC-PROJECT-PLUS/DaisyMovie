const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const moviesRouter = require('./src/routes/movies');
const authRouter = require('./src/routes/auth');
const profilesRouter = require('./src/routes/profiles');
const favoritesRouter = require('./src/routes/favorites');

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/movies', moviesRouter);
app.use('/api/auth', authRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/favorites', favoritesRouter);

// Configurazione Database PostgreSQL
const pool = require('./src/db');
// Endpoint di test per verificare che il server funzioni
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Il server backend di DaisyMovie è in esecuzione!' });
});

// Endpoint di test per verificare la connessione al database
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as currentTime');
    res.json({ 
      status: 'success', 
      message: 'Connessione al database riuscita!', 
      time: result.rows[0].currenttime 
    });
  } catch (err) {
    console.error('Errore di connessione al database:', err);
    res.status(500).json({ status: 'error', message: 'Errore di connessione al database', error: err.message });
  }
});

// Avvio del server
app.listen(port, () => {
  console.log(`Server in ascolto sulla porta ${port}`);
});

module.exports = { app, pool };
