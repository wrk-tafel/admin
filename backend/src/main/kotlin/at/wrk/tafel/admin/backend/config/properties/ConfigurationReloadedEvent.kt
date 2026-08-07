package at.wrk.tafel.admin.backend.config.properties

/**
 * Published by [ConfigFileReloadService] once a config file edit has been re-read and re-bound -
 * never on every poll tick, only when the refresh reported changed keys.
 *
 * Covers the whole configuration, not just `tafeladmin.*`: a refresh recomputes the entire
 * environment, so [changedKeys] may name any property in it. Listeners that only care about part of
 * it should say so themselves rather than assume the event is already narrowed.
 *
 * It carries no values: the `@ConfigurationProperties` beans are updated in place, so a listener
 * simply injects the one it cares about (e.g. [TafelAdminProperties]) and reads it.
 */
data class ConfigurationReloadedEvent(
    val changedKeys: Set<String>,
)
