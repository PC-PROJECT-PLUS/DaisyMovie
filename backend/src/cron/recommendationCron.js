const cron = require('node-cron');
const pool = require('../db');
const axios = require('axios');
const { sendRecommendationEmail } = require('../services/emailService');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

async function fetchTrendingMedia() {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/trending/all/day?api_key=${TMDB_API_KEY}&language=it-IT`);
    if (response.data && response.data.results.length > 0) {
      // Scegli un titolo casuale tra i primi 10 in tendenza
      const randomIndex = Math.floor(Math.random() * Math.min(10, response.data.results.length));
      return response.data.results[randomIndex];
    }
  } catch (error) {
    console.error('Errore recupero trending:', error.message);
  }
  return null;
}

async function fetchRecommendationForMedia(mediaId, mediaType) {
  try {
    const type = mediaType === 'tv' ? 'tv' : 'movie';
    const response = await axios.get(`${TMDB_BASE_URL}/${type}/${mediaId}/recommendations?api_key=${TMDB_API_KEY}&language=it-IT`);
    if (response.data && response.data.results.length > 0) {
      return response.data.results[0]; // Prendi la raccomandazione principale
    }
  } catch (error) {
    console.error(`Errore recupero raccomandazioni per ${type} ${mediaId}:`, error.message);
  }
  return null;
}

async function runRecommendationProcess() {
  console.log('[CRON] Inizio processo di raccomandazioni (Newsletter)');
  const client = await pool.connect();
  try {
    // 1. Recupera tutti i profili attivi con la loro email
    const usersRes = await client.query(`
      SELECT p.id as profile_id, p.name as profile_name, u.email as user_email
      FROM profiles p
      JOIN users u ON p.user_id = u.id
    `);

    for (const profile of usersRes.rows) {
      const { profile_id, profile_name, user_email } = profile;
      let mediaToRecommend = null;

      // 2. Trova l'ultimo preferito di questo profilo
      const favRes = await client.query(`
        SELECT media_id, media_type, title
        FROM followed_media
        WHERE profile_id = $1 AND source = 'favorite'
        ORDER BY created_at DESC
        LIMIT 1
      `, [profile_id]);

      if (favRes.rows.length > 0) {
        const lastFav = favRes.rows[0];
        console.log(`[CRON] Il profilo ${profile_name} ha guardato di recente: ${lastFav.title}. Cerco raccomandazioni...`);
        mediaToRecommend = await fetchRecommendationForMedia(lastFav.media_id, lastFav.media_type);
      }

      // Se non ci sono preferiti o non ci sono raccomandazioni, prendi un trending generico
      if (!mediaToRecommend) {
        console.log(`[CRON] Nessun preferito o raccomandazione per ${profile_name}. Recupero un titolo in tendenza...`);
        mediaToRecommend = await fetchTrendingMedia();
      }

      if (mediaToRecommend) {
        // Estrai dati
        const title = mediaToRecommend.title || mediaToRecommend.name;
        const overview = mediaToRecommend.overview || 'Scopri questo fantastico titolo su Daisy Movie!';
        const posterPath = mediaToRecommend.poster_path;
        const mediaId = mediaToRecommend.id;

        console.log(`[CRON] Consiglio "${title}" a ${profile_name} (${user_email})`);

        const recommendedMediaType = mediaToRecommend.name && !mediaToRecommend.title ? 'tv' : 'movie';

        // 3. Salva la notifica nel DB
        const messageStr = `Abbiamo pensato a qualcosa che potrebbe piacerti: ${title}. ${overview.substring(0, 100)}...`;
        await client.query(
          `INSERT INTO notifications (profile_id, media_id, media_type, title, message)
           VALUES ($1, $2, $3, $4, $5)`,
          [profile_id, mediaId, recommendedMediaType, 'Consigliato per te!', messageStr]
        );

        // 4. Invia l'email
        await sendRecommendationEmail(user_email, profile_name, title, overview, posterPath);
      }
    }

    console.log('[CRON] Processo di raccomandazioni completato con successo!');
  } catch (error) {
    console.error('[CRON] Errore nel processo di raccomandazioni:', error);
  } finally {
    client.release();
  }
}

function initRecommendationCron() {
  // Eseguiamo 3 volte a settimana: Lunedì, Mercoledì e Venerdì alle 18:00
  cron.schedule('0 18 * * 1,3,5', () => {
    runRecommendationProcess();
  });
  console.log('Cron Job Raccomandazioni configurato (Lun, Mer, Ven alle 18:00)');
}

module.exports = {
  initRecommendationCron,
  runRecommendationProcess // Esportato per poterlo forzare manualmente durante i test
};
