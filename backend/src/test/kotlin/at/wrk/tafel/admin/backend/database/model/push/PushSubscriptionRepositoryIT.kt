package at.wrk.tafel.admin.backend.database.model.push

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.generateRandomLong
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.transaction.annotation.Transactional

@Transactional
class PushSubscriptionRepositoryIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var pushSubscriptionRepository: PushSubscriptionRepository

    @Autowired
    private lateinit var userRepository: UserRepository

    @Test
    fun `findAllByUserId only returns subscriptions of that user`() {
        val user1 = persistUser()
        val user2 = persistUser()
        val subscriptionUser1 = persistSubscription(user1)
        persistSubscription(user2)
        testEntityManager.flush()

        val result = pushSubscriptionRepository.findAllByUserId(user1.id!!)

        assertThat(result.map { it.id }).containsExactly(subscriptionUser1.id)
    }

    @Test
    fun `findByEndpoint finds the subscription owning that endpoint`() {
        val user = persistUser()
        val subscription = persistSubscription(user)
        testEntityManager.flush()

        val result = pushSubscriptionRepository.findByEndpoint(subscription.endpoint!!)

        assertThat(result?.id).isEqualTo(subscription.id)
    }

    @Test
    fun `deleteByIdAndUserId only deletes when the subscription belongs to that user`() {
        val owner = persistUser()
        val stranger = persistUser()
        val subscription = persistSubscription(owner)
        testEntityManager.flush()

        val deletedByStranger = pushSubscriptionRepository.deleteByIdAndUserId(subscription.id!!, stranger.id!!)
        assertThat(deletedByStranger).isEqualTo(0L)

        val deletedByOwner = pushSubscriptionRepository.deleteByIdAndUserId(subscription.id!!, owner.id!!)
        assertThat(deletedByOwner).isEqualTo(1L)
    }

    @Test
    fun `deleting a user cascade-deletes its push subscriptions`() {
        val user = persistUser()
        val subscription = persistSubscription(user)
        testEntityManager.flush()
        // The persistence context still holds the subscription pointing at `user`, and there's no
        // Hibernate-level cascade/orphanRemoval from user to its subscriptions (only a DB-level "on
        // delete cascade") - without clearing, Hibernate's own flush-time dirty checking sees the
        // about-to-be-removed user as an "unsaved transient instance" from the subscription's side.
        testEntityManager.clear()

        userRepository.deleteById(user.id!!)
        testEntityManager.flush()

        assertThat(pushSubscriptionRepository.findById(subscription.id!!)).isEmpty()
    }

    private fun persistUser(): UserEntity {
        val user = createUser()
        testEntityManager.persist(user)
        return user
    }

    private fun persistSubscription(user: UserEntity): PushSubscriptionEntity {
        val randomNumber = generateRandomLong()
        val subscription = PushSubscriptionEntity().apply {
            this.user = user
            endpoint = "https://push.example.com/$randomNumber"
            p256dhKey = "p256dh-$randomNumber"
            authKey = "auth-$randomNumber"
        }
        testEntityManager.persist(subscription)
        return subscription
    }
}
