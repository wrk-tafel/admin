-- distributions_statistics.persons_in_shelter_count is superseded by the shelters relation
-- (distributions_statistics_shelters): the number of persons in shelters is summed from the
-- selected shelters, so nothing reads or writes the column anymore.
alter table if exists distributions_statistics
    drop column if exists persons_in_shelter_count;
