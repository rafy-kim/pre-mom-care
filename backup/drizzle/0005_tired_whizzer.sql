ALTER TABLE "payments" ALTER COLUMN "toss_payment_key" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "toss_order_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "portone_payment_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "portone_transaction_id" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "portone_customer_key" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "portone_billing_key" text;