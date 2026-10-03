CREATE TABLE `roblox_pairing_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`pairing_code` text NOT NULL,
	`project_id` text NOT NULL,
	`project_name` text NOT NULL,
	`screen_gui_name` text NOT NULL,
	`status` text NOT NULL,
	`mode` text DEFAULT 'manual' NOT NULL,
	`publisher_token_hash` text NOT NULL,
	`studio_token_hash` text,
	`plugin_instance_id` text,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`connected_at` integer,
	`last_seen_at` integer,
	`revision` integer DEFAULT 0 NOT NULL,
	`applied_revision` integer DEFAULT 0 NOT NULL,
	`manifest_json` text,
	`operations_json` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_roblox_pairing_sessions_code` ON `roblox_pairing_sessions` (`pairing_code`);--> statement-breakpoint
CREATE INDEX `idx_roblox_pairing_sessions_status_expiry` ON `roblox_pairing_sessions` (`status`,`expires_at`);