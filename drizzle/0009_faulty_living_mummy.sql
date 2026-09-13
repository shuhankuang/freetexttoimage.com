ALTER TABLE `signup_bonus_claims` ADD `ip_hash` text;--> statement-breakpoint
CREATE INDEX `idx_signup_bonus_claims_ip_time` ON `signup_bonus_claims` (`ip_hash`,`created_at`);