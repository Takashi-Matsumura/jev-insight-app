CREATE TABLE `metrics` (
	`minute` integer NOT NULL,
	`key` text NOT NULL,
	`count` integer NOT NULL,
	`errors` integer NOT NULL,
	`total_ms` real NOT NULL,
	`max_ms` real NOT NULL,
	`max_inflight` integer NOT NULL,
	PRIMARY KEY(`minute`, `key`)
);
