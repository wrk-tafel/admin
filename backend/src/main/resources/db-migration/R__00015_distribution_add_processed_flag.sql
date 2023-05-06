alter table distributions_customers
    add column if not exists processed boolean not null default false;
