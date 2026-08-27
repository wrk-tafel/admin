package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

internal class PushNotificationTypeTargetingTest {

    /**
     * How the distribution day is going concerns the whole team, so every type tracing it reaches a
     * user with no permissions at all. Pinned as a set rather than one example: a new phase type
     * that quietly acquired a permission requirement would narrow the audience for the whole
     * sequence.
     */
    @Test
    fun `every type tracing the distribution day is allowed for anyone, including a user with no permissions`() {
        val dayTypes = listOf(
            PushNotificationType.DISTRIBUTION_STARTED,
            PushNotificationType.CHECKIN_STARTED,
            PushNotificationType.ROUTE_AT_LAST_STOP,
            PushNotificationType.FOOD_COLLECTION_COMPLETED,
            PushNotificationType.FOOD_HANDOUT_STARTED,
            PushNotificationType.ALL_TICKETS_PROCESSED,
            PushNotificationType.DISTRIBUTION_CLOSED,
        )

        dayTypes.forEach { type ->
            assertThat(PushNotificationTypeTargeting.isAllowedFor(type, emptyList()))
                .describedAs("%s should reach everyone", type)
                .isTrue()
        }
    }

    @Test
    fun `a restricted type is allowed for a holder of any one of its permissions`() {
        assertThat(
            PushNotificationTypeTargeting.isAllowedFor(
                PushNotificationType.DISTRIBUTION_STILL_OPEN,
                listOf(UserPermissions.DISTRIBUTION_LCM.key),
            ),
        ).isTrue()
        assertThat(
            PushNotificationTypeTargeting.isAllowedFor(
                PushNotificationType.DISTRIBUTION_STILL_OPEN,
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
     * The technical notifications go to whoever keeps the application running, which is a different
     * person from whoever runs the distribution - so leading the distribution must not, on its own,
     * subscribe someone to a failed report mail or an account lockout.
     */
    @Test
    fun `the technical types require ADMINISTRATOR and are not granted by supervising a distribution`() {
        val technicalTypes = listOf(
            PushNotificationType.USER_LOCKED_OUT,
            PushNotificationType.REPORT_MAIL_FAILED,
            PushNotificationType.EXCESSIVE_READ_ACCESS,
            PushNotificationType.RETENTION_RUN,
        )

        technicalTypes.forEach { type ->
            assertThat(PushNotificationTypeTargeting.isAllowedFor(type, listOf(UserPermissions.ADMINISTRATOR.key)))
                .describedAs("%s should reach an administrator", type)
                .isTrue()
            assertThat(PushNotificationTypeTargeting.isAllowedFor(type, listOf(UserPermissions.SUPERVISOR.key)))
                .describedAs("%s should not reach a supervisor without ADMINISTRATOR", type)
                .isFalse()
        }
    }

    /**
     * ADMINISTRATOR grants every other permission, so it is an audience for every type - including
     * the ones it isn't named on. Checked here as well as in `JwtTokenServiceTest` because a
     * broadcast reaches people who are not logged in, so it cannot rely on the token's expansion and
     * has to apply the same rule against the stored authorities.
     */
    @Test
    fun `the administrator permission receives every notification type`() {
        PushNotificationType.entries.forEach { type ->
            assertThat(PushNotificationTypeTargeting.isAllowedFor(type, listOf(UserPermissions.ADMINISTRATOR.key)))
                .describedAs("administrator should receive %s", type)
                .isTrue()
        }
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
