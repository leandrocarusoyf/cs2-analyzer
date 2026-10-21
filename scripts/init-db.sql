-- Inicialização do Banco de Dados Local (PostgreSQL) - CS2 Analytics
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_date TIMESTAMPTZ NOT NULL,
    team1 VARCHAR(100) NOT NULL,
    team2 VARCHAR(100) NOT NULL,
    format VARCHAR(20) NOT NULL DEFAULT 'BO1',
    score_t1 INTEGER NOT NULL DEFAULT 0,
    score_t2 INTEGER NOT NULL DEFAULT 0,
    winner VARCHAR(100),
    replay_path TEXT,
    demo_hash VARCHAR(64) UNIQUE,
    event_name VARCHAR(100),
    bans JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS match_maps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    map_name VARCHAR(64) NOT NULL,
    rounds_t1 INTEGER NOT NULL DEFAULT 0,
    rounds_t2 INTEGER NOT NULL DEFAULT 0,
    duration INTEGER DEFAULT 0,
    pick_type VARCHAR(20) DEFAULT 'PICK',
    pick_team VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS player_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    map_id UUID REFERENCES match_maps(id) ON DELETE CASCADE,
    player_steamid VARCHAR(64) NOT NULL,
    nickname VARCHAR(100) NOT NULL,
    team VARCHAR(100) NOT NULL,
    rating NUMERIC(4,2),
    adr NUMERIC(6,2),
    kast NUMERIC(5,2),
    kills INTEGER DEFAULT 0,
    deaths INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    ttd NUMERIC(8,2),
    ttk NUMERIC(8,2),
    fsp NUMERIC(5,2),
    metrics_json JSONB
);

CREATE INDEX IF NOT EXISTS idx_matches_date ON matches (match_date DESC);
CREATE INDEX IF NOT EXISTS idx_match_maps_match_id ON match_maps (match_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_match_id ON player_stats (match_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_steamid ON player_stats (player_steamid);

ALTER TABLE match_maps ADD COLUMN IF NOT EXISTS map_key TEXT;
ALTER TABLE match_maps ADD COLUMN IF NOT EXISTS map_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE match_maps ADD COLUMN IF NOT EXISTS replay_path TEXT;
ALTER TABLE match_maps ADD COLUMN IF NOT EXISTS demo_path TEXT;
ALTER TABLE match_maps ADD COLUMN IF NOT EXISTS demo_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_map_identity ON match_maps(match_id, map_key);
