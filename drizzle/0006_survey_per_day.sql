DROP INDEX `survey_responses_badge_code_unique`;--> statement-breakpoint
ALTER TABLE `survey_responses` ADD `event_day` text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE `survey_responses` SET `event_day` = date(`created_at`, 'unixepoch', '+9 hours');--> statement-breakpoint
CREATE UNIQUE INDEX `survey_responses_badge_code_event_day_unique` ON `survey_responses` (`badge_code`,`event_day`);
