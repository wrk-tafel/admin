ALTER TABLE IF EXISTS customers
    ADD COLUMN IF NOT EXISTS country_id bigint not null REFERENCES static_countries(id);
