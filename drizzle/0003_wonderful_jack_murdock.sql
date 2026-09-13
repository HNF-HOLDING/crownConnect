CREATE TABLE `account_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`primary_role` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_profiles_user_id_unique` ON `account_profiles` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_account_profiles_role` ON `account_profiles` (`primary_role`);