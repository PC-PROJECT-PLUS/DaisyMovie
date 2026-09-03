-- Abilitare l'estensione pgcrypto per generare UUID automaticamente (se non è già attiva)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabella users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    apple_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabella profiles
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(255),
    pin_code VARCHAR(4),
    pin_required BOOLEAN DEFAULT FALSE,
    maturity_rating VARCHAR(20) DEFAULT 'Tutti',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabella preferences
CREATE TABLE IF NOT EXISTS preferences (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'dynamic',
    history_hero_movie_id INTEGER,
    favorites_hero_movie_id INTEGER,
    video_quality VARCHAR(20) DEFAULT 'Auto',
    autoplay_next BOOLEAN DEFAULT TRUE,
    autoplay_trailers BOOLEAN DEFAULT TRUE,
    skip_intro BOOLEAN DEFAULT FALSE,
    app_language VARCHAR(10) DEFAULT 'it',
    audio_language VARCHAR(10) DEFAULT 'it',
    subtitle_language VARCHAR(10) DEFAULT 'it',
    always_show_subs BOOLEAN DEFAULT FALSE,
    sub_size VARCHAR(20) DEFAULT 'medium',
    sub_style VARCHAR(50) DEFAULT 'classic',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabella favorites
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    media_id INTEGER NOT NULL,
    media_type VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    poster_url VARCHAR(255),
    backdrop_url VARCHAR(255),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(profile_id, media_id, media_type)
);

-- 5. Tabella history
CREATE TABLE IF NOT EXISTS history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    media_id INTEGER NOT NULL,
    media_type VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    poster_url VARCHAR(255),
    progress INTEGER DEFAULT 0,
    last_watched TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(profile_id, media_id, media_type)
);

-- 6. Tabella notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    media_id INTEGER,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabella reviews
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    media_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 10),
    likes_count INTEGER DEFAULT 0,
    dislikes_count INTEGER DEFAULT 0,
    has_spoilers BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
