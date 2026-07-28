alter table if exists households
    add column if not exists single_parent boolean null;
