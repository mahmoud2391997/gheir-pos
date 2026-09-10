CREATE TABLE `inventory_units` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`variantId` int NOT NULL,
	`sku` varchar(64) NOT NULL,
	`serial` int NOT NULL,
	`status` enum('available','sold','reserved','damaged') NOT NULL DEFAULT 'available',
	`soldAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_units_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_units_sku_unique` UNIQUE(`sku`)
);
--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`color` varchar(80) NOT NULL,
	`colorCode` varchar(16) NOT NULL,
	`nextSerial` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_variants_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_variants_product_color_idx` UNIQUE(`productId`,`colorCode`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`arabicName` varchar(160),
	`category` varchar(80) NOT NULL,
	`baseSku` varchar(32) NOT NULL,
	`price` decimal(12,2) NOT NULL,
	`active` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`saleId` int NOT NULL,
	`productId` int NOT NULL,
	`inventoryUnitId` int,
	`nameSnapshot` varchar(160) NOT NULL,
	`quantity` int NOT NULL,
	`unitPrice` decimal(12,2) NOT NULL,
	`lineTotal` decimal(12,2) NOT NULL,
	CONSTRAINT `sale_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`receiptNumber` varchar(40) NOT NULL,
	`cashierId` int,
	`customerName` varchar(160),
	`subtotal` decimal(12,2) NOT NULL,
	`tax` decimal(12,2) NOT NULL,
	`total` decimal(12,2) NOT NULL,
	`paymentMethod` enum('cash','card','instapay') NOT NULL,
	`status` enum('completed','voided') NOT NULL DEFAULT 'completed',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sales_id` PRIMARY KEY(`id`),
	CONSTRAINT `sales_receiptNumber_unique` UNIQUE(`receiptNumber`)
);
--> statement-breakpoint
CREATE TABLE `sku_print_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestedBy` int,
	`format` varchar(32) NOT NULL DEFAULT 'csv',
	`rowCount` int NOT NULL,
	`status` enum('queued','exported','printed') NOT NULL DEFAULT 'queued',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sku_print_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('cashier','admin') NOT NULL DEFAULT 'cashier';--> statement-breakpoint
CREATE INDEX `inventory_units_product_status_idx` ON `inventory_units` (`productId`,`status`);--> statement-breakpoint
CREATE INDEX `products_baseSku_idx` ON `products` (`baseSku`);--> statement-breakpoint
CREATE INDEX `sales_createdAt_idx` ON `sales` (`createdAt`);