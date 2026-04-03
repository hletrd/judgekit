ALTER TABLE `problems` ADD `difficulty` real;
--> statement-breakpoint
UPDATE `problems` SET
  difficulty = CAST(SUBSTR(title, 3, 1) AS REAL),
  title = TRIM(SUBSTR(title, 6)),
  updated_at = unixepoch()
WHERE title GLOB '[P[0-9]] *';
