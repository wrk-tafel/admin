alter table if exists distributions_customers
    drop constraint if exists uc_ticketnumber;
alter table if exists distributions_customers
    add constraint uc_ticketnumber UNIQUE (ticket_number);