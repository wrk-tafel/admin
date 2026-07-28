-- No backfill: distributions_statistics_shelters is a historic, denormalized snapshot (kept
-- independent of later shelter renames/deletions - see DashboardService.getStatisticsData) with
-- no FK back to shelters, so there is no reliable way to recover the order a past snapshot was
-- taken in. Existing rows just default to 0 (no worse than today's arbitrary order); from now on
-- DistributionService.updateDistributionStatisticData freezes the live shelter sort_order onto
-- each new snapshot row at save time.
alter table if exists distributions_statistics_shelters
    add if not exists sort_order integer default 0 not null;
