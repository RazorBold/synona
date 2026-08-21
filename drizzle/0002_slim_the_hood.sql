CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`category` text DEFAULT 'lainnya' NOT NULL,
	`name` text NOT NULL,
	`amount` integer NOT NULL,
	`method` text DEFAULT 'cash' NOT NULL,
	`berulang` integer DEFAULT 0 NOT NULL,
	`occurred_at` integer NOT NULL,
	`business_date` text NOT NULL,
	`note` text,
	`recorded_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_expenses_outlet_date` ON `expenses` (`outlet_id`,`business_date`);--> statement-breakpoint
CREATE INDEX `idx_expenses_outlet_category` ON `expenses` (`outlet_id`,`category`);--> statement-breakpoint
CREATE TABLE `material_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`material_id` text NOT NULL,
	`type` text NOT NULL,
	`qty_change` integer NOT NULL,
	`stock_after` integer NOT NULL,
	`cost_per_unit_milli` integer DEFAULT 0 NOT NULL,
	`ref_id` text,
	`note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_mat_mov_material` ON `material_movements` (`material_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `materials` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`name` text NOT NULL,
	`unit` text DEFAULT 'g' NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`cost_per_unit_milli` integer DEFAULT 0 NOT NULL,
	`low_stock_threshold` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_materials_outlet_active` ON `materials` (`outlet_id`,`is_active`);--> statement-breakpoint
CREATE TABLE `payable_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`purchase_id` text NOT NULL,
	`amount` integer NOT NULL,
	`method` text DEFAULT 'cash' NOT NULL,
	`paid_at` integer NOT NULL,
	`note` text,
	`recorded_by` text,
	FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_payable_payments_purchase` ON `payable_payments` (`purchase_id`);--> statement-breakpoint
CREATE TABLE `productions` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`product_id` text NOT NULL,
	`qty` integer NOT NULL,
	`hpp_per_unit` integer NOT NULL,
	`total_cost` integer NOT NULL,
	`staff_id` text,
	`note` text,
	`occurred_at` integer NOT NULL,
	`business_date` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_productions_outlet_date` ON `productions` (`outlet_id`,`business_date`);--> statement-breakpoint
CREATE TABLE `purchase_items` (
	`id` text PRIMARY KEY NOT NULL,
	`purchase_id` text NOT NULL,
	`material_id` text,
	`name_snapshot` text NOT NULL,
	`qty` integer NOT NULL,
	`unit_cost_milli` integer NOT NULL,
	`line_total` integer NOT NULL,
	FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_purchase_items_purchase` ON `purchase_items` (`purchase_id`);--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`supplier_name` text,
	`total` integer NOT NULL,
	`paid_amount` integer DEFAULT 0 NOT NULL,
	`remaining` integer DEFAULT 0 NOT NULL,
	`method` text DEFAULT 'cash' NOT NULL,
	`status` text DEFAULT 'paid' NOT NULL,
	`due_date` text,
	`note` text,
	`occurred_at` integer NOT NULL,
	`business_date` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_purchases_outlet_date` ON `purchases` (`outlet_id`,`business_date`);--> statement-breakpoint
CREATE INDEX `idx_purchases_outlet_status` ON `purchases` (`outlet_id`,`status`);--> statement-breakpoint
CREATE TABLE `recipe_items` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`material_id` text NOT NULL,
	`qty` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_recipe_product_material` ON `recipe_items` (`product_id`,`material_id`);--> statement-breakpoint
ALTER TABLE `products` ADD `hpp_mode` text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `labor_cost` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `overhead_cost` integer DEFAULT 0 NOT NULL;