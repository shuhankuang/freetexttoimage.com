ALTER TABLE `prompt_items` ADD `deleted_at` text;--> statement-breakpoint
CREATE INDEX `idx_prompt_items_public_page` ON `prompt_items` (`model_slug`,`deleted_at`,`published_at`,`id`);