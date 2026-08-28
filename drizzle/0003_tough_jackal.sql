CREATE TABLE `pengguna` (
	`id` text PRIMARY KEY NOT NULL,
	`nama` text NOT NULL,
	`nama_pengguna` text NOT NULL,
	`hash_sandi` text NOT NULL,
	`salt` text NOT NULL,
	`peran` text DEFAULT 'kasir' NOT NULL,
	`harus_ganti_sandi` integer DEFAULT 0 NOT NULL,
	`dibuat_pada` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_pengguna_nama_pengguna` ON `pengguna` (`nama_pengguna`);--> statement-breakpoint
CREATE TABLE `sesi` (
	`id` text PRIMARY KEY NOT NULL,
	`pengguna_id` text NOT NULL,
	`kedaluwarsa_pada` integer NOT NULL,
	`dibuat_pada` integer NOT NULL,
	FOREIGN KEY (`pengguna_id`) REFERENCES `pengguna`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sesi_pengguna` ON `sesi` (`pengguna_id`);--> statement-breakpoint
CREATE INDEX `idx_sesi_kedaluwarsa` ON `sesi` (`kedaluwarsa_pada`);