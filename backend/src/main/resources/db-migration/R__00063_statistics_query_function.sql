CREATE OR REPLACE FUNCTION determine_resolution(from_date DATE, to_date DATE)
    RETURNS TEXT AS $$
DECLARE
    years INT;
    months INT;
BEGIN
    -- Calculate difference in years
    years := EXTRACT(year FROM age(to_date, from_date));
    IF years >= 3 THEN
        RETURN 'YEARLY';
    END IF;

    -- Calculate difference in total months
    months := (EXTRACT(year FROM age(to_date, from_date)) * 12) + EXTRACT(month FROM age(to_date, from_date));
    IF months >= 3 THEN
        RETURN 'MONTHLY';
    END IF;

    RETURN 'WEEKLY';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_timeline(from_date DATE, to_date DATE)
    RETURNS TABLE(start_date DATE, end_date DATE, res_code TEXT) AS $$
DECLARE
    res TEXT;
BEGIN
    res := determine_resolution(from_date, to_date);

    RETURN QUERY
        WITH raw_series AS (
            SELECT date_trunc(
                           CASE WHEN res = 'YEARLY' THEN 'year'
                                WHEN res = 'MONTHLY' THEN 'month'
                                ELSE 'week' END,
                           series
                   )::DATE as s_date
            FROM generate_series(
                         from_date::timestamp,
                         to_date::timestamp,
                         CASE WHEN res = 'YEARLY' THEN '1 year'::interval
                              WHEN res = 'MONTHLY' THEN '1 month'::interval
                              ELSE '1 week'::interval END
                 ) as series
        )
        SELECT
            s_date as start_date,
            (s_date +
             CASE WHEN res = 'YEARLY' THEN '1 year'::interval
                  WHEN res = 'MONTHLY' THEN '1 month'::interval
                  ELSE '1 week'::interval END
                - '1 day'::interval)::DATE as end_date,
            res as res_code
        FROM raw_series;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION format_by_resolution(value_date DATE, resolution TEXT)
    RETURNS TEXT AS $$
BEGIN
    RETURN TO_CHAR(
            value_date,
            CASE
                WHEN resolution = 'YEARLY' THEN 'YYYY'
                WHEN resolution = 'MONTHLY' THEN 'YYYY-MM'
                ELSE 'IYYY-"KW"IW'
                END
           );
END;
$$ LANGUAGE plpgsql;
