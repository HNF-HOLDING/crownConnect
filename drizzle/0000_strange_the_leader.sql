CREATE TABLE `booking_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seller_id` integer NOT NULL,
	`customer_user_id` text NOT NULL,
	`customer_email` text NOT NULL,
	`customer_name` text NOT NULL,
	`customer_phone` text NOT NULL,
	`service_name` text NOT NULL,
	`appointment_date` text NOT NULL,
	`appointment_time` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_booking_requests_seller_date` ON `booking_requests` (`seller_id`,`appointment_date`);--> statement-breakpoint
CREATE TABLE `seller_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`business_name` text NOT NULL,
	`city` text NOT NULL,
	`phone` text NOT NULL,
	`specialty` text NOT NULL,
	`featured_service` text NOT NULL,
	`service_price` integer NOT NULL,
	`bio` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `seller_profiles_user_id_unique` ON `seller_profiles` (`user_id`);