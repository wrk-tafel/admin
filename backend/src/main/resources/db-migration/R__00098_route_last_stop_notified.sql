-- The day a route's "driver is at the last stop" push notification went out. It is the guard that
-- keeps that notification to one per route per day: a driver who ticks a stop off, goes back and
-- ticks it off again passes the same point twice, and only the first time is news.
-- Same shape as distributions.food_collection_completed_at - a conditional update whose
-- affected-row count decides whether the event is published (see RouteRepository.markLastStopNotified).
alter table routes
    add column if not exists last_stop_notified_date date;
