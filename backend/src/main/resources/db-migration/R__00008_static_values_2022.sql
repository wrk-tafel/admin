-- static values
-- income limits
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, count_adult, count_child)
VALUES (1, NOW(), NOW(), 'INCOME-LIMIT', '2022-01-01', '2999-12-31', 1328.00, 1, 0);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, count_adult, count_child)
VALUES (2, NOW(), NOW(), 'INCOME-LIMIT', '2022-01-01', '2999-12-31', 1726.00, 1, 1);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, count_adult, count_child)
VALUES (3, NOW(), NOW(), 'INCOME-LIMIT', '2022-01-01', '2999-12-31', 2124.00, 1, 2);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, count_adult, count_child)
VALUES (4, NOW(), NOW(), 'INCOME-LIMIT', '2022-01-01', '2999-12-31', 1992.00, 2, 0);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, count_adult, count_child)
VALUES (5, NOW(), NOW(), 'INCOME-LIMIT', '2022-01-01', '2999-12-31', 2390.00, 2, 1);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, count_adult, count_child)
VALUES (6, NOW(), NOW(), 'INCOME-LIMIT', '2022-01-01', '2999-12-31', 2788.00, 2, 2);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, count_adult, count_child)
VALUES (7, NOW(), NOW(), 'INCOME-LIMIT', '2022-01-01', '2999-12-31', 3187.00, 2, 3);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, additional_adult)
VALUES (8, NOW(), NOW(), 'INCOME-LIMIT', '2022-01-01', '2999-12-31', 664.00, true);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, additional_child)
VALUES (9, NOW(), NOW(), 'INCOME-LIMIT', '2022-01-01', '2999-12-31', 398.00, true);

-- income tolerance
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount)
VALUES (10, NOW(), NOW(), 'INCOME-TOLERANCE', '2022-01-01', '2999-12-31', 100.00);

-- family bonus
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, age)
VALUES (11, NOW(), NOW(), 'FAMILY-BONUS', '2022-01-01', '2999-12-31', 114.00, 0);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, age)
VALUES (12, NOW(), NOW(), 'FAMILY-BONUS', '2022-01-01', '2999-12-31', 121.90, 3);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, age)
VALUES (13, NOW(), NOW(), 'FAMILY-BONUS', '2022-01-01', '2999-12-31', 141.50, 10);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, age)
VALUES (14, NOW(), NOW(), 'FAMILY-BONUS', '2022-01-01', '2999-12-31', 165.10, 19);

-- child tax allowance
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount)
VALUES (15, NOW(), NOW(), 'CHILD-TAX-ALLOWANCE', '2022-01-01', '2999-12-31', 58.40);

-- sibling addition
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, count_child)
VALUES (16, NOW(), NOW(), 'SIBLING-ADDITION', '2022-01-01', '2999-12-31', 7.10, 2);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, count_child)
VALUES (17, NOW(), NOW(), 'SIBLING-ADDITION', '2022-01-01', '2999-12-31', 17.40, 3);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, count_child)
VALUES (18, NOW(), NOW(), 'SIBLING-ADDITION', '2022-01-01', '2999-12-31', 26.50, 4);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, count_child)
VALUES (19, NOW(), NOW(), 'SIBLING-ADDITION', '2022-01-01', '2999-12-31', 32.00, 5);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, count_child)
VALUES (20, NOW(), NOW(), 'SIBLING-ADDITION', '2022-01-01', '2999-12-31', 35.70, 6);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, count_child)
VALUES (21, NOW(), NOW(), 'SIBLING-ADDITION', '2022-01-01', '2999-12-31', 52.00, 7);
