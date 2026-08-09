-- Per-day driver progress along a route: one row per route stop that has been ticked off.
-- Keyed by the calendar date rather than by a distribution, because the driver guidance screen is
-- reachable without an active distribution (a driver looks at the route before the day starts).
-- "on delete cascade" is deliberate: RouteService.updateRoute replaces a route's stops wholesale,
-- so a completion whose stop no longer exists has nothing left to refer to.
create table if not exists routes_stops_completions
(
    id              bigint    primary key,
    created_at      timestamp not null,
    updated_at      timestamp not null,
    route_stop_id   bigint    not null references routes_stops (id) on delete cascade,
    completion_date date      not null,
    employee_id     bigint    null references employees (id) on delete set null,
    unique (route_stop_id, completion_date)
);

-- Hibernate's id.db_structure_naming_strategy is "standard" in this app (see R__00070) - every
-- entity table needs its own "<table>_seq" sequence, incremented by 50 to match Hibernate's
-- default allocationSize.
create sequence if not exists routes_stops_completions_seq
    start with 1
    increment by 50
    owned by routes_stops_completions.id;
