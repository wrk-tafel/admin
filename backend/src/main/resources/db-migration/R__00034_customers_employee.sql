alter table customers
    add column employee_id bigint references employees (id);

update customers
set employee_id = (select employees.id
                  from employees
                           join users on users.employee_id = employees.id
                  where customers.user_id = users.id);
