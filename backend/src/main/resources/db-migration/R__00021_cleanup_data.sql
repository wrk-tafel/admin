update customers set income = null, incomeDue = null where income = 0;
update customers_addpersons set income = null, incomeDue = null where income = 0;

update customers set incomeDue = null where incomeDue = '1900-01-01';
update customers_addpersons set incomeDue = null where incomeDue = '1900-01-01';
