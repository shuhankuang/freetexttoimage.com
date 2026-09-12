CREATE TABLE `prompt_import_files` (
	`file_hash` text PRIMARY KEY NOT NULL,
	`file_path` text NOT NULL,
	`status` text NOT NULL,
	`item_count` integer DEFAULT 0 NOT NULL,
	`error` text,
	`started_at` text NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE TABLE `prompt_items` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`model_slug` text NOT NULL,
	`model_label` text NOT NULL,
	`prompt` text NOT NULL,
	`prompt_type` text DEFAULT 'text' NOT NULL,
	`title` text,
	`author_name` text NOT NULL,
	`author_handle` text NOT NULL,
	`source_url` text NOT NULL,
	`view_count` integer,
	`published_at` integer NOT NULL,
	`images_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_prompt_items_model_page` ON `prompt_items` (`model_slug`,`published_at`,`id`);