-- Ported to households/persons (customers/customers_addpersons refactor). `persons.is_main_person
-- = false` preserves the old customers_addpersons semantics (only the additional household
-- members, not the main person) so these numbers stay comparable to prior runs of this script.

-- Auswertung für Schulstartpakete (als report im Admin - Alter konfigurierbar)
SELECT h.household_id, p.firstname, p.lastname, AGE(CURRENT_DATE, p.birth_date), COUNT(CASE WHEN DATE_PART('YEAR', AGE(CURRENT_DATE, p.birth_date)) BETWEEN 6 AND 10 THEN 1 END) AS period
FROM persons p
JOIN households h ON p.household_id = h.id
WHERE h.valid_until >= CURRENT_DATE
AND p.is_main_person = false
GROUP BY h.household_id, p.firstname, p.lastname, p.birth_date
HAVING COUNT(CASE WHEN DATE_PART('YEAR', AGE(CURRENT_DATE, p.birth_date)) BETWEEN 6 AND 10 THEN 1 END) >= 1
ORDER BY h.household_id;

-- JAHRES-STATISTIK

-- Anzahl aktiver Kunden/Haushalte zum Zeitpunkt 31.12.2025
select count(distinct household_id) from households
where households.valid_until >= '2025-12-31';
-- 2025: 90

-- Anzahl aktiver bezugsberechtigter Personen (Personen + 1 für Kunde) zum Zeitpunkt 31.12.2025
select count(*) from households
join persons on households.id = persons.household_id and persons.is_main_person = false
where households.valid_until >= '2025-12-31'
union
select count(*) from households
where households.valid_until >= '2025-12-31';
-- 2025: 178 + 90 = 268

-- Anzahl aktive Kunden/Haushalte mit Kindern (Alter <= 15) zum Zeitpunkt 31.12.2025
select count(distinct households.id) from persons
join households on households.id = persons.household_id
where households.valid_until >= '2025-12-31'
and persons.is_main_person = false
and EXTRACT(year from age(persons.birth_date)) <= 15;
-- 2025: 40

-- Anzahl NOST / sum
SELECT count(distinct distributions_statistics_shelters.id) FROM distributions_statistics_shelters
join distributions_statistics on distributions_statistics.id = distributions_statistics_shelters.distribution_statistic_id
join distributions on distributions.id = distributions_statistics.distribution_id
where distributions.created_at between '2025-01-01' and '2025-12-31';
-- 2025: 270

-- Anzahl NOST / average
select count(*) from distributions_statistics_shelters where created_at between '2025-01-01' and '2025-12-31';
-- 2025: 270 / 47 = 5.7
