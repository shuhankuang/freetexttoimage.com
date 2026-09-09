CREATE TABLE `stripe_customers` (
	`user_id` text PRIMARY KEY NOT NULL,
	`stripe_customer_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_stripe_customers_customer` ON `stripe_customers` (`stripe_customer_id`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`user_id` text PRIMARY KEY NOT NULL,
	`stripe_subscription_id` text NOT NULL,
	`plan` text NOT NULL,
	`status` text NOT NULL,
	`current_period_end` text,
	`cancel_at_period_end` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
