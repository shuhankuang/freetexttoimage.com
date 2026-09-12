CREATE TABLE `prompt_import_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`content_hash` text NOT NULL,
	`file_name` text NOT NULL,
	`object_key` text NOT NULL,
	`source_date` integer NOT NULL,
	`series_name` text NOT NULL,
	`sequence` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'preview' NOT NULL,
	`allow_updates` integer DEFAULT false NOT NULL,
	`total_count` integer DEFAULT 0 NOT NULL,
	`new_count` integer DEFAULT 0 NOT NULL,
	`duplicate_count` integer DEFAULT 0 NOT NULL,
	`changed_count` integer DEFAULT 0 NOT NULL,
	`processed_count` integer DEFAULT 0 NOT NULL,
	`inserted_count` integer DEFAULT 0 NOT NULL,
	`updated_count` integer DEFAULT 0 NOT NULL,
	`skipped_count` integer DEFAULT 0 NOT NULL,
	`failed_count` integer DEFAULT 0 NOT NULL,
	`changes_json` text DEFAULT '[]' NOT NULL,
	`errors_json` text DEFAULT '[]' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`confirmed_at` text,
	`started_at` text,
	`heartbeat_at` text,
	`completed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_prompt_import_jobs_content_hash` ON `prompt_import_jobs` (`content_hash`);--> statement-breakpoint
CREATE INDEX `idx_prompt_import_jobs_queue` ON `prompt_import_jobs` (`status`,`source_date`,`series_name`,`sequence`,`file_name`);--> statement-breakpoint
CREATE TABLE `prompt_import_worker_locks` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `prompt_items` ADD `source_fingerprint` text;