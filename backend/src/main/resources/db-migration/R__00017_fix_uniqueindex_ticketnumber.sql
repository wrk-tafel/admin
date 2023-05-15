alter table if exists distributions_customers
    drop constraint if exists uc_ticketnumber;
alter table if exists distributions_customers
    add constraint uc_distributionid_ticketnumber UNIQUE (distribution_id, ticket_number);