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

CREATE TABLE IF NOT EXISTS player_advanced_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    steamid VARCHAR(64) NOT NULL,
    hltv_rating NUMERIC(5,2),
    adr NUMERIC(6,2),
    kast NUMERIC(5,2),
    impact NUMERIC(5,2),
    hs_percent NUMERIC(5,2),
    hit_head_pct NUMERIC(5,2),
    hit_chest_pct NUMERIC(5,2),
    hit_stomach_pct NUMERIC(5,2),
    hit_limbs_pct NUMERIC(5,2),
    reaction_time_ms NUMERIC(8,2),
    headlock_offset NUMERIC(6,2),
    first_5_bullets_pct NUMERIC(5,2),
    prefire_pct NUMERIC(5,2),
    score_opening NUMERIC(5,2),
    score_trade NUMERIC(5,2),
    score_utility NUMERIC(5,2),
    score_flash NUMERIC(5,2),
    score_clutch NUMERIC(5,2),
    CONSTRAINT uq_player_advanced_stats_match_steam UNIQUE (match_id, steamid)
);

ALTER TABLE player_advanced_stats ADD COLUMN IF NOT EXISTS he_damage NUMERIC(5,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS match_duels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    round_time VARCHAR(32),
    winner_steamid VARCHAR(64) NOT NULL,
    loser_steamid VARCHAR(64) NOT NULL,
    winner_weapon VARCHAR(64),
    loser_weapon VARCHAR(64),
    winner_hp_remaining INTEGER,
    map_zone VARCHAR(64),
    is_opening BOOLEAN NOT NULL DEFAULT FALSE,
    is_trade BOOLEAN NOT NULL DEFAULT FALSE,
    is_clutch BOOLEAN NOT NULL DEFAULT FALSE,
    duel_tag VARCHAR(128)
);

CREATE INDEX IF NOT EXISTS idx_player_advanced_stats_match_steam ON player_advanced_stats (match_id, steamid);
CREATE INDEX IF NOT EXISTS idx_match_duels_match_winner ON match_duels (match_id, winner_steamid);
CREATE INDEX IF NOT EXISTS idx_match_duels_match_round ON match_duels (match_id, round_number);

