alter table if exists distributions
    add column endedby_userid bigint null REFERENCES users (id);
