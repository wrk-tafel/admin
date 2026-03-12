-- Auswertung für Schulstartpakete (als report im Admin - Alter konfigurierbar)
SELECT c.customer_id, cap.firstname, cap.lastname, AGE(CURRENT_DATE, cap.birth_date), COUNT(CASE WHEN DATE_PART('YEAR', AGE(CURRENT_DATE, cap.birth_date)) BETWEEN 6 AND 10 THEN 1 END) AS period
FROM customers_addpersons cap
JOIN customers c ON cap.customer_id = c.id
WHERE c.valid_until >= CURRENT_DATE
GROUP BY c.customer_id, cap.firstname, cap.lastname, cap.birth_date
HAVING COUNT(CASE WHEN DATE_PART('YEAR', AGE(CURRENT_DATE, cap.birth_date)) BETWEEN 6 AND 10 THEN 1 END) >= 1
ORDER BY c.customer_id;

-- JAHRES-STATISTIK

-- Anzahl aktiver Kunden/Haushalte zum Zeitpunkt 31.12.2025
select count(distinct customer_id) from customers
where customers.valid_until >= '2025-12-31';
-- 2025: 90

-- Anzahl aktiver bezugsberechtigter Personen (Personen + 1 für Kunde) zum Zeitpunkt 31.12.2025
select count(*) from customers
join customers_addpersons on customers.id = customers_addpersons.customer_id
where customers.valid_until >= '2025-12-31'
union
select count(*) from customers
where customers.valid_until >= '2025-12-31';
-- 2025: 178 + 90 = 268

-- Anzahl aktive Kunden/Haushalte mit Kindern (Alter <= 15) zum Zeitpunkt 31.12.2025
select count(distinct customers.id) from customers_addpersons
join customers on customers.id = customers_addpersons.customer_id
where customers.valid_until >= '2025-12-31'
and EXTRACT(year from age(customers_addpersons.birth_date)) <= 15;
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
