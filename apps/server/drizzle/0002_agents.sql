CREATE TABLE `memory_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`minion_id` text NOT NULL,
	`name` text NOT NULL,
	`body` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`minion_id`) REFERENCES `minions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `memory_notes_name` ON `memory_notes` (`minion_id`,lower("name"));--> statement-breakpoint
CREATE TABLE `minions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`profile` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `minions_name` ON `minions` (lower("name"));--> statement-breakpoint
CREATE TABLE `warlock` (
	`id` integer PRIMARY KEY NOT NULL,
	`profile` text NOT NULL,
	CONSTRAINT "one_warlock" CHECK(id = 1)
);
