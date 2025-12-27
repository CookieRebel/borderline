ALTER TABLE "game_results" ALTER COLUMN "guesses" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "game_results" ALTER COLUMN "time_seconds" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "game_results" ALTER COLUMN "score" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "game_results" ALTER COLUMN "won" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "game_results" ADD COLUMN "started_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "game_results" ADD COLUMN "ended_at" timestamp;