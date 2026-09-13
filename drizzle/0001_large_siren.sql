ALTER TABLE `seller_profiles` ADD `availability_days` text DEFAULT 'Mon,Tue,Wed,Thu,Fri,Sat' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_seller_profiles_city_specialty` ON `seller_profiles` (`city`,`specialty`);--> statement-breakpoint
CREATE INDEX `idx_booking_requests_customer_created` ON `booking_requests` (`customer_user_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_booking_requests_active_slot` ON `booking_requests` (`seller_id`,`appointment_date`,`appointment_time`) WHERE `status` IN ('pending','confirmed');
