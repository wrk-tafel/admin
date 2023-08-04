alter table if exists distributions_statistics
    add column if not exists count_persons_new integer not null;

alter table if exists distributions_statistics
    add column if not exists count_persons_prolonged integer not null;
