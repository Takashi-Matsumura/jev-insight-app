CREATE TABLE `survey_responses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token` text NOT NULL,
	`badge_code` text NOT NULL,
	`company` text DEFAULT '' NOT NULL,
	`visitor_name` text DEFAULT '' NOT NULL,
	`answers` text NOT NULL,
	`consent_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`redeemed_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `survey_responses_token_unique` ON `survey_responses` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `survey_responses_badge_code_unique` ON `survey_responses` (`badge_code`);