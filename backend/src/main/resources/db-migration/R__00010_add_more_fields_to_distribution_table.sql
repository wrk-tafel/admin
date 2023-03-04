alter table if exists distributions
    add column endedby_userid bigint null REFERENCES users (id);

alter table if exists distributions
    add column state varchar(20) not null;
