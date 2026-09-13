CREATE TABLE `seller_services` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seller_id` integer NOT NULL,
	`name` text NOT NULL,
	`price` integer NOT NULL,
	`duration_minutes` integer NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_seller_services_seller_created` ON `seller_services` (`seller_id`,`created_at`);