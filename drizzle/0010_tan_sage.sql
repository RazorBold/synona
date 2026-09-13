CREATE TABLE `other_incomes` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`category` text DEFAULT 'lainnya' NOT NULL,
	`name` text NOT NULL,
	`amount` integer NOT NULL,
	`cash_account_id` text,
	`occurred_at` integer NOT NULL,
	`business_date` text NOT NULL,
	`note` text,
	`recorded_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`cash_account_id`) REFERENCES `cash_accounts`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_other_incomes_outlet_date` ON `other_incomes` (`outlet_id`,`business_date`);--> statement-breakpoint
ALTER TABLE `services` ADD `estimasi_nilai` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `services` ADD `estimasi_satuan` text DEFAULT 'jam' NOT NULL;--> statement-breakpoint
ALTER TABLE `transaction_items` ADD `discount` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Estimasi lama kerja yang sudah ada tercatat dalam jam: salin apa adanya.
UPDATE `services` SET `estimasi_nilai` = `estimasi_jam`, `estimasi_satuan` = 'jam';--> statement-breakpoint
-- Jenis bahan kini hanya "baku" dan "packaging". "setengah_jadi" dan "jadi"
-- tidak punya arti lagi setelah menu Produksi dihapus; pemilik bisa
-- memindahkan yang sebenarnya pembungkus ke "packaging" lewat menu Bahan.
UPDATE `materials` SET `jenis` = 'baku' WHERE `jenis` NOT IN ('baku', 'packaging');
