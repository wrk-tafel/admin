-- Income limits for 2027: Austria's at-risk-of-poverty threshold (Armutsgefährdungsschwelle) as
-- published by Statistik Austria with EU-SILC 2025 in April 2026 - EUR 1 827 a month for a
-- single-person household - scaled by the EU equivalence scale the threshold is published with
-- (+0.5 per additional adult, +0.3 per child) and cut off at whole euros, the same relation the
-- 2022 rows of R__00008 encode against the EUR 1 328 threshold of their time.
--
-- The rows currently open towards the future are closed on 2026-12-31 and the 2027 amounts take over
-- on 2027-01-01, so the change applies on New Year's Day without anyone having to edit it in.
-- Familienbeihilfe, Kinderabsetzbetrag and Geschwisterstaffelung are not touched: their indexation is
-- suspended for 2026 to 2028 (Budgetbegleitgesetz 2025 and 2027-2028), so the 2025 amounts still
-- apply. Tolerance and cost contribution are the Tafel's own numbers, not a published rate.
--
-- Skipped when 2027 income limits exist already, so a re-run does not stack a second set.
do
$$
    begin
        if not exists (select 1
                       from static_values
                       where type in ('INCOME_LIMIT', 'ADDITIONAL_ADULT', 'ADDITIONAL_CHILD')
                         and valid_from = '2027-01-01') then
            update static_values
            set valid_to = '2026-12-31'
            where type in ('INCOME_LIMIT', 'ADDITIONAL_ADULT', 'ADDITIONAL_CHILD')
              and valid_from < '2027-01-01'
              and valid_to > '2026-12-31';

            insert into static_values(id, type, valid_from, valid_to, amount, count_adults, count_children)
            select nextval('static_values_seq'), v.type, '2027-01-01', '2999-12-31', v.amount, v.count_adults, v.count_children
            from (values ('INCOME_LIMIT', 1827.00, 1, 0),
                         ('INCOME_LIMIT', 2375.00, 1, 1),
                         ('INCOME_LIMIT', 2923.00, 1, 2),
                         ('INCOME_LIMIT', 2740.00, 2, 0),
                         ('INCOME_LIMIT', 3288.00, 2, 1),
                         ('INCOME_LIMIT', 3836.00, 2, 2),
                         ('INCOME_LIMIT', 4384.00, 2, 3),
                         ('ADDITIONAL_ADULT', 913.00, null, null),
                         ('ADDITIONAL_CHILD', 548.00, null, null))
                     as v(type, amount, count_adults, count_children);
        end if;
    end
$$;
