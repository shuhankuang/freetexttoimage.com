CREATE TABLE `credit_accounts` (
	`user_id` text PRIMARY KEY NOT NULL,
	`monthly_balance` integer DEFAULT 0 NOT NULL,
	`permanent_balance` integer DEFAULT 0 NOT NULL,
	`monthly_reset_at` text
);
--> statement-breakpoint
CREATE TABLE `credit_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`delta` integer NOT NULL,
	`bucket` text NOT NULL,
	`reason` text NOT NULL,
	`ref_type` text,
	`ref_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_credit_ledger_user` ON `credit_ledger` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_credit_ledger_ref` ON `credit_ledger` (`ref_type`,`ref_id`);