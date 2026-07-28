-- "familybonus" was misleading: it refers to "Familienbeihilfe", not the unrelated
-- "Familienbonus Plus" tax credit. Renamed to "family_allowance" for clarity.
do $$
begin
    if exists (select 1 from information_schema.columns
               where table_name = 'persons' and column_name = 'receives_familybonus') then
        alter table persons rename column receives_familybonus to receives_family_allowance;
    end if;
end $$;

update static_values set type = 'FAMILY_ALLOWANCE' where type = 'FAMILY_BONUS';
