ALTER TABLE "payments" RENAME COLUMN "imp_uid" TO "toss_payment_key";--> statement-breakpoint
ALTER TABLE "payments" RENAME COLUMN "merchant_uid" TO "toss_order_id";--> statement-breakpoint
ALTER TABLE "subscriptions" RENAME COLUMN "portone_customer_uid" TO "toss_customer_key";--> statement-breakpoint
ALTER TABLE "subscriptions" RENAME COLUMN "portone_billing_key" TO "toss_billing_key";