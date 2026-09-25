CREATE TABLE `pembayaran_langganan` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`paket` text NOT NULL,
	`periode` text NOT NULL,
	`harga` integer NOT NULL,
	`kode_unik` integer NOT NULL,
	`nominal` integer NOT NULL,
	`status` text DEFAULT 'menunggu' NOT NULL,
	`bukti` text,
	`catatan` text,
	`dibuat_pada` integer NOT NULL,
	`dibayar_pada` integer,
	`diputuskan_pada` integer,
	`diputuskan_oleh` text,
	`berlaku_dari` integer,
	`berlaku_sampai` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`diputuskan_oleh`) REFERENCES `pengguna`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_bayar_langganan_status` ON `pembayaran_langganan` (`status`,`dibuat_pada`);--> statement-breakpoint
CREATE INDEX `idx_bayar_langganan_user` ON `pembayaran_langganan` (`user_id`,`dibuat_pada`);--> statement-breakpoint
CREATE TABLE `pengaturan_platform` (
	`kunci` text PRIMARY KEY NOT NULL,
	`nilai` text,
	`diubah_pada` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `users` ADD `wajib_bayar` integer DEFAULT 0 NOT NULL;