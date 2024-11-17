create table if not exists employees
(
    id               bigint primary key,
    created_at       timestamp   not null,
    updated_at       timestamp   not null,
    personnel_number varchar(50) not null unique,
    firstname        varchar(50) not null,
    lastname         varchar(50) not null
);

INSERT INTO employees
select nextval('hibernate_sequence'), created_at, updated_at, personnel_number, firstname, lastname
from users;

alter table if exists users
    add column employee_id bigint references employees (id);

update users
set employee_id=(select id from employees where personnel_number = users.personnel_number);
