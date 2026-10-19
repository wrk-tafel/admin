-- Whether a food category still has to be cooked before it can be eaten (issue #3882). A shelter
-- without a kitchen - or one whose kitchen nobody knows about - gets none of these when the collected
-- goods are split between households and shelters.
alter table food_categories
    add column if not exists needs_cooking boolean not null default false;
