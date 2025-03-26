create table if not exists static_income_limits
(
    id             bigint      not null
        primary key,
    valid_from     date        not null,
    valid_to       date        not null,
    type           varchar(50) not null,
    amount         numeric     not null,
    count_adults   integer,
    count_children integer,
    age            integer
);

INSERT INTO static_income_limits (id, valid_from, valid_to, type, amount, count_adults, count_children)
SELECT
    id, valid_from, valid_to, 'INCOME_LIMIT' AS type, amount, count_adult, count_child
FROM static_values
WHERE type = 'INCOME-LIMIT'
  AND additional_adult IS NULL
  AND additional_child IS NULL

UNION ALL

SELECT
    id, valid_from, valid_to, 'ADDITIONAL_ADULT' AS type, amount, count_adult, count_child
FROM static_values
WHERE type = 'INCOME-LIMIT'
  AND additional_adult = TRUE

UNION ALL

SELECT
    id, valid_from, valid_to, 'ADDITIONAL_CHILD' AS type, amount, count_adult, count_child
FROM static_values
WHERE type = 'INCOME-LIMIT'
  AND additional_child = TRUE;

INSERT INTO static_income_limits (id, valid_from, valid_to, type, amount, age)
SELECT
    id, valid_from, valid_to, 'FAMILY_BONUS' AS type, amount, age
FROM static_values
WHERE type = 'FAMILY-BONUS';

INSERT INTO static_income_limits (id, valid_from, valid_to, type, amount)
SELECT
    id, valid_from, valid_to, 'CHILD_TAX_ALLOWANCE' AS type, amount
FROM static_values
WHERE type = 'CHILD-TAX-ALLOWANCE';

INSERT INTO static_income_limits (id, valid_from, valid_to, type, amount, count_children)
SELECT
    id, valid_from, valid_to, 'SIBLING_ADDITION' AS type, amount, count_child
FROM static_values
WHERE type = 'SIBLING-ADDITION';

INSERT INTO static_income_limits (id, valid_from, valid_to, type, amount, count_adults, count_children)
VALUES (nextval('hibernate_sequence'), '2000-01-01', '2999-12-31', 'TOLERANCE', 100, 0, 0);

drop table if exists static_values;