-- Tabella per tracciare i media seguiti dagli utenti (preferiti o campanellina)
CREATE TABLE IF NOT EXISTS followed_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    media_id INTEGER NOT NULL,
    media_type VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    poster_url VARCHAR(255),
    backdrop_url VARCHAR(255),
    release_date DATE,
    source VARCHAR(20) NOT NULL, -- 'favorite' o 'bell'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(profile_id, media_id, media_type, source)
);
