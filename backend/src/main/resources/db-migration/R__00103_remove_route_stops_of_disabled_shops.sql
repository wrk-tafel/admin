-- A deactivated shop is removed from every route it was a stop of (see ShopService).
-- Clean up the stops of shops that were already disabled: they would otherwise keep showing up
-- as regular stops, since nothing renders a disabled-shop marker anymore.
delete from routes_stops
where shop_id in (select id from shops where enabled = false);
