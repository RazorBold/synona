CREATE TABLE `jejak_pengunjung` (
	`id` text PRIMARY KEY NOT NULL,
	`pengunjung` text NOT NULL,
	`kunjungan` text NOT NULL,
	`jenis` text NOT NULL,
	`halaman` text NOT NULL,
	`target` text,
	`rujukan` text,
	`utm_source` text,
	`utm_campaign` text,
	`perangkat` text,
	`tanggal` text NOT NULL,
	`dibuat_pada` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_jejak_tanggal_jenis` ON `jejak_pengunjung` (`tanggal`,`jenis`);--> statement-breakpoint
CREATE INDEX `idx_jejak_pengunjung` ON `jejak_pengunjung` (`pengunjung`);