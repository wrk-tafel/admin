-- Heuristic backfill for the new households.single_parent flag: a household is guessed to be a
-- single-parent household when exactly one of its members is an adult (>= 18 years, as of today)
-- and at least one member is a minor. Members with an unknown birth_date are ignored for this
-- age check (neither counted as adult nor as minor) rather than skewing the counts.
-- This is a best-effort guess for historic data only, based on ages - the schema has no
-- relationship type between household members (e.g. partner vs. child vs. other relative), so it
-- cannot be derived reliably. Staff can correct it per household via the customer form.
update households h
set single_parent = (
    select
        count(*) filter (where p.birth_date <= current_date - interval '18 years') = 1
        and count(*) filter (where p.birth_date > current_date - interval '18 years') >= 1
    from persons p
    where p.household_id = h.id
    and p.birth_date is not null
)
where h.single_parent is null;
