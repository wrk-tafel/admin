alter table customers
    alter column birth_date drop not null;
update customers set birth_date = null where birth_date = '01-01-1900';

alter table customers
    alter column employer drop not null;
update customers set employer = null where employer = 'unbekannt' or LENGTH(TRIM(employer)) = 0;

alter table customers
    alter column address_city drop not null;
update customers set address_city = null where address_city = 'unbekannt' or LENGTH(TRIM(address_city)) = 0;

alter table customers
    alter column firstname drop not null;
update customers set firstname = null where firstname = 'unbekannt' or LENGTH(TRIM(firstname)) = 0;

alter table customers
    alter column lastname drop not null;
update customers set lastname = null where lastname = 'unbekannt' or LENGTH(TRIM(lastname)) = 0;

alter table customers
    alter column address_street drop not null;
update customers set address_street = null where address_street = 'unbekannt' or LENGTH(TRIM(address_street)) = 0;

alter table customers
    alter column address_city drop not null;
update customers set address_city = null where address_city = 'unbekannt' or LENGTH(TRIM(address_city)) = 0;

alter table customers_addpersons
    alter column birth_date drop not null;
update customers_addpersons set birth_date = null where birth_date = '01-01-1900';

alter table customers_addpersons
    alter column income_due drop not null;
update customers_addpersons set income_due = null where income_due = '01-01-1900';

-- other cleanups
update customers set telephone_number = null where telephone_number = '0' or LENGTH(TRIM(telephone_number)) = 0;
