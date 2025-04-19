alter table if exists distributions_customers
    add cost_contribution_paid boolean default true not null;
alter table if exists distributions_customers
    alter column cost_contribution_paid drop default;
alter table if exists customers
    add pending_cost_contribution numeric default 0 not null;

alter table if exists static_income_limits
    rename to static_values;

INSERT INTO static_values(id, type, valid_from, valid_to, amount)
VALUES (nextval('hibernate_sequence'), 'COST_CONTRIBUTION', '2025-01-01', '2999-12-31', 4.00);
