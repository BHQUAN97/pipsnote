-- Backfill sort_order for rows created before 001_add_sort_order.sql with a
-- distinct value (id) instead of the tied DEFAULT 0.
--
-- Why this is needed: the admin ▲▼ reorder UI swaps the sort_order of a row
-- and its nearest neighbor. With every pre-existing row tied at sort_order=0,
-- swapping two equal values is a no-op, so the first reorder click on
-- untouched data silently does nothing. Seeding distinct values (id, which is
-- already unique) makes sort_order decisive immediately, while still ranking
-- untouched rows in a stable, predictable order (higher id = newer = ranked
-- higher, matching the existing updated_at DESC fallback ordering).
--
-- Guarded by `WHERE sort_order = 0` so it only touches rows still at the
-- column default and never clobbers ranks an admin has already set via the
-- reorder UI between 001 and this file being applied.

UPDATE `posts` SET `sort_order` = `id` WHERE `sort_order` = 0;
UPDATE `brokers` SET `sort_order` = `id` WHERE `sort_order` = 0;
