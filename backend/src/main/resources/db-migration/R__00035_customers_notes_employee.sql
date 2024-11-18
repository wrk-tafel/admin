alter table customers_notes
    add column employee_id bigint references employees (id);

update customers_notes
set employee_id = (select employees.id
                  from employees
                           join users on users.employee_id = employees.id
                  where customers_notes.user_id = users.id);
