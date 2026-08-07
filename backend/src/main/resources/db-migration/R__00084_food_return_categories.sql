-- Return-box categories are their own master data, not a flavour of food category: they carry no
-- weight, never appear in a food collection's items, and are maintained on their own settings
-- screen. They live in their own table accordingly.
create table if not exists food_return_categories
(
    id         bigint       primary key,
    created_at timestamp    not null,
    updated_at timestamp    not null,
    name       varchar(100) not null,
    sort_order integer      not null,
    enabled    boolean      not null default true
);

-- Hibernate's id.db_structure_naming_strategy is "standard" in this app (see R__00070) - every
-- entity table needs its own "<table>_seq" sequence, incremented by 50 to match Hibernate's
-- default allocationSize.
create sequence if not exists food_return_categories_seq
    start with 1
    increment by 50
    owned by food_return_categories.id;

do
$$
    begin
        if exists (select 1
                   from information_schema.columns
                   where table_schema = current_schema()
                     and table_name = 'food_categories'
                     and column_name = 'return_item') then

            -- ids are carried over so anything still pointing at a category by id keeps resolving
            insert into food_return_categories (id, created_at, updated_at, name, sort_order, enabled)
            select c.id, c.created_at, c.updated_at, c.name, c.sort_order, c.enabled
            from food_categories c
            where c.return_item = true
              and not exists (select 1 from food_return_categories r where r.name = c.name);

            -- return categories had their own sort-order sequence starting well above the regular
            -- ones (2000+), which is meaningless once they are on their own - renumber to 1..n
            update food_return_categories r
            set sort_order = renumbered.new_sort_order
            from (select id, row_number() over (order by sort_order, name) as new_sort_order
                  from food_return_categories) renumbered
            where r.id = renumbered.id;

            delete from food_categories where return_item = true;

            alter table food_categories
                drop column return_item;

            perform setval('food_return_categories_seq',
                           coalesce((select max(id) from food_return_categories), 0) + 1000,
                           false);
        end if;
    end
$$;
