CREATE TABLE `service_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`transaction_id` text NOT NULL,
	`order_no` text NOT NULL,
	`status` text DEFAULT 'masuk' NOT NULL,
	`janji_selesai` text,
	`selesai_pada` integer,
	`diambil_pada` integer,
	`tanda_barang` text,
	`note` text,
	`occurred_at` integer NOT NULL,
	`business_date` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_orders_outlet_status` ON `service_orders` (`outlet_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_orders_outlet_date` ON `service_orders` (`outlet_id`,`business_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_orders_outlet_no` ON `service_orders` (`outlet_id`,`order_no`);--> statement-breakpoint
CREATE TABLE `services` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`category_id` text,
	`name` text NOT NULL,
	`emoji` text,
	`price` integer NOT NULL,
	`cost` integer DEFAULT 0 NOT NULL,
	`unit` text DEFAULT 'pcs' NOT NULL,
	`harga_bisa_diubah` integer DEFAULT 0 NOT NULL,
	`estimasi_jam` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_services_outlet_active` ON `services` (`outlet_id`,`is_active`);--> statement-breakpoint
ALTER TABLE `outlets` ADD `jenis_usaha` text;--> statement-breakpoint
ALTER TABLE `transaction_items` ADD `service_id` text REFERENCES services(id);--> statement-breakpoint
ALTER TABLE `transaction_items` ADD `qty_milli` integer;--> statement-breakpoint
ALTER TABLE `transaction_items` ADD `unit` text;--> statement-breakpoint
ALTER TABLE `transaction_items` ADD `petugas_staff_id` text REFERENCES staff(id);--> statement-breakpoint
CREATE INDEX `idx_items_petugas` ON `transaction_items` (`petugas_staff_id`);--> statement-breakpoint
-- Outlet yang sudah ada berarti sudah dipakai berjualan barang. Membiarkannya
-- NULL akan melempar pemilik lama ke layar onboarding tanpa sebab.
UPDATE `outlets` SET `jenis_usaha` = 'dagang' WHERE `jenis_usaha` IS NULL;
