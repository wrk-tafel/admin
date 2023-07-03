update customers set income = null, income_due = null where income = 0;
update customers_addpersons set income = null, income_due = null where income = 0;

update customers set income_due = null where income_due = '1900-01-01';
update customers_addpersons set income_due = null where income_due = '1900-01-01';
