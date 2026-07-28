-- Configurable age range (inclusive) for the "school starter package" report, see reporting module.
INSERT INTO static_values (id, type, valid_from, valid_to, age)
VALUES (nextval('static_values_seq'), 'SCHOOL_STARTER_PACKAGE_AGE_MIN', '2000-01-01', '2999-12-31', 6);
INSERT INTO static_values (id, type, valid_from, valid_to, age)
VALUES (nextval('static_values_seq'), 'SCHOOL_STARTER_PACKAGE_AGE_MAX', '2000-01-01', '2999-12-31', 10);
