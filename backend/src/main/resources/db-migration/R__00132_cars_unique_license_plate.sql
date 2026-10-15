-- A license plate belongs to exactly one car, enabled or not: CarService refuses a second one with a
-- 409, and this index is what makes that hold for two creates that run at the same time.
-- upper(trim(...)) is the shape CarService stores a plate in, so a plate typed with different case
-- or surrounding blanks counts as the same one.
--
-- A database that already holds two cars with the same plate could not get the index. The oldest car
-- of each such group keeps its plate; every other one gets its id appended (cut to the column's 20
-- characters), so the administrator sees which entries to tidy up under Einstellungen > Fahrzeuge
-- instead of the application failing to start. Once the index exists, there is nothing left for the
-- update to match, so a re-run changes nothing.
update cars c
set license_plate = left(upper(trim(c.license_plate)), 20 - length(' #' || c.id)) || ' #' || c.id
where exists (select 1
              from cars other
              where upper(trim(other.license_plate)) = upper(trim(c.license_plate))
                and other.id < c.id);

create unique index if not exists cars_license_plate_unique_idx
    on cars (upper(trim(license_plate)));
