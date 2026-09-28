CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`company` text NOT NULL,
	`visitor_name` text DEFAULT '' NOT NULL,
	`department` text DEFAULT '' NOT NULL,
	`position` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`staff_name` text DEFAULT '' NOT NULL,
	`memo` text DEFAULT '' NOT NULL,
	`consent_at` integer NOT NULL,
	`status` text DEFAULT 'recording' NOT NULL,
	`pending_text` text DEFAULT '' NOT NULL,
	`next_probe` text,
	`lead_score` real,
	`lead_grade` text,
	`summary` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`finalized_at` integer
);
--> statement-breakpoint
CREATE TABLE `utterances` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`text` text NOT NULL,
	`relevance` real NOT NULL,
	`topic` text NOT NULL,
	`signal` text NOT NULL,
	`severity` real NOT NULL,
	`budget_signal` real NOT NULL,
	`timeline_signal` real NOT NULL,
	`decision_maker_signal` real NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
