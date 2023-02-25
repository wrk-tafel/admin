alter table if exists distributions
    add column endedby_userid bigint null REFERENCES users (id);

alter table if exists distributions
    add column state_id varchar(30) null;

alter table if exists distributions
    add column state_current varchar(50) null;

alter table if exists distributions
    drop column if exists state_context;
alter table if exists distributions
    add column state_context json null;
