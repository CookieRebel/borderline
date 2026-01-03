ALTER TABLE "users" ADD COLUMN "supabase_user_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_registered" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_supabase_user_id_unique" UNIQUE("supabase_user_id");