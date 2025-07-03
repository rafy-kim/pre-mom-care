ALTER TABLE "payments" RENAME COLUMN "toss_payment_key" TO "imp_uid";--> statement-breakpoint
ALTER TABLE "payments" RENAME COLUMN "toss_order_id" TO "merchant_uid";--> statement-breakpoint
ALTER TABLE "subscriptions" RENAME COLUMN "toss_customer_key" TO "portone_customer_uid";--> statement-breakpoint
ALTER TABLE "subscriptions" RENAME COLUMN "toss_billing_key" TO "portone_billing_key";