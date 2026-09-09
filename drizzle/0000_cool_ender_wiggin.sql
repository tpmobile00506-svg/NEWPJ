CREATE TABLE `approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`requestId` text NOT NULL,
	`stage` integer NOT NULL,
	`decision` text NOT NULL,
	`actor` text NOT NULL,
	`note` text NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`requestId`) REFERENCES `requests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `approval_stage_once` ON `approvals` (`requestId`,`stage`);--> statement-breakpoint
CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`quantity` integer NOT NULL,
	`unitSatang` integer NOT NULL,
	`totalSatang` integer NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`location` text NOT NULL,
	`branch` text NOT NULL,
	`category` text NOT NULL,
	`groupName` text NOT NULL,
	`condition` text DEFAULT 'normal' NOT NULL,
	`lifecycle` text DEFAULT 'active' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`parentId` text,
	`sourceId` text,
	`sourceRow` text,
	`receivedDate` text DEFAULT '' NOT NULL,
	`lifeYears` integer DEFAULT 0 NOT NULL,
	`salvageSatang` integer DEFAULT 0 NOT NULL,
	`serial` text DEFAULT '' NOT NULL,
	`brand` text DEFAULT '' NOT NULL,
	`custodian` text DEFAULT '' NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`location`) REFERENCES `locations`(`name`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`branch`) REFERENCES `branches`(`name`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category`) REFERENCES `categories`(`name`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`groupName`) REFERENCES `asset_groups`(`name`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "positive_quantity" CHECK(quantity>0),
	CONSTRAINT "nonnegative_money" CHECK(unitSatang>=0 and totalSatang>=0 and salvageSatang>=0 and salvageSatang<=totalSatang)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `asset_code_unique` ON `assets` (`code`);--> statement-breakpoint
CREATE INDEX `asset_lifecycle_branch` ON `assets` (`lifecycle`,`branch`);--> statement-breakpoint
CREATE INDEX `asset_parent` ON `assets` (`parentId`);--> statement-breakpoint
CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`assetId` text,
	`actor` text NOT NULL,
	`actorName` text NOT NULL,
	`action` text NOT NULL,
	`before` text NOT NULL,
	`after` text NOT NULL,
	`reason` text NOT NULL,
	`createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_asset` ON `audit` (`assetId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `branches` (
	`name` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`name` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `asset_groups` (
	`name` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `imports` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`hash` text NOT NULL,
	`objectKey` text NOT NULL,
	`rowCount` integer NOT NULL,
	`createdAt` text NOT NULL,
	`actor` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `imports_hash` ON `imports` (`hash`);--> statement-breakpoint
CREATE TABLE `invites` (
	`email` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`name` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `operations` (
	`id` text PRIMARY KEY NOT NULL,
	`valid` integer NOT NULL,
	`actor` text NOT NULL,
	`createdAt` text NOT NULL,
	CONSTRAINT "operation_assertion" CHECK(valid=1)
);
--> statement-breakpoint
CREATE TABLE `requests` (
	`id` text PRIMARY KEY NOT NULL,
	`assetId` text NOT NULL,
	`assetVersion` integer NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`reason` text NOT NULL,
	`stage` integer DEFAULT 0 NOT NULL,
	`chain` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`actor` text NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`assetId`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `request_status` ON `requests` (`status`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `source_rows` (
	`id` text PRIMARY KEY NOT NULL,
	`sourceId` text NOT NULL,
	`sourceRow` text NOT NULL,
	`raw` text NOT NULL,
	`decision` text NOT NULL,
	`reason` text NOT NULL,
	`actor` text NOT NULL,
	`createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `source_row_once` ON `source_rows` (`sourceId`,`sourceRow`);--> statement-breakpoint
CREATE TABLE `stocktake_items` (
	`id` text PRIMARY KEY NOT NULL,
	`roundId` text NOT NULL,
	`assetId` text NOT NULL,
	`snapshot` text NOT NULL,
	`result` text DEFAULT 'pending' NOT NULL,
	`quantity` integer,
	`notes` text DEFAULT '' NOT NULL,
	`actor` text,
	`checkedAt` text,
	FOREIGN KEY (`roundId`) REFERENCES `stocktakes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assetId`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stocktake_asset_once` ON `stocktake_items` (`roundId`,`assetId`);--> statement-breakpoint
CREATE TABLE `stocktakes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`year` integer NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`createdAt` text NOT NULL,
	`closedAt` text
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`createdAt` text NOT NULL,
	CONSTRAINT "valid_role" CHECK(role in ('staff','head','deputy','dean','admin'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email` ON `users` (`email`);