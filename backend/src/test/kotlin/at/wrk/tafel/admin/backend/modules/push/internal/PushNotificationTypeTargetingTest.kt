package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

internal class PushNotificationTypeTargetingTest {

    @Test
    fun `an unrestricted type is allowed for anyone, including a user with no permissions at all`() {
        assertThat(PushNotificationTypeTargeting.isAllowedFor(PushNotificationType.DISTRIBUTION_STARTED, emptyList())).isTrue()
        assertThat(PushNotificationTypeTargeting.isAllowedFor(PushNotificationType.DISTRIBUTION_CLOSED, emptyList())).isTrue()
    }

    @Test
    fun `a restricted type is allowed for a holder of any one of its permissions`() {
        assertThat(
            PushNotificationTypeTargeting.isAllowedFor(
                PushNotificationType.FOOD_COLLECTION_INCOMPLETE,
                listOf(UserPermissions.LOGISTICS.key),
            ),
        ).isTrue()
        assertThat(
            PushNotificationTypeTargeting.isAllowedFor(
                PushNotificationType.FOOD_COLLECTION_INCOMPLETE,
                listOf(UserPermissions.SUPERVISOR.key),
            ),
        ).isTrue()
    }

    @Test
    fun `a restricted type is not allowed for a user holding only unrelated permissions`() {
        assertThat(
            PushNotificationTypeTargeting.isAllowedFor(
                PushNotificationType.USER_LOCKED_OUT,
                listOf(UserPermissions.CHECKIN.key, UserPermissions.LOGISTICS.key),
            ),
        ).isFalse()
    }

    /**
     * A user's stored authority names outlive the permissions themselves - one that was renamed or
     * dropped is still sitting in `users_authorities`. It grants nothing, but it must not blow up
     * a broadcast either, since that would take down delivery for every other recipient too.
     */
    @Test
    fun `an authority name that isn't a known permission simply grants nothing`() {
        assertThat(
            PushNotificationTypeTargeting.isAllowedFor(PushNotificationType.USER_LOCKED_OUT, listOf("SOMETHING_REMOVED")),
        ).isFalse()
    }

    /**
     * The leadership role is the one audience meant to see everything, so a new restricted type
     * that forgets to include it would quietly narrow what leadership is told.
     */
    @Test
    fun `the supervisor permission receives every notification type`() {
        PushNotificationType.entries.forEach { type ->
            assertThat(PushNotificationTypeTargeting.isAllowedFor(type, listOf(UserPermissions.SUPERVISOR.key)))
                .describedAs("supervisor should receive %s", type)
                .isTrue()
        }
    }

    /**
     * A missing target path is invisible until someone taps a notification and lands nowhere, so it
     * is asserted for the whole enum rather than per type - this is what makes adding a type without
     * a screen a failing test instead of a silent gap.
     */
    @Test
    fun `every notification type points at a screen`() {
        PushNotificationType.entries.forEach { type ->
            assertThat(PushNotificationTypeTargeting.targetPathOf(type))
                .describedAs("target path for %s", type)
                .isNotNull()
                .isNotEqualTo("")
        }
    }

    /**
     * These are paths below the app's base path, which is prepended when the payload is built - a
     * leading slash there would produce a doubled one and defeat the base path entirely.
     */
    @Test
    fun `target paths are relative, without a leading slash`() {
        PushNotificationType.entries.forEach { type ->
            assertThat(PushNotificationTypeTargeting.targetPathOf(type))
                .describedAs("target path for %s", type)
                .doesNotStartWith("/")
        }
    }
}
