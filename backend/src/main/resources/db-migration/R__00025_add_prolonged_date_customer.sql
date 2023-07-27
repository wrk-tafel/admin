alter table if exists customers
    add column if not exists prolonged_at timestamp null;
