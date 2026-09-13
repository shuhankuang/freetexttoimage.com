CREATE TABLE `signup_bonus_claims` (
	`email_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`amount` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `signup_bonus_claims_user_id_unique` ON `signup_bonus_claims` (`user_id`);