ALTER TABLE "users" DROP CONSTRAINT "users_email_unique";--> statement-breakpoint
ALTER TABLE "game_results" ADD COLUMN "target_code" varchar(3);--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "email";