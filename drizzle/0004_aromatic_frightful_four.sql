-- Alter the existing documents table to add the new columns
ALTER TABLE "documents" ADD COLUMN "ref_type" text;
ALTER TABLE "documents" ADD COLUMN "title" text;

-- Update existing rows to set the ref_type for books and copy the reference to the title
UPDATE "documents" SET "ref_type" = 'book', "title" = "reference" WHERE "ref_type" IS NULL;

-- Now, add the NOT NULL constraints to the new columns
ALTER TABLE "documents" ALTER COLUMN "ref_type" SET NOT NULL;
ALTER TABLE "documents" ALTER COLUMN "title" SET NOT NULL;
