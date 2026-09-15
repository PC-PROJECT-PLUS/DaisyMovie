const cron = require('node-cron');
const pool = require('../db');
const { sendNotificationEmail } = require('../services/emailService');

// Questo Cron job controlla ogni giorno alle 00:00 se ci sono media in uscita
const startNotificationCron = () => {
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Esecuzione job giornaliero per il controllo delle date di uscita...');
    await processDailyReleases();
  });
  
  console.log('[CRON] Servizio notifiche giornaliere avviato.');
};

// Funzione estratta per permettere il test manuale (es. chiamandola in un endpoint /api/debug/cron)
const processDailyReleases = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Trova tutti i media seguiti la cui data di uscita è OGGI, unendo i dati dell'utente per l'email
    // NOTA: Usiamo CURRENT_DATE. In un test manuale possiamo cambiare la release_date nel db.
    const result = await client.query(`
      SELECT fm.profile_id, fm.media_id, fm.media_type, fm.title, p.name as profile_name, u.email as user_email 
      FROM followed_media fm
      JOIN profiles p ON fm.profile_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE fm.release_date = CURRENT_DATE
    `);

    const releases = result.rows;

    if (releases.length === 0) {
      console.log('[CRON] Nessun film o serie in uscita oggi tra quelli seguiti.');
      await client.query('ROLLBACK');
      return;
    }

    console.log(`[CRON] Trovati ${releases.length} media in uscita oggi.`);

    for (const release of releases) {
      const { profile_id, media_id, title, profile_name, user_email } = release;
      const messageText = `Il titolo "${title}" che stavi aspettando è ora disponibile! Vai subito su Daisy Movie per guardarlo.`;

      // 1. Crea la notifica nel DB per l'app
      await client.query(
        `INSERT INTO notifications (profile_id, media_id, title, message)
         VALUES ($1, $2, $3, $4)`,
        [profile_id, media_id, 'Novità in Catalogo!', messageText]
      );

      // 2. Invia Email Reale (se l'utente ha il digest email abilitato, ma per ora lo mandiamo a tutti)
      // Se BREVO_API_KEY non è configurata, verrà solo simulata in console (come scritto in emailService.js)
      await sendNotificationEmail(user_email, profile_name, `Daisy Movie - ${title} è ora disponibile!`, messageText);
    }
    
    // Potremmo anche eliminare la riga da followed_media se non serve più tracciarlo,
    // o aggiornare uno stato "notified=true". Per ora lo lasciamo lì o lo eliminiamo.
    // await client.query('DELETE FROM followed_media WHERE release_date = CURRENT_DATE AND source = $1', ['bell']);

    await client.query('COMMIT');
    console.log('[CRON] Job giornaliero completato con successo.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[CRON] Errore durante il processing delle uscite:', error);
  } finally {
    client.release();
  }
};

module.exports = {
  startNotificationCron,
  processDailyReleases
};
