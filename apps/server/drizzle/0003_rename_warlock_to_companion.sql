ALTER TABLE `warlock` RENAME TO `companion`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_companion` (
	`id` integer PRIMARY KEY NOT NULL,
	`profile` text NOT NULL,
	CONSTRAINT "one_companion" CHECK(id = 1)
);
--> statement-breakpoint
INSERT INTO `__new_companion`("id", "profile") SELECT "id", "profile" FROM `companion`;--> statement-breakpoint
DROP TABLE `companion`;--> statement-breakpoint
ALTER TABLE `__new_companion` RENAME TO `companion`;--> statement-breakpoint
PRAGMA foreign_keys=ON;