alter table if exists food_categories
    add column if not exists weight_per_unit decimal;

-- Backwaren
update food_categories set weight_per_unit = 9 where id = 1;
-- Obst / Gemüse
update food_categories set weight_per_unit = 17 where id = 2;
-- Milchprodukte
update food_categories set weight_per_unit = 18 where id = 3;
-- Getränke
update food_categories set weight_per_unit = 10 where id = 4;
-- Fertiggerichte
update food_categories set weight_per_unit = 8 where id = 5;
-- Fleisch / Fisch
update food_categories set weight_per_unit = 20 where id = 6;
-- Konserven
update food_categories set weight_per_unit = 25 where id = 7;
-- Süßwaren
update food_categories set weight_per_unit = 9 where id = 8;
-- Tiefkühlprodukte
update food_categories set weight_per_unit = 20 where id = 9;
-- Sonstiges
update food_categories set weight_per_unit = 15 where id = 10;
