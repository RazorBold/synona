ALTER TABLE `outlets` ADD `qris_gambar` text;--> statement-breakpoint
ALTER TABLE `outlets` ADD `pajak_nama` text;--> statement-breakpoint
ALTER TABLE `outlets` ADD `pajak_bp` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `outlets` ADD `pajak_mode` text DEFAULT 'termasuk' NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `tax_amount` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `tax_label` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `tax_mode` text;