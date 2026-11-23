CREATE TABLE `newsletter_subscribers` (
	`voter_key` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`full_name` text NOT NULL,
	`discount_percent` integer DEFAULT 20 NOT NULL,
	`consent_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`consent_version` text NOT NULL,
	FOREIGN KEY (`voter_key`) REFERENCES `design_votes`(`voter_key`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "newsletter_subscribers_discount" CHECK("newsletter_subscribers"."discount_percent" = 20)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `newsletter_subscribers_email_unique` ON `newsletter_subscribers` (`email`);