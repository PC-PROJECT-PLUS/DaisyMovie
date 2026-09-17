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
const historyRouter = require('./src/routes/history');
const notificationsRouter = require('./src/routes/notifications');
const followingRouter = require('./src/routes/following');

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/movies', moviesRouter);
app.use('/api/auth', authRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/history', historyRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/following', followingRouter);

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

// Inizializza il Cron Job
const { startNotificationCron, processDailyReleases } = require('./src/cron/notificationCron');
const { initRecommendationCron, runRecommendationProcess } = require('./src/cron/recommendationCron');
startNotificationCron();
initRecommendationCron();

// Rotta per forzare manualmente l'invio delle raccomandazioni (TESTING)
app.post('/api/test/recommend', async (req, res) => {
  try {
    // Eseguiamo il processo in background senza bloccare la richiesta HTTP
    runRecommendationProcess();
    res.json({ message: 'Processo di raccomandazione avviato in background!' });
  } catch (err) {
    res.status(500).json({ error: 'Errore avvio processo' });
  }
});

// Rotta per forzare manualmente il controllo delle uscite giornaliere (TESTING)
app.post('/api/test/daily-releases', async (req, res) => {
  try {
    processDailyReleases();
    res.json({ message: 'Controllo uscite giornaliere avviato in background!' });
  } catch (err) {
    res.status(500).json({ error: 'Errore avvio controllo' });
  }
});

// Avvio del server
app.listen(port, () => {
  console.log(`Server in ascolto sulla porta ${port}`);
});

module.exports = { app, pool };
