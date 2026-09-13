CREATE TABLE `seller_media` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seller_id` integer NOT NULL,
	`object_key` text NOT NULL,
	`media_type` text NOT NULL,
	`content_type` text NOT NULL,
	`file_name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `seller_media_object_key_unique` ON `seller_media` (`object_key`);--> statement-breakpoint
CREATE INDEX `idx_seller_media_seller_created` ON `seller_media` (`seller_id`,`created_at`);