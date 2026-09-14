UPDATE `prompt_sync_sources`
SET `enabled` = false
WHERE `id` IN ('flux', 'seedream', 'qwen');
