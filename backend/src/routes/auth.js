const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { OAuth2Client } = require('google-auth-library');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'postmessage'
);

// ---------------------------------------------------------
// Helper: Invio Email con Brevo
// ---------------------------------------------------------
async function sendVerificationEmail(email, code) {
  if (!BREVO_API_KEY) {
    console.warn('BREVO_API_KEY non impostata. Codice generato:', code);
    return;
  }
  
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': BREVO_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: { email: process.env.BREVO_SENDER_EMAIL || 'noreply@daisymovie.com', name: 'DaisyMovie' },
      to: [{ email: email }],
      subject: 'Il tuo codice di verifica DaisyMovie',
      htmlContent: `<html><body>
        <h2>Benvenuto su DaisyMovie!</h2>
        <p>Il tuo codice di verifica è: <strong style="font-size: 24px;">${code}</strong></p>
        <p>Inserisci questo codice nell'app per completare la registrazione.</p>
      </body></html>`
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    console.error('Brevo API Error:', errorData);
  }
  
  console.log('\n=============================================');
  console.log(`[DEV MODE] Codice di verifica inviato (o bloccato da Brevo).`);
  console.log(`[DEV MODE] Usa questo codice per verificare ${email}: ${code}`);
  console.log('=============================================\n');
}

// ---------------------------------------------------------
// 1. Registrazione con Email
// ---------------------------------------------------------
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e password sono obbligatori' });
  }

  try {
    // Controlla se l'utente esiste
    const userCheck = await pool.query('SELECT id, is_verified FROM users WHERE email = $1', [email]);
    
    let user = null;
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    if (userCheck.rows.length > 0) {
      user = userCheck.rows[0];
      if (user.is_verified) {
        return res.status(400).json({ error: 'Utente già registrato e verificato' });
      }
      // Se esiste ma non è verificato, aggiorna la password e il codice
      await pool.query(
        'UPDATE users SET password_hash = $1, verification_code = $2 WHERE id = $3',
        [passwordHash, verificationCode, user.id]
      );
    } else {
      // Crea nuovo utente
      const result = await pool.query(
        'INSERT INTO users (email, password_hash, verification_code) VALUES ($1, $2, $3) RETURNING id',
        [email, passwordHash, verificationCode]
      );
      user = result.rows[0];
    }

    // Invia email
    await sendVerificationEmail(email, verificationCode);

    res.json({ success: true, message: 'Codice di verifica inviato via email' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// ---------------------------------------------------------
// 2. Verifica del Codice
// ---------------------------------------------------------
router.post('/verify', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email e codice sono obbligatori' });
  }

  try {
    const result = await pool.query('SELECT id, verification_code FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    const user = result.rows[0];
    if (user.verification_code !== code) {
      return res.status(400).json({ error: 'Codice di verifica errato' });
    }

    // Marca come verificato
    await pool.query('UPDATE users SET is_verified = TRUE, verification_code = NULL WHERE id = $1', [user.id]);

    // Controlla se ha già un profilo
    const profileCheck = await pool.query('SELECT id FROM profiles WHERE user_id = $1', [user.id]);
    if (profileCheck.rows.length === 0) {
      const randomAvatarNum = Math.floor(Math.random() * 5) + 1;
      await pool.query(
        'INSERT INTO profiles (user_id, name, avatar_url) VALUES ($1, $2, $3)',
        [user.id, 'Profilo 1', `assets/avatar/avatar${randomAvatarNum}.jpg`]
      );
    }

    // Genera JWT
    const token = jwt.sign({ userId: user.id, email }, JWT_SECRET, { expiresIn: '30d' });

    res.json({ success: true, token, message: 'Account verificato con successo' });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// ---------------------------------------------------------
// 3. Login Classico
// ---------------------------------------------------------
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e password sono obbligatori' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email o password errati' });
    }

    const user = result.rows[0];
    
    if (!user.is_verified) {
      return res.status(401).json({ error: 'Account non verificato. Effettua la registrazione.' });
    }

    if (!user.password_hash) {
      return res.status(401).json({ error: 'Questo account è registrato tramite Google/Apple.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Email o password errati' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    res.json({ success: true, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// ---------------------------------------------------------
// 4. Google Login
// ---------------------------------------------------------
router.post('/google', async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Authorization code mancante' });
  }

  try {
    // Scambia il codice per ottenere i token
    const { tokens } = await googleClient.getToken(code);
    
    // Verifica l'idToken ottenuto
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload.email;
    const googleId = payload.sub;
    const name = payload.given_name || 'Profilo 1';

    let user = null;
    const checkEmail = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (checkEmail.rows.length > 0) {
      user = checkEmail.rows[0];
      // Se logga con google e non aveva il google_id, aggiorniamolo
      if (!user.google_id) {
        await pool.query('UPDATE users SET google_id = $1, is_verified = TRUE WHERE id = $2', [googleId, user.id]);
      }
    } else {
      // Registra nuovo utente
      const result = await pool.query(
        'INSERT INTO users (email, google_id, is_verified) VALUES ($1, $2, TRUE) RETURNING *',
        [email, googleId]
      );
      user = result.rows[0];
    }

    // Controlla se ha profili
    const profileCheck = await pool.query('SELECT id FROM profiles WHERE user_id = $1', [user.id]);
    if (profileCheck.rows.length === 0) {
      const randomAvatarNum = Math.floor(Math.random() * 5) + 1;
      await pool.query(
        'INSERT INTO profiles (user_id, name, avatar_url) VALUES ($1, $2, $3)',
        [user.id, name, `assets/avatar/avatar${randomAvatarNum}.jpg`]
      );
    }

    // Genera JWT
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    res.json({ success: true, token });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ error: 'Errore durante il login con Google' });
  }
});

module.exports = router;
