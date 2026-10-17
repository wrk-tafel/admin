-- A lock's category (lock_reason_type) is chosen by hand for every new lock (issue #3865), so the locks
-- set before categories existed - which only carry the free-text lock_reason - get "Sonstiger Grund"
-- once, instead of the lock dialog having to preselect it for them. Households that are not locked keep
-- their null, which is what the unlock writes.
update households
set lock_reason_type = 'OTHER'
where locked
  and lock_reason_type is null;
