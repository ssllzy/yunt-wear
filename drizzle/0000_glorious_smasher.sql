CREATE TABLE `design_votes` (
	`voter_key` text PRIMARY KEY NOT NULL,
	`design_id` text NOT NULL,
	CONSTRAINT "design_votes_known_design" CHECK("design_votes"."design_id" IN ('design-01', 'design-02', 'design-03', 'design-04', 'design-05'))
);
--> statement-breakpoint
CREATE INDEX `design_votes_design_idx` ON `design_votes` (`design_id`);