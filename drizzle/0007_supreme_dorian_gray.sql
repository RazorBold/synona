CREATE TABLE `cash_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'kas' NOT NULL,
	`bank_name` text,
	`account_number` text,
	`opening_balance` integer DEFAULT 0 NOT NULL,
	`metode_default` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_cash_accounts_outlet` ON `cash_accounts` (`outlet_id`,`is_active`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_cash_accounts_metode` ON `cash_accounts` (`outlet_id`,`metode_default`) WHERE metode_default is not null;--> statement-breakpoint
CREATE TABLE `cash_transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`from_account_id` text NOT NULL,
	`to_account_id` text NOT NULL,
	`amount` integer NOT NULL,
	`note` text,
	`occurred_at` integer NOT NULL,
	`business_date` text NOT NULL,
	`recorded_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_account_id`) REFERENCES `cash_accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_account_id`) REFERENCES `cash_accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_cash_transfers_outlet_date` ON `cash_transfers` (`outlet_id`,`business_date`);--> statement-breakpoint
ALTER TABLE `debt_payments` ADD `cash_account_id` text REFERENCES cash_accounts(id);--> statement-breakpoint
ALTER TABLE `expenses` ADD `cash_account_id` text REFERENCES cash_accounts(id);--> statement-breakpoint
ALTER TABLE `materials` ADD `jenis` text DEFAULT 'baku' NOT NULL;--> statement-breakpoint
ALTER TABLE `payable_payments` ADD `cash_account_id` text REFERENCES cash_accounts(id);--> statement-breakpoint
ALTER TABLE `purchase_items` ADD `product_id` text REFERENCES products(id);--> statement-breakpoint
ALTER TABLE `purchases` ADD `cash_account_id` text REFERENCES cash_accounts(id);--> statement-breakpoint
ALTER TABLE `transactions` ADD `cash_account_id` text REFERENCES cash_accounts(id);--> statement-breakpoint
INSERT INTO `cash_accounts` (`id`,`outlet_id`,`name`,`type`,`metode_default`,`sort_order`,`created_at`,`updated_at`)
SELECT lower(hex(randomblob(11))), o.`id`, 'Kas Laci', 'kas', 'cash', 0,
       CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000
  FROM `outlets` o;--> statement-breakpoint
INSERT INTO `cash_accounts` (`id`,`outlet_id`,`name`,`type`,`metode_default`,`sort_order`,`created_at`,`updated_at`)
SELECT lower(hex(randomblob(11))), o.`id`, 'Rekening Bank', 'bank', 'transfer', 1,
       CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000
  FROM `outlets` o;--> statement-breakpoint
INSERT INTO `cash_accounts` (`id`,`outlet_id`,`name`,`type`,`metode_default`,`sort_order`,`created_at`,`updated_at`)
SELECT lower(hex(randomblob(11))), o.`id`, 'QRIS', 'ewallet', 'qris', 2,
       CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000
  FROM `outlets` o;--> statement-breakpoint
UPDATE `transactions` SET `cash_account_id` = (
  SELECT a.`id` FROM `cash_accounts` a
   WHERE a.`outlet_id` = `transactions`.`outlet_id`
     AND a.`metode_default` = CASE `transactions`.`payment_method`
           WHEN 'qris' THEN 'qris' WHEN 'transfer' THEN 'transfer' ELSE 'cash' END)
 WHERE `cash_account_id` IS NULL AND `status` = 'paid';--> statement-breakpoint
UPDATE `expenses` SET `cash_account_id` = (
  SELECT a.`id` FROM `cash_accounts` a
   WHERE a.`outlet_id` = `expenses`.`outlet_id`
     AND a.`metode_default` = CASE `expenses`.`method`
           WHEN 'qris' THEN 'qris' WHEN 'transfer' THEN 'transfer' ELSE 'cash' END)
 WHERE `cash_account_id` IS NULL;--> statement-breakpoint
UPDATE `purchases` SET `cash_account_id` = (
  SELECT a.`id` FROM `cash_accounts` a
   WHERE a.`outlet_id` = `purchases`.`outlet_id`
     AND a.`metode_default` = CASE `purchases`.`method`
           WHEN 'qris' THEN 'qris' WHEN 'transfer' THEN 'transfer' ELSE 'cash' END)
 WHERE `cash_account_id` IS NULL;--> statement-breakpoint
UPDATE `debt_payments` SET `cash_account_id` = (
  SELECT a.`id` FROM `cash_accounts` a
   JOIN `debts` d ON d.`id` = `debt_payments`.`debt_id`
   WHERE a.`outlet_id` = d.`outlet_id`
     AND a.`metode_default` = CASE `debt_payments`.`method`
           WHEN 'qris' THEN 'qris' WHEN 'transfer' THEN 'transfer' ELSE 'cash' END)
 WHERE `cash_account_id` IS NULL;--> statement-breakpoint
UPDATE `payable_payments` SET `cash_account_id` = (
  SELECT a.`id` FROM `cash_accounts` a
   JOIN `purchases` p ON p.`id` = `payable_payments`.`purchase_id`
   WHERE a.`outlet_id` = p.`outlet_id`
     AND a.`metode_default` = CASE `payable_payments`.`method`
           WHEN 'qris' THEN 'qris' WHEN 'transfer' THEN 'transfer' ELSE 'cash' END)
 WHERE `cash_account_id` IS NULL;
