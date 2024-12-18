alter table if exists distributions
    add column if not exists employee_count integer null;

alter table if exists distributions
    add column if not exists persons_in_shelter_count integer null;

alter table if exists distributions_statistics
    add column if not exists employee_count integer not null default 0;

alter table if exists distributions_statistics
    add column if not exists persons_in_shelter_count integer not null default 0;
