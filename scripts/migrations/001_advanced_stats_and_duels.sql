-- Migração: Métricas Analíticas Avançadas (player_advanced_stats) e Micro-Duelos (match_duels)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
