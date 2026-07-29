-- Reverts R__00079_add_event_publication.sql: no listener in this codebase uses
-- @ApplicationModuleListener/@TransactionalEventListener (the only two annotations that
-- spring-modulith-starter-jpa's event publication registry actually tracks), so the tables were
-- never written to. The app now depends on spring-modulith-starter-core instead, which doesn't
-- register that registry at all.
drop table if exists event_publication_archive;
drop table if exists event_publication;
