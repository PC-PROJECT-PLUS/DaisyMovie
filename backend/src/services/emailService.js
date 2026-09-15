const { BrevoClient } = require('@getbrevo/brevo');
const dotenv = require('dotenv');

dotenv.config();

const getBaseEmailTemplate = (contentHTML) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body {
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        background-color: #0c0c0c;
        margin: 0;
        padding: 40px 0;
        color: #ffffff;
      }
      .email-wrapper {
        max-width: 600px;
        margin: 0 auto;
        background-color: #141414;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      }
      .email-header {
        background: linear-gradient(135deg, #facc15, #eab308);
        padding: 30px 20px;
        text-align: center;
      }
      .email-header h1 {
        margin: 0;
        color: #141414; /* Testo scuro su sfondo giallo per leggibilità */
        font-size: 28px;
        font-weight: 800;
        letter-spacing: 1px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
      }
      .email-body {
        padding: 40px 30px;
      }
      .greeting {
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 20px;
        color: #ffffff;
      }
      .message {
        font-size: 16px;
        line-height: 1.6;
        color: #d1d1d1;
        margin-bottom: 30px;
      }
      .cta-button {
        display: block;
        width: fit-content;
        margin: 0 auto;
        background-color: #facc15;
        color: #141414;
        text-decoration: none;
        padding: 15px 35px;
        border-radius: 30px;
        font-weight: bold;
        font-size: 16px;
        text-align: center;
        box-shadow: 0 4px 15px rgba(250, 204, 21, 0.3);
      }
      .email-footer {
        padding: 20px;
        text-align: center;
        background-color: #0c0c0c;
        font-size: 12px;
        color: #777777;
      }
    </style>
  </head>
  <body>
    <div class="email-wrapper">
      <div class="email-header">
        <h1>
          <img src="http://localhost:4200/assets/Logo_cropped.png" alt="Daisy Movie Logo" width="36" height="36" style="border-radius: 8px; margin-right: 12px;">
          Daisy Movie
        </h1>
      </div>
      <div class="email-body">
        ${contentHTML}
      </div>
      <div class="email-footer">
        <p>Ricevi questa email perché sei iscritto alle notifiche di Daisy Movie.</p>
        <p>&copy; ${new Date().getFullYear()} Daisy Movie. Tutti i diritti riservati.</p>
      </div>
    </div>
  </body>
</html>
`;

const sendNotificationEmail = async (userEmail, userName, title, message) => {
  if (!process.env.BREVO_API_KEY) {
    console.log(`\n[EMAIL SIMULATA - Manca BREVO_API_KEY] A: ${userEmail}\nOggetto: ${title}\nMessaggio: ${message}\n`);
    return true;
  }

  const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "noreply@daisymovie.com";

  try {
    const data = await client.transactionalEmails.sendTransacEmail({
      subject: title,
      sender: { name: "Daisy Movie", email: senderEmail },
      to: [{ email: userEmail, name: userName }],
      htmlContent: getBaseEmailTemplate(`
        <div class="greeting">Ciao ${userName},</div>
        <div class="message">${message}</div>
        <a href="http://localhost:4200" class="cta-button">Apri Daisy Movie</a>
      `)
    });
    console.log('API Brevo chiamata con successo. Email inviata.');
    return true;
  } catch (error) {
    console.error('Errore durante l\'invio dell\'email via Brevo:');
    if (error.response && error.response.text) {
      console.error(error.response.text);
    } else {
      console.error(error);
    }
    return false;
  }
};

const sendVerificationCodeEmail = async (userEmail, code) => {
  if (!process.env.BREVO_API_KEY) {
    console.log(`\n[EMAIL SIMULATA - VERIFICA] A: ${userEmail}\nCodice: ${code}\n`);
    return true;
  }

  const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "noreply@daisymovie.com";

  try {
    const data = await client.transactionalEmails.sendTransacEmail({
      subject: "Il tuo codice di verifica Daisy Movie",
      sender: { name: "Daisy Movie", email: senderEmail },
      to: [{ email: userEmail, name: "Utente Daisy Movie" }],
      htmlContent: getBaseEmailTemplate(`
        <div class="greeting">Benvenuto su Daisy Movie!</div>
        <div class="message">Il tuo codice di verifica è: <strong style="font-size: 24px; color: #facc15;">${code}</strong></div>
        <div class="message">Inserisci questo codice nell'app per completare la registrazione in modo sicuro.</div>
      `)
    });
    console.log('API Brevo chiamata con successo. Email verifica inviata.');
    return true;
  } catch (error) {
    console.error('Errore durante l\'invio dell\'email di verifica via Brevo:');
    if (error.response && error.response.text) {
      console.error(error.response.text);
    } else {
      console.error(error);
    }
    return false;
  }
};

module.exports = {
  sendNotificationEmail,
  sendVerificationCodeEmail
};
