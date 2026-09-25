CREATE TABLE `promo_targets` (
	`id` text PRIMARY KEY NOT NULL,
	`promo_id` text NOT NULL,
	`product_id` text,
	`category_id` text,
	FOREIGN KEY (`promo_id`) REFERENCES `promos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_promo_target` ON `promo_targets` (`promo_id`);--> statement-breakpoint
CREATE TABLE `promos` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`nama` text NOT NULL,
	`tipe` text NOT NULL,
	`diskon_bp` integer NOT NULL,
	`mulai` text NOT NULL,
	`selesai` text,
	`aktif` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_promo_outlet` ON `promos` (`outlet_id`,`aktif`,`mulai`);--> statement-breakpoint
ALTER TABLE `customers` ADD `diskon_bp` integer DEFAULT 0 NOT NULL;