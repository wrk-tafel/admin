package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.common.auth.model.UserLockedOutEvent
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.scheduling.annotation.Async

@ExtendWith(MockKExtension::class)
internal class UserLockedOutPushListenerTest {

    @RelaxedMockK
    private lateinit var pushBroadcastService: PushBroadcastService

    @InjectMockKs
    private lateinit var listener: UserLockedOutPushListener

    @Test
    fun `broadcasts a push naming the locked user and the number of failures`() {
        listener.onUserLockedOut(UserLockedOutEvent(username = "mmustermann", failureCount = 5))

        verify {
            pushBroadcastService.broadcast(
                type = PushNotificationType.USER_LOCKED_OUT,
                title = "Benutzer gesperrt",
                body = "Der Benutzer 'mmustermann' wurde nach 5 fehlgeschlagenen Anmeldeversuchen vorübergehend gesperrt.",
            )
        }
    }

    /**
     * Reached from a failed login request, whose response time must not grow with the number of
     * subscribed devices - each one costs a blocking HTTPS send.
     */
    @Test
    fun `broadcast runs off the publishing thread`() {
        val method = UserLockedOutPushListener::class.java
            .getDeclaredMethod("onUserLockedOut", UserLockedOutEvent::class.java)

        assertThat(method.isAnnotationPresent(Async::class.java)).isTrue()
    }
}
