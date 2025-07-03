ALTER TABLE "payments" RENAME COLUMN "portone_transaction_id" TO "portone_store_id";--> statement-breakpoint
ALTER TABLE "subscriptions" RENAME COLUMN "portone_customer_key" TO "portone_customer_id";--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "portone_payment_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "portone_channel_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "portone_store_id" text;--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "toss_payment_key";--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "toss_order_id";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN "toss_customer_key";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN "toss_billing_key";