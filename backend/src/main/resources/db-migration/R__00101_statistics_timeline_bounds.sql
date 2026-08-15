-- The statistics timeline buckets whole weeks/months/years, and a bucket used to keep its full
-- calendar length regardless of the range it was asked for. Two things followed from that, both
-- of which the general statistics screen reports as a change that never happened:
--
--   * the range's edges were measured wrong in both directions. "01.08. bis 12.08." resolves to
--     weekly buckets, and the first of them started on the Monday before the 1st - five days of
--     July counted towards August - while the series stopped at the last bucket that *began*
--     inside the range, so the 10th to the 12th were not measured at all.
--   * comparing a period against the one before it compared different lengths. The shown period
--     ends today, so its final bucket holds the days up to today and nothing more; the compared
--     period ends on the same day a year earlier, and its final bucket collected that whole month.
--     Every key figure summed over the period therefore read lower than the year before it, on
--     data that had not changed.
--
-- Buckets are now clamped to the requested range: the first one starts on from_date, the last one
-- ends on to_date, and the series runs from the bucket containing from_date to the one containing
-- to_date so the whole range is covered exactly once. The labels are unaffected - clamping moves a
-- boundary within its own week/month/year, which is the unit the label is formatted from.
CREATE OR REPLACE FUNCTION get_timeline(from_date DATE, to_date DATE)
    RETURNS TABLE
            (
                start_date DATE,
                end_date   DATE,
                res_code   TEXT
            )
AS
$$
DECLARE
    res  TEXT;
    unit TEXT;
    step INTERVAL;
BEGIN
    res := determine_resolution(from_date, to_date);
    unit := CASE WHEN res = 'YEARLY' THEN 'year' WHEN res = 'MONTHLY' THEN 'month' ELSE 'week' END;
    step := CASE
                WHEN res = 'YEARLY' THEN '1 year'::interval
                WHEN res = 'MONTHLY' THEN '1 month'::interval
                ELSE '1 week'::interval END;

    RETURN QUERY
        WITH raw_series AS (
            -- from the bucket from_date falls into, so that a range starting mid-bucket still gets
            -- its own first bucket, up to to_date, so the last days of the range get theirs
            SELECT series::DATE AS s_date
            FROM generate_series(
                         date_trunc(unit, from_date::timestamp),
                         to_date::timestamp,
                         step
                 ) AS series
        )
        SELECT GREATEST(s_date, from_date)                          AS start_date,
               LEAST((s_date + step - '1 day'::interval)::DATE, to_date) AS end_date,
               res                                                  AS res_code
        FROM raw_series;
END;
$$ LANGUAGE plpgsql;
