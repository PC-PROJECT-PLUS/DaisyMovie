const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authMiddleware');

router.use(authenticateToken);

// GET /api/preferences?profileId=...
router.get('/', async (req, res) => {
  const { profileId } = req.query;
  if (!profileId) return res.status(400).json({ error: 'profileId is required' });

  try {
    const result = await pool.query(
      'SELECT * FROM preferences WHERE profile_id = $1',
      [profileId]
    );
    if (result.rows.length === 0) {
      // Return default preferences instead of 404
      return res.json({
        profile_id: profileId,
        theme: 'dynamic',
        secondary_color: 'yellow',
        glass_blur: 15,
        glass_opacity: 15,
        popup_glass_blur: 25,
        popup_glass_opacity: 45,
        global_background_url: null,
        default_collection_id: null,
        collection_hero_modes: {},
        notify_bell: true,
        notify_favorites: true,
        notify_history: true,
        notify_recommendations: true,
        notify_upcoming: true,
        show_old_bell: true,
        show_old_favorites: true,
        show_old_history: true,
        show_old_recommendations: true,
        show_old_upcoming: true,
        autoplay_next: true,
        autoplay_film: true,
        autoplay_trailers: true,
        app_language: 'it',
        default_series_language: 'it',
        default_film_language: 'it',
        trailer_autoplay: true,
        trailer_mute: false,
        trailer_captions: false,
        trailer_caption_lang: 'it',
        trailer_controls: true
      });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching preferences', err);
    res.status(500).json({ error: 'Error fetching preferences' });
  }
});

// PUT /api/preferences?profileId=...
router.put('/', async (req, res) => {
  const { profileId } = req.query;
  if (!profileId) return res.status(400).json({ error: 'profileId is required' });

  const prefs = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO preferences (
        profile_id, theme, secondary_color, glass_blur, glass_opacity, 
        popup_glass_blur, popup_glass_opacity, global_background_url,
        default_collection_id, collection_hero_modes,
        notify_bell, notify_favorites, notify_history, notify_recommendations, notify_upcoming,
        show_old_bell, show_old_favorites, show_old_history, show_old_recommendations, show_old_upcoming,
        autoplay_next, autoplay_film, autoplay_trailers, app_language, default_series_language, default_film_language,
        trailer_autoplay, trailer_mute, trailer_captions, trailer_caption_lang, trailer_controls
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)
      ON CONFLICT (profile_id) DO UPDATE SET
        theme = EXCLUDED.theme,
        secondary_color = EXCLUDED.secondary_color,
        glass_blur = EXCLUDED.glass_blur,
        glass_opacity = EXCLUDED.glass_opacity,
        popup_glass_blur = EXCLUDED.popup_glass_blur,
        popup_glass_opacity = EXCLUDED.popup_glass_opacity,
        global_background_url = EXCLUDED.global_background_url,
        default_collection_id = EXCLUDED.default_collection_id,
        collection_hero_modes = EXCLUDED.collection_hero_modes,
        notify_bell = EXCLUDED.notify_bell,
        notify_favorites = EXCLUDED.notify_favorites,
        notify_history = EXCLUDED.notify_history,
        notify_recommendations = EXCLUDED.notify_recommendations,
        notify_upcoming = EXCLUDED.notify_upcoming,
        show_old_bell = EXCLUDED.show_old_bell,
        show_old_favorites = EXCLUDED.show_old_favorites,
        show_old_history = EXCLUDED.show_old_history,
        show_old_recommendations = EXCLUDED.show_old_recommendations,
        show_old_upcoming = EXCLUDED.show_old_upcoming,
        autoplay_next = EXCLUDED.autoplay_next,
        autoplay_film = EXCLUDED.autoplay_film,
        autoplay_trailers = EXCLUDED.autoplay_trailers,
        app_language = EXCLUDED.app_language,
        default_series_language = EXCLUDED.default_series_language,
        default_film_language = EXCLUDED.default_film_language,
        trailer_autoplay = EXCLUDED.trailer_autoplay,
        trailer_mute = EXCLUDED.trailer_mute,
        trailer_captions = EXCLUDED.trailer_captions,
        trailer_caption_lang = EXCLUDED.trailer_caption_lang,
        trailer_controls = EXCLUDED.trailer_controls,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        profileId,
        prefs.theme || 'dynamic',
        prefs.secondary_color || 'yellow',
        prefs.glass_blur !== undefined ? prefs.glass_blur : 15,
        prefs.glass_opacity !== undefined ? prefs.glass_opacity : 15,
        prefs.popup_glass_blur !== undefined ? prefs.popup_glass_blur : 25,
        prefs.popup_glass_opacity !== undefined ? prefs.popup_glass_opacity : 45,
        prefs.global_background_url || null,
        prefs.default_collection_id || null,
        prefs.collection_hero_modes || {},
        prefs.notify_bell !== undefined ? prefs.notify_bell : true,
        prefs.notify_favorites !== undefined ? prefs.notify_favorites : true,
        prefs.notify_history !== undefined ? prefs.notify_history : true,
        prefs.notify_recommendations !== undefined ? prefs.notify_recommendations : true,
        prefs.notify_upcoming !== undefined ? prefs.notify_upcoming : true,
        prefs.show_old_bell !== undefined ? prefs.show_old_bell : true,
        prefs.show_old_favorites !== undefined ? prefs.show_old_favorites : true,
        prefs.show_old_history !== undefined ? prefs.show_old_history : true,
        prefs.show_old_recommendations !== undefined ? prefs.show_old_recommendations : true,
        prefs.show_old_upcoming !== undefined ? prefs.show_old_upcoming : true,
        prefs.autoplay_next !== undefined ? prefs.autoplay_next : true,
        prefs.autoplay_film !== undefined ? prefs.autoplay_film : true,
        prefs.autoplay_trailers !== undefined ? prefs.autoplay_trailers : true,
        prefs.app_language || 'it',
        prefs.default_series_language || 'it',
        prefs.default_film_language || 'it',
        prefs.trailer_autoplay !== undefined ? prefs.trailer_autoplay : true,
        prefs.trailer_mute !== undefined ? prefs.trailer_mute : false,
        prefs.trailer_captions !== undefined ? prefs.trailer_captions : false,
        prefs.trailer_caption_lang || 'it',
        prefs.trailer_controls !== undefined ? prefs.trailer_controls : true
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating preferences', err);
    res.status(500).json({ error: 'Error updating preferences' });
  }
});

module.exports = router;
