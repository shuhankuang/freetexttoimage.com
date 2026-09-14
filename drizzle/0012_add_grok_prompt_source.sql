INSERT OR IGNORE INTO `prompt_sync_sources` (
  `id`, `name`, `preset`, `query`, `enabled`, `min_faves`, `lookback_hours`, `max_records`, `created_at`, `updated_at`
) VALUES (
  'grok_imagine',
  'Grok Imagine',
  'grok_imagine',
  '("prompt" OR "prompt:") ("Grok Imagine" OR "Grok Image") filter:images -nsfw -porn -xxx -onlyfans -hentai',
  true,
  5,
  1,
  100,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);
--> statement-breakpoint
UPDATE `prompt_sync_sources`
SET
  `name` = 'Grok Imagine',
  `preset` = 'grok_imagine',
  `query` = '("prompt" OR "prompt:") ("Grok Imagine" OR "Grok Image") filter:images -nsfw -porn -xxx -onlyfans -hentai',
  `enabled` = true,
  `lookback_hours` = 1,
  `max_records` = 100,
  `updated_at` = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE `id` = 'grok_imagine';
