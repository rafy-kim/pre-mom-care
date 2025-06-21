CREATE TABLE "user_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"nickname" text NOT NULL,
	"due_date" timestamp NOT NULL,
	"gender" text NOT NULL,
	"relation" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
