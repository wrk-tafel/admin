alter table distributions
    alter column startedby_userid drop not null;

alter table distributions
    drop constraint distributions_startedby_userid_fkey;

alter table distributions
    add foreign key (startedby_userid) references users
        on delete set null;

alter table distributions
    drop constraint distributions_endedby_userid_fkey;

alter table distributions
    add foreign key (endedby_userid) references users
        on delete set null;
