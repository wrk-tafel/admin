package at.wrk.tafel.admin.backend.common.auth.components

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service

/**
 * GDPR gap #3426: `created_by`/`updated_by` (added by `R__00092_change_tracking_actor.sql`,
 * `R__00096_route_stop_completions.sql` and `R__00102_household_duplicate_dismissals.sql`) are
 * deliberately not a foreign key to `users(id)` - see `R__00092`'s own comment - so the value stays
 * readable after the account behind it is renamed or deleted. On a table with no retention of its
 * own (e.g. `shops`, `cars`, `routes`, `distributions`) that also means a deleted account's username
 * would otherwise stay in the database forever, past the point the account itself is gone.
 *
 * [anonymize] is called from [TafelUserDetailsManager.deleteUser] right before the account row
 * itself is removed, and replaces every occurrence of [username] in either column with a fixed
 * placeholder, across every table that carries them - one generic sweep rather than a bespoke
 * handler per table, since the mechanism (find the column, replace the value) is identical
 * everywhere. [TABLES_WITH_CHANGE_TRACKING_ACTOR] has to be kept in sync by hand with whichever
 * tables the migrations above touch - a future migration adding the columns to a new table needs
 * that table added here too.
 */
@Service
class ChangeTrackingActorAnonymizationService(
    private val jdbcTemplate: JdbcTemplate,
) {

    companion object {
        const val ANONYMIZED_ACTOR = "gelöschter Benutzer"

        private val TABLES_WITH_CHANGE_TRACKING_ACTOR = listOf(
            // R__00092_change_tracking_actor.sql
            "cars",
            "distributions",
            "distributions_households",
            "distributions_statistics",
            "distributions_statistics_shelters",
            "employees",
            "food_categories",
            "food_collections",
            "food_return_categories",
            "household_documents",
            "household_notes",
            "households",
            "login_attempts",
            "persons",
            "push_preferences",
            "push_subscriptions",
            "push_type_preferences",
            "routes",
            "routes_stops",
            "shelters",
            "shelters_contacts",
            "shops",
            "users",
            "users_authorities",
            // R__00096_route_stop_completions.sql
            "routes_stops_completions",
            // R__00102_household_duplicate_dismissals.sql
            "household_duplicate_dismissals",
        )
    }

    fun anonymize(username: String) {
        TABLES_WITH_CHANGE_TRACKING_ACTOR.forEach { table ->
            jdbcTemplate.update("update \"$table\" set created_by = ? where created_by = ?", ANONYMIZED_ACTOR, username)
            jdbcTemplate.update("update \"$table\" set updated_by = ? where updated_by = ?", ANONYMIZED_ACTOR, username)
        }
    }
}
