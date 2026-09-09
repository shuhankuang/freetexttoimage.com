ALTER TABLE `subscriptions` ADD `billing_interval` text DEFAULT 'month' NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `billing_anchor_at` text;