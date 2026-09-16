-- HouseholdDuplicationService compared soundex(firstname)/soundex(lastname) per field, which
-- breaks when the same words end up split across those two fields differently between two
-- registrations of the same person (e.g. a double surname where one record puts the second word
-- in lastname and the other puts it in firstname) - reordering the words changes soundex's
-- leading letter, and turns levenshtein into a block transposition instead of a small edit.
--
-- household_duplicate_name_key() sorts the combined name's words into a canonical order before
-- either function sees them, so the comparison no longer depends on which field a word landed in.
create or replace function household_duplicate_name_key(firstname text, lastname text)
    returns text
    language sql
    immutable
as
$$
select coalesce(string_agg(word, '' order by word), '')
from unnest(regexp_split_to_array(lower(trim(concat(firstname, ' ', lastname))), '\s+')) as word
where word <> ''
$$;

drop index if exists soundex_persons_firstname;
drop index if exists soundex_persons_lastname;

create index if not exists idx_persons_duplicate_name_key
    on persons (soundex(household_duplicate_name_key(firstname, lastname)));
