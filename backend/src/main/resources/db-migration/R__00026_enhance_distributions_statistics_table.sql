alter table if exists distributions_statistics
    add column if not exists count_persons_new integer not null;

alter table if exists distributions_statistics
    add column if not exists count_persons_prolonged integer not null;

create unique index distributions_statistics_distribution_id_uindex
    on distributions_statistics (distribution_id);
