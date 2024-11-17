alter table if exists users
    drop column personnel_number;
alter table if exists users
    drop column firstname;
alter table if exists users
    drop column lastname;

alter table users
    alter column employee_id set not null;
