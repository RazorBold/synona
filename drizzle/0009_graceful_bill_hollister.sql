ALTER TABLE `pengguna` ADD `user_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `pengguna` ADD `aktif` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_pengguna_user` ON `pengguna` (`user_id`);