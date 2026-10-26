-- Banco existente (PowerShell, na raiz do projeto):
-- Get-Content -Raw scripts/migrations/002_he_damage.sql | docker exec -i cs2-postgres psql -v ON_ERROR_STOP=1 -U cs2admin -d cs2_analytics
ALTER TABLE player_advanced_stats ADD COLUMN IF NOT EXISTS he_damage NUMERIC(5,2) DEFAULT 0;
