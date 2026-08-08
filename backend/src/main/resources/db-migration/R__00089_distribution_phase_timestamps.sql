-- Records when each phase of a distribution day was first reached. Written exactly once per
-- distribution, by a conditional UPDATE that only matches while the column is still null (see
-- DistributionRepository.mark*), which is what lets the phase notifications fire once even when a
-- ticket is reopened or a check-in is deleted and re-entered.
--
-- Nullable throughout: a phase that was never reached simply has no timestamp, and every
-- distribution that existed before this migration has none of them.
alter table if exists distributions
    add if not exists checkin_started_at timestamp;

alter table if exists distributions
    add if not exists food_handout_started_at timestamp;

alter table if exists distributions
    add if not exists tickets_completed_at timestamp;

alter table if exists distributions
    add if not exists food_collection_completed_at timestamp;
