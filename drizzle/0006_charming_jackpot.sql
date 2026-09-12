DELETE FROM `prompt_items`
WHERE `rowid` NOT IN (
	SELECT MIN(`rowid`) FROM `prompt_items` GROUP BY `source_id`
);
--> statement-breakpoint
UPDATE `prompt_items` SET `id` = `source_id` WHERE `id` <> `source_id`;
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_prompt_items_source_id` ON `prompt_items` (`source_id`);
