alter table if exists distributions_statistics
    add column if not exists count_single_parent_households integer not null default 0;
