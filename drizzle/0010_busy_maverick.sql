CREATE TABLE `prompt_sync_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`updated_by` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `prompt_sync_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`preset` text NOT NULL,
	`query` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`min_faves` integer DEFAULT 5 NOT NULL,
	`lookback_hours` integer DEFAULT 48 NOT NULL,
	`max_records` integer DEFAULT 500 NOT NULL,
	`last_run_at` text,
	`last_status` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
