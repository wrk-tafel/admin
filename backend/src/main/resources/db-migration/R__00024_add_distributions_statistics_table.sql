create table if not exists distributions_statistics
(
    id                           bigint primary key,
    created_at                   timestamp not null,
    updated_at                   timestamp not null,
    distribution_id              bigint    not null REFERENCES distributions (id) ON DELETE CASCADE,
    count_customers              integer   not null,
    count_persons                integer   not null,
    count_infants                integer   not null,
    average_persons_per_customer decimal   not null,
    count_customers_new          integer   not null,
    count_customers_updated      integer   not null
);
