CREATE TABLE "game_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
	"user_id" uuid NOT NULL,
	"level" varchar(10) NOT NULL,
	"guesses" integer NOT NULL,
	"time_seconds" integer NOT NULL,
	"score" integer NOT NULL,
	"won" boolean NOT NULL,
	"week_number" integer NOT NULL,
	"year" integer NOT NULL,
	"created_at" timestamp DEFAULT now () NOT NULL
);

--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
	"display_name" varchar(50) NOT NULL,
	"easy_game_count" integer DEFAULT 0 NOT NULL,
	"medium_game_count" integer DEFAULT 0 NOT NULL,
	"hard_game_count" integer DEFAULT 0 NOT NULL,
	"extreme_game_count" integer DEFAULT 0 NOT NULL,
	"easy_high_score" integer DEFAULT 0 NOT NULL,
	"medium_high_score" integer DEFAULT 0 NOT NULL,
	"hard_high_score" integer DEFAULT 0 NOT NULL,
	"extreme_high_score" integer DEFAULT 0 NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"last_played_at" timestamp,
	"created_at" timestamp DEFAULT now () NOT NULL
);

--> statement-breakpoint
ALTER TABLE "game_results" ADD CONSTRAINT "game_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE no action ON UPDATE no action;