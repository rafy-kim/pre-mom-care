ALTER TABLE "documents" ALTER COLUMN "title" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "membership_tier" text DEFAULT 'basic' NOT NULL;