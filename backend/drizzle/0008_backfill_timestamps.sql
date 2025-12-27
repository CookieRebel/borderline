-- Backfill started_at and ended_at with created_at for existing rows
UPDATE "game_results"
SET
    "started_at" = "created_at",
    "ended_at" = "created_at";