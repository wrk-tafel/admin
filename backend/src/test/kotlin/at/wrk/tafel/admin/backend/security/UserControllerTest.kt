package at.wrk.tafel.admin.backend.security

import at.wrk.tafel.admin.backend.common.api.PagedResponse
import at.wrk.tafel.admin.backend.common.api.PaginationDefaults
import at.wrk.tafel.admin.backend.common.auth.UserController
import at.wrk.tafel.admin.backend.common.auth.components.*
import at.wrk.tafel.admin.backend.common.auth.model.*
import at.wrk.tafel.admin.backend.config.properties.ApplicationProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminServerProperties
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockKey
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockService
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.ConflictException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.base.exception.TafelApiException
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.context.SecurityContextImpl
import org.springframework.security.core.userdetails.UsernameNotFoundException
import java.time.LocalDate

@ExtendWith(MockKExtension::class)
class UserControllerTest {

    @RelaxedMockK
    private lateinit var userDetailsManager: TafelUserDetailsManager

    @RelaxedMockK
    private lateinit var tafelPasswordGenerator: TafelPasswordGenerator

    @RelaxedMockK
    private lateinit var tafelAdminProperties: TafelAdminProperties

    @RelaxedMockK
    private lateinit var applicationProperties: ApplicationProperties

    @RelaxedMockK
    private lateinit var loginAttemptService: LoginAttemptService

    @RelaxedMockK
    private lateinit var userExportService: UserExportService

    @RelaxedMockK
    private lateinit var staffPrivacyNoticeService: StaffPrivacyNoticeService

    @RelaxedMockK
    private lateinit var jwtTokenService: JwtTokenService

    @RelaxedMockK
    private lateinit var request: HttpServletRequest

    @RelaxedMockK
    private lateinit var response: HttpServletResponse

    @RelaxedMockK
    private lateinit var advisoryLockService: AdvisoryLockService

    @RelaxedMockK
    private lateinit var userPreferencesService: UserPreferencesService

    @RelaxedMockK
    private lateinit var mfaService: MfaService

    @RelaxedMockK
    private lateinit var notificationService: AccountSecurityNotificationService

    @InjectMockKs
    private lateinit var controller: UserController

    /**
     * A relaxed mock returns a relaxed child mock for a nullable `LocalDateTime?`, not `null` -
     * every test that doesn't care about lockout state (i.e. almost all of them, via
     * `testUserResponse`'s `lockedUntil = null`) needs this default so mapToResponse's per-user
     * lookup resolves the same "not locked" answer `testUserResponse` expects. Same reasoning for
     * `loadUserByPersonnelNumber`: every update test that doesn't care about the personnel-number
     * collision check needs it to resolve "nobody else has this number" by default; tests that do
     * care override it with a more specific stub, same pattern as the lockout one.
     */
    @BeforeEach
    fun stubDefaults() {
        every { loginAttemptService.getLockedUntil(any<String>()) } returns null
        every { userDetailsManager.loadUserByPersonnelNumber(any()) } returns null
    }

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
    }

    @Test
    fun `get userinfo`() {
        val authentication = TafelJwtAuthentication(
            tokenValue = "TOKEN",
            username = testUser.username,
            authorities = testUserPermissions.map { SimpleGrantedAuthority(it.key) },
        )
        SecurityContextHolder.setContext(SecurityContextImpl(authentication))
        every { userPreferencesService.getTheme(testUser.username) } returns UserTheme.DARK

        val response = controller.getUserInfo()

        assertThat(response.body?.username).isEqualTo(testUser.username)
        assertThat(response.body?.permissions).isEqualTo(testUserPermissions.map { it.key })
        assertThat(response.body?.theme).isEqualTo(UserTheme.DARK)

        SecurityContextHolder.clearContext()
    }

    @Test
    fun `update theme of the authenticated user`() {
        val authentication = TafelJwtAuthentication(
            tokenValue = "TOKEN",
            username = testUser.username,
            authorities = testUserPermissions.map { SimpleGrantedAuthority(it.key) },
        )
        SecurityContextHolder.setContext(SecurityContextImpl(authentication))
        every { userPreferencesService.updateTheme(testUser.username, UserTheme.LIGHT) } returns
            UserThemeResponse(UserTheme.LIGHT)

        val response = controller.updateTheme(UserThemeRequest(UserTheme.LIGHT))

        assertThat(response.theme).isEqualTo(UserTheme.LIGHT)
        verify { userPreferencesService.updateTheme(testUser.username, UserTheme.LIGHT) }

        SecurityContextHolder.clearContext()
    }

    @Test
    fun `get own account returns the caller's data and nothing an administrator owns`() {
        val authentication = TafelJwtAuthentication(
            tokenValue = "TOKEN",
            username = testUser.username,
            authorities = testUserPermissions.map { SimpleGrantedAuthority(it.key) },
        )
        SecurityContextHolder.setContext(SecurityContextImpl(authentication))
        every { userDetailsManager.loadUserByUsername(testUser.username) } returns testUser.copy(email = "me@example.org")

        val response = controller.getAccount()

        assertThat(response).isEqualTo(
            UserAccountResponse(
                username = testUser.username,
                personnelNumber = testUser.personnelNumber,
                firstname = testUser.firstname,
                lastname = testUser.lastname,
                email = "me@example.org",
                mfaEmailEnabled = false,
            ),
        )
        // A user looking at their own record is not what the breach detection is for
        verify(exactly = 0) { userDetailsManager.recordUserRead(any()) }
    }

    @Test
    fun `update own account passes the trimmed name and e-mail on for the authenticated user only`() {
        val authentication = TafelJwtAuthentication(
            tokenValue = "TOKEN",
            username = testUser.username,
            authorities = testUserPermissions.map { SimpleGrantedAuthority(it.key) },
        )
        SecurityContextHolder.setContext(SecurityContextImpl(authentication))
        every { userDetailsManager.updateOwnAccount(testUser.username, "Maxi", "Muster", "maxi@example.org") } returns
            testUser.copy(firstname = "Maxi", lastname = "Muster", email = "maxi@example.org")

        val account = controller.updateAccount(UserAccountRequest(firstname = " Maxi ", lastname = "Muster ", email = " maxi@example.org "))

        assertThat(account.username).isEqualTo(testUser.username)
        assertThat(account.personnelNumber).isEqualTo(testUser.personnelNumber)
        assertThat(account.firstname).isEqualTo("Maxi")
        assertThat(account.lastname).isEqualTo("Muster")
        assertThat(account.email).isEqualTo("maxi@example.org")
        verify(exactly = 1) { userDetailsManager.updateOwnAccount(testUser.username, "Maxi", "Muster", "maxi@example.org") }
        // Only the dedicated own-account path is taken - never the administrator's whole-user update
        verify(exactly = 0) { userDetailsManager.updateUser(any()) }
        // The session it came in on stays what it was
        verify(exactly = 0) { response.addCookie(any()) }
    }

    /**
     * With the e-mail method on, the address is where every login code goes - so a session that has
     * been left open must not be able to redirect it without proving a factor.
     */
    @Test
    fun `update own account changing the e-mail address needs a code while the e-mail method is on`() {
        authenticateWith(UserPermissions.USER_MANAGEMENT)
        every { userDetailsManager.loadUserByUsername(testUser.username) } returns
            testUser.copy(email = "max@example.org", mfaEmailEnabled = true)
        every { mfaService.confirm(testUser.username, any()) } returns false

        assertThrows<BusinessRuleException> {
            controller.updateAccount(UserAccountRequest(firstname = "Maxi", lastname = "Muster", email = "attacker@example.org"))
        }
        assertThrows<BusinessRuleException> {
            controller.updateAccount(UserAccountRequest(firstname = "Maxi", lastname = "Muster", email = "attacker@example.org", mfaCode = "000000"))
        }

        verify(exactly = 0) { userDetailsManager.updateOwnAccount(any(), any(), any(), any()) }
        verify(exactly = 0) { notificationService.notify(any(), any(), any()) }
    }

    @Test
    fun `update own account changing the e-mail address with a valid code stores it and tells the old address`() {
        authenticateWith(UserPermissions.USER_MANAGEMENT)
        every { userDetailsManager.loadUserByUsername(testUser.username) } returns
            testUser.copy(email = "max@example.org", mfaEmailEnabled = true)
        every { mfaService.confirm(testUser.username, "123456") } returns true
        every { userDetailsManager.updateOwnAccount(testUser.username, "Maxi", "Muster", "new@example.org") } returns
            testUser.copy(firstname = "Maxi", lastname = "Muster", email = "new@example.org", mfaEmailEnabled = true)

        val account = controller.updateAccount(UserAccountRequest(firstname = "Maxi", lastname = "Muster", email = "new@example.org", mfaCode = "123456"))

        assertThat(account.email).isEqualTo("new@example.org")
        verify(exactly = 1) {
            notificationService.notify(testUser.username, "max@example.org", match { it.contains("new@example.org") })
        }
    }

    @Test
    fun `update own account needs no code when the address stays, or when the e-mail method is off`() {
        authenticateWith(UserPermissions.USER_MANAGEMENT)
        every { userDetailsManager.updateOwnAccount(any(), any(), any(), any()) } returns testUser

        // e-mail method on, address unchanged (apart from case and surrounding blanks)
        every { userDetailsManager.loadUserByUsername(testUser.username) } returns
            testUser.copy(email = "max@example.org", mfaEmailEnabled = true)
        controller.updateAccount(UserAccountRequest(firstname = "Maxi", lastname = "Muster", email = " Max@Example.org "))

        // only the app on: the address is not a factor, and adding the e-mail method proves the new one anyway
        every { userDetailsManager.loadUserByUsername(testUser.username) } returns
            testUser.copy(email = "max@example.org", mfaTotpEnabled = true)
        controller.updateAccount(UserAccountRequest(firstname = "Maxi", lastname = "Muster", email = "new@example.org"))

        verify(exactly = 0) { mfaService.confirm(any(), any()) }
        verify(exactly = 1) { notificationService.notify(testUser.username, "max@example.org", any()) }
    }

    @Test
    fun `update own account removing the address says so to the old one`() {
        authenticateWith(UserPermissions.USER_MANAGEMENT)
        every { userDetailsManager.loadUserByUsername(testUser.username) } returns testUser.copy(email = "max@example.org")
        every { userDetailsManager.updateOwnAccount(testUser.username, "Maxi", "Muster", null) } returns testUser

        controller.updateAccount(UserAccountRequest(firstname = "Maxi", lastname = "Muster", email = null))

        verify(exactly = 1) { notificationService.notify(testUser.username, "max@example.org", match { it.contains("entfernt") }) }
    }

    @Test
    fun `update own account stores a blank e-mail as no address`() {
        val authentication = TafelJwtAuthentication(
            tokenValue = "TOKEN",
            username = testUser.username,
            authorities = testUserPermissions.map { SimpleGrantedAuthority(it.key) },
        )
        SecurityContextHolder.setContext(SecurityContextImpl(authentication))
        every { userDetailsManager.updateOwnAccount(testUser.username, "Maxi", "Muster", null) } returns
            testUser.copy(firstname = "Maxi", lastname = "Muster", email = null)

        val response = controller.updateAccount(UserAccountRequest(firstname = "Maxi", lastname = "Muster", email = "   "))

        assertThat(response.email).isNull()
        verify(exactly = 1) { userDetailsManager.updateOwnAccount(testUser.username, "Maxi", "Muster", null) }
    }

    @Test
    fun `export user`() {
        val authentication = TafelJwtAuthentication(
            tokenValue = "TOKEN",
            username = testUser.username,
            authorities = testUserPermissions.map { SimpleGrantedAuthority(it.key) },
        )
        SecurityContextHolder.setContext(SecurityContextImpl(authentication))

        val testFilename = "benutzerdaten-${testUser.username}.zip"
        every { userExportService.exportUserByUsername(testUser.username) } returns UserExportFileResult(
            filename = testFilename,
            bytes = testFilename.toByteArray(),
        )

        val response = controller.exportUser()

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.headers.get(HttpHeaders.CONTENT_TYPE)!!.first()).isEqualTo("application/zip")
        assertThat(response.headers.contentDisposition.filename).isEqualTo(testFilename)
        assertThat(String(response.body!!.inputStream.readAllBytes())).isEqualTo(testFilename)

        SecurityContextHolder.clearContext()
    }

    @Test
    fun `export user - not found`() {
        val authentication = TafelJwtAuthentication(
            tokenValue = "TOKEN",
            username = testUser.username,
            authorities = testUserPermissions.map { SimpleGrantedAuthority(it.key) },
        )
        SecurityContextHolder.setContext(SecurityContextImpl(authentication))

        every { userExportService.exportUserByUsername(testUser.username) } returns null

        val exception = assertThrows<NotFoundException> { controller.exportUser() }
        assertThat(exception.statusCode).isEqualTo(HttpStatus.NOT_FOUND)
        assertThat(exception.body.detail).isEqualTo("Benutzer nicht gefunden!")

        SecurityContextHolder.clearContext()
    }

    @Test
    fun `export user by id`() {
        val testFilename = "benutzerdaten-${testUser.username}.zip"
        every { userExportService.exportUserById(1) } returns UserExportFileResult(
            filename = testFilename,
            bytes = testFilename.toByteArray(),
        )

        val response = controller.exportUserById(1)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.headers.get(HttpHeaders.CONTENT_TYPE)!!.first()).isEqualTo("application/zip")
        assertThat(response.headers.contentDisposition.filename).isEqualTo(testFilename)
        assertThat(String(response.body!!.inputStream.readAllBytes())).isEqualTo(testFilename)
    }

    @Test
    fun `export user by id - not found`() {
        every { userExportService.exportUserById(1) } returns null

        val exception = assertThrows<NotFoundException> { controller.exportUserById(1) }
        assertThat(exception.statusCode).isEqualTo(HttpStatus.NOT_FOUND)
        assertThat(exception.body.detail).isEqualTo("Benutzer (ID: 1) nicht gefunden!")
    }

    @Test
    fun `generate staff privacy notice template`() {
        val pdfBytes = "pdf-bytes".toByteArray()
        every { staffPrivacyNoticeService.generatePrivacyNoticePdf() } returns pdfBytes

        val response = controller.generatePrivacyNoticeTemplate()

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.headers.get(HttpHeaders.CONTENT_TYPE)!!.first()).isEqualTo("application/pdf")
        assertThat(response.headers.contentDisposition.filename).isEqualTo("datenschutzerklaerung-mitarbeiter.pdf")
        assertThat(response.body!!.inputStream.readAllBytes()).isEqualTo(pdfBytes)
    }

    @Test
    fun `generate password`() {
        val generatedPassword = "pwd-generated"
        every { tafelPasswordGenerator.generatePassword() } returns generatedPassword

        val response = controller.generatePassword()

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isEqualTo(GeneratedPasswordResponse(password = generatedPassword))
    }

    @Test
    fun `change password`() {
        val relativeBaseUrl = "/test-base/"
        every { tafelAdminProperties.server } returns TafelAdminServerProperties().apply { this.relativeBaseUrl = relativeBaseUrl }
        every { jwtTokenService.generateToken(any(), any()) } returns "NEW-TOKEN"

        val authentication = TafelJwtAuthentication(
            tokenValue = "OLD-TOKEN",
            username = testUser.username,
            authorities = testUserPermissions.map { SimpleGrantedAuthority(it.key) },
        )
        SecurityContextHolder.setContext(SecurityContextImpl(authentication))

        val changePasswordRequest = ChangePasswordRequest(passwordCurrent = "old", passwordNew = "new")

        val responseEntity = controller.changePassword(changePasswordRequest, request, response)

        assertThat(responseEntity.statusCode).isEqualTo(HttpStatus.OK)
        verify { userDetailsManager.changePassword("old", "new") }
        // Changing one's own password invalidates the very token this request came in on (see
        // TafelUserDetailsManager.changePassword) - the frontend keeps the user on this session
        // afterwards, so a fresh cookie has to be issued in the same response.
        verify {
            response.addCookie(
                withArg {
                    assertThat(it.name).isEqualTo(TafelLoginFilter.jwtCookieName)
                    assertThat(it.value).isEqualTo("NEW-TOKEN")
                    assertThat(it.path).isEqualTo(relativeBaseUrl)
                    assertThat(it.attributes["SameSite"]).isEqualTo("strict")
                },
            )
        }
    }

    @Test
    fun `change password failed`() {
        val errMsg = "failed"
        val errDetails = listOf("Length error ...", "Complexity error ...")
        every { userDetailsManager.changePassword(any(), any()) } throws PasswordChangeException(errMsg, errDetails)
        val changePasswordRequest = ChangePasswordRequest(passwordCurrent = "old", passwordNew = "new")

        val responseEntity = controller.changePassword(changePasswordRequest, request, response)

        assertThat(responseEntity.statusCode).isEqualTo(HttpStatus.BAD_REQUEST)
        assertThat(responseEntity.body?.message).isEqualTo(errMsg)
        assertThat(responseEntity.body?.details).hasSameElementsAs(errDetails)

        verify { userDetailsManager.changePassword("old", "new") }
        verify(exactly = 0) { response.addCookie(any()) }
    }

    @Test
    fun `logout`() {
        val relativeBaseUrl = "/test-base/"
        every { tafelAdminProperties.server } returns TafelAdminServerProperties().apply { this.relativeBaseUrl = relativeBaseUrl }

        val authentication = TafelJwtAuthentication(
            tokenValue = "TOKEN",
            username = testUser.username,
            authorities = testUserPermissions.map { SimpleGrantedAuthority(it.key) },
        )
        SecurityContextHolder.setContext(SecurityContextImpl(authentication))

        val responseEntity = controller.logout(request, response)

        assertThat(responseEntity.statusCode.value()).isEqualTo(HttpStatus.OK.value())

        verify {
            response.addCookie(
                withArg {
                    assertThat(it.name).isEqualTo(TafelLoginFilter.jwtCookieName)
                    assertThat(it.value).isNull()
                    assertThat(it.maxAge).isZero
                    assertThat(it.path).isEqualTo(relativeBaseUrl)
                    assertThat(it.attributes["SameSite"]).isEqualTo("strict")
                },
            )
        }
    }

    @Test
    fun `get user not found`() {
        every { userDetailsManager.loadUserById(any()) } returns null

        val exception = assertThrows<NotFoundException> { controller.getUser(1) }
        assertThat(exception.statusCode).isEqualTo(HttpStatus.NOT_FOUND)
        assertThat(exception.body.detail).isEqualTo("Benutzer (ID: 1) nicht gefunden!")
    }

    @Test
    fun `get user found and mapped properly`() {
        every { userDetailsManager.loadUserById(any()) } returns testUser

        val response = controller.getUser(1)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isEqualTo(testUserResponse)
    }

    /**
     * Single-user endpoints (get/create/update) each look the lockout up for just that one
     * username - the batched form in `getUsers` below exists specifically to avoid this per-row.
     */
    @Test
    fun `get user surfaces a currently active lockout`() {
        every { userDetailsManager.loadUserById(any()) } returns testUser
        val lockedUntil = LocalDate.of(2026, 1, 1).atStartOfDay()
        every { loginAttemptService.getLockedUntil(testUser.username) } returns lockedUntil

        val response = controller.getUser(1)

        assertThat(response.body?.lockedUntil).isEqualTo(lockedUntil)
    }

    /**
     * The actual `AuditOperation.READ` recording (dedupe window, actor resolution) is
     * `TafelUserDetailsManager.recordUserRead`'s own concern, covered by
     * `TafelUserDetailsManagerTest` - this only pins down that the detail-view endpoint hands the
     * loaded user to it (issue #3493).
     */
    @Test
    fun `get user records a READ via TafelUserDetailsManager`() {
        every { userDetailsManager.loadUserById(1) } returns testUser

        controller.getUser(1)

        verify(exactly = 1) { userDetailsManager.recordUserRead(testUser) }
    }

    @Test
    fun `get user by personnel number records a READ via TafelUserDetailsManager`() {
        every { userDetailsManager.loadUserByPersonnelNumber(testUser.personnelNumber) } returns testUser

        controller.getUserByPersonnelNumber(testUser.personnelNumber)

        verify(exactly = 1) { userDetailsManager.recordUserRead(testUser) }
    }

    @Test
    fun `get users found when filtered by personnel number`() {
        every { userDetailsManager.loadUserByPersonnelNumber(testUser.personnelNumber) } returns testUser

        val response = controller.getUserByPersonnelNumber(" ${testUser.personnelNumber} ")

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isEqualTo(testUserResponse)

        verify(exactly = 1) { userDetailsManager.loadUserByPersonnelNumber(testUser.personnelNumber) }
    }

    @Test
    fun `get users not found when filtered by personnel number`() {
        every { userDetailsManager.loadUserByPersonnelNumber(testUser.personnelNumber) } returns null

        val exception =
            assertThrows<NotFoundException> { controller.getUserByPersonnelNumber(testUser.personnelNumber) }
        assertThat(exception.statusCode).isEqualTo(HttpStatus.NOT_FOUND)
        assertThat(exception.body.detail).isEqualTo("Benutzer (Personalnummer: test-personnelnumber) nicht gefunden!")
    }

    @Test
    fun `get users filtered by other parameters`() {
        val searchInput = " test-searchinput "
        val enabled = true
        val page = 5
        val userSearchResult = UserSearchResult(
            items = listOf(testUser),
            totalCount = 20,
            currentPage = page,
            totalPages = 10,
            pageSize = 2,
        )

        every {
            userDetailsManager.loadUsers(
                searchInput = searchInput,
                enabled = enabled,
                page = page,
            )
        } returns userSearchResult

        val response =
            controller.searchUsers(
                UserSearchRequest(
                    searchInput = searchInput,
                    enabled = enabled,
                    page = page,
                ),
            )

        assertThat(response.items).isEqualTo(listOf(testUserResponse))
        assertThat(response.totalCount).isEqualTo(userSearchResult.totalCount)
        assertThat(response.currentPage).isEqualTo(userSearchResult.currentPage)
        assertThat(response.totalPages).isEqualTo(userSearchResult.totalPages)
        assertThat(response.pageSize).isEqualTo(userSearchResult.pageSize)

        verify(exactly = 1) {
            userDetailsManager.loadUsers(
                searchInput = searchInput,
                enabled = enabled,
                page = page,
            )
        }
    }

    @Test
    fun `get users - sortBy and sortDirection are forwarded`() {
        val userSearchResult = UserSearchResult(
            items = listOf(testUser),
            totalCount = 1,
            currentPage = 1,
            totalPages = 1,
            pageSize = 10,
        )

        every {
            userDetailsManager.loadUsers(
                searchInput = null,
                enabled = null,
                page = null,
                pageSize = null,
                sortBy = "name",
                sortDirection = "asc",
            )
        } returns userSearchResult

        val response = controller.searchUsers(UserSearchRequest(sortBy = "name", sortDirection = "asc"))

        assertThat(response.items).hasSize(1)
        verify(exactly = 1) {
            userDetailsManager.loadUsers(
                searchInput = null,
                enabled = null,
                page = null,
                pageSize = null,
                sortBy = "name",
                sortDirection = "asc",
            )
        }
    }

    /**
     * The page's lockout state is looked up once for the whole page (see
     * LoginAttemptService.getLockedUntil(Collection<String>)) rather than once per row - this pins
     * that wiring down, since a per-row lookup would still pass a unit test that only checks the
     * final response shape.
     */
    @Test
    fun `get users surfaces each row's lockout from the batched lookup`() {
        val lockedUser = testUser.copy(id = 2, username = "locked-user")
        val userSearchResult = UserSearchResult(
            items = listOf(testUser, lockedUser),
            totalCount = 2,
            currentPage = 1,
            totalPages = 1,
            pageSize = 2,
        )
        every { userDetailsManager.loadUsers(any(), any(), any(), any()) } returns userSearchResult
        val lockedUntil = LocalDate.of(2026, 1, 1).atStartOfDay()
        every {
            loginAttemptService.getLockedUntil(listOf(testUser.username, lockedUser.username))
        } returns mapOf(lockedUser.username to lockedUntil)

        val response = controller.searchUsers(UserSearchRequest())

        assertThat(response.items).extracting<java.time.LocalDateTime?> { it.lockedUntil }
            .containsExactly(null, lockedUntil)
    }

    @Test
    fun `create user`() {
        every { userDetailsManager.loadUserByUsername(any()) } throws UsernameNotFoundException("dummy") andThen testUser
        every { userDetailsManager.loadUserByPersonnelNumber(any()) } returns null

        val response = controller.createUser(user = testUserRequest)

        assertThat(response.statusCode).isEqualTo(HttpStatus.CREATED)
        assertThat(response.body).isEqualTo(testUserResponse)

        verify(exactly = 1) { userDetailsManager.createUser(testUser) }
    }

    @Test
    fun `create user stores a blank email as no email`() {
        every { userDetailsManager.loadUserByUsername(any()) } throws UsernameNotFoundException("dummy") andThen testUser
        every { userDetailsManager.loadUserByPersonnelNumber(any()) } returns null

        controller.createUser(user = testUserRequest.copy(email = "   "))

        val created = slot<TafelUser>()
        verify(exactly = 1) { userDetailsManager.createUser(capture(created)) }
        assertThat(created.captured.email).isNull()
    }

    @Test
    fun `get userinfo reports a login that still owes its code`() {
        SecurityContextHolder.getContext().authentication = TafelJwtAuthentication(
            tokenValue = "token",
            username = "max",
            authenticated = true,
            mfaPending = true,
        )

        val info = controller.getUserInfo().body!!

        assertThat(info.mfaPending).isTrue()
        assertThat(info.permissions).isEmpty()
    }

    @Test
    fun `get user maps whether two-factor authentication is on, never the secret`() {
        every { userDetailsManager.loadUserById(any()) } returns testUser.copy(mfaTotpEnabled = true)

        val response = controller.getUser(1)

        assertThat(response.body?.mfaEnabled).isTrue()
        assertThat(response.body?.mfaMethods).containsExactly("TOTP")
    }

    @Test
    fun `reset mfa clears it for an ordinary user`() {
        every { userDetailsManager.loadUserById(5) } returns testUser.copy(id = 5, mfaTotpEnabled = true)

        val response = controller.resetMfa(5)

        assertThat(response.statusCode).isEqualTo(HttpStatus.NO_CONTENT)
        verify(exactly = 1) { mfaService.reset(5) }
    }

    @Test
    fun `reset mfa of an administrator account is refused without the administrator permission`() {
        every { userDetailsManager.loadUserById(5) } returns testUser.copy(
            id = 5,
            authorities = listOf(SimpleGrantedAuthority(UserPermissions.ADMINISTRATOR.key)),
        )
        SecurityContextHolder.getContext().authentication = TafelJwtAuthentication(
            tokenValue = "token",
            username = "manager",
            authenticated = true,
            authorities = listOf(SimpleGrantedAuthority(UserPermissions.USER_MANAGEMENT.key)),
        )

        val exception = assertThrows<TafelApiException> { controller.resetMfa(5) }

        assertThat(exception.statusCode).isEqualTo(HttpStatus.FORBIDDEN)
        verify(exactly = 0) { mfaService.reset(any()) }
    }

    @Test
    fun `reset mfa of an administrator account is allowed for an administrator`() {
        every { userDetailsManager.loadUserById(5) } returns testUser.copy(
            id = 5,
            authorities = listOf(SimpleGrantedAuthority(UserPermissions.ADMINISTRATOR.key)),
        )
        SecurityContextHolder.getContext().authentication = TafelJwtAuthentication(
            tokenValue = "token",
            username = "admin",
            authenticated = true,
            authorities = listOf(SimpleGrantedAuthority(UserPermissions.ADMINISTRATOR.key)),
        )

        controller.resetMfa(5)

        verify(exactly = 1) { mfaService.reset(5) }
    }

    @Test
    fun `reset mfa of an unknown user is a not-found`() {
        every { userDetailsManager.loadUserById(99) } returns null

        assertThrows<NotFoundException> { controller.resetMfa(99) }
    }

    @Test
    fun `get user maps the email`() {
        every { userDetailsManager.loadUserById(any()) } returns testUser.copy(email = "test@example.org")

        val response = controller.getUser(1)

        assertThat(response.body?.email).isEqualTo("test@example.org")
    }

    @Test
    fun `create user with passwords not matching`() {
        every { userDetailsManager.loadUserByUsername(any()) } throws UsernameNotFoundException("dummy")
        every { userDetailsManager.loadUserByPersonnelNumber(any()) } returns null

        val exception = assertThrows<BusinessRuleException> {
            controller.createUser(user = testUserRequest.copy(password = "123", passwordRepeat = "456"))
        }

        assertThat(exception.statusCode).isEqualTo(HttpStatus.BAD_REQUEST)
        assertThat(exception.body.detail).isEqualTo("Passwörter stimmen nicht überein!")
        verify(exactly = 0) { userDetailsManager.createUser(any()) }
    }

    /**
     * ADMINISTRATOR implies every other permission, so being allowed to hand it out is being allowed
     * to grant yourself everything. USER_MANAGEMENT alone must therefore not be enough - otherwise
     * every other permission check in the application would be decorative.
     */
    @Test
    fun `create user with the administrator permission is refused without it`() {
        authenticateWith(UserPermissions.USER_MANAGEMENT)
        every { userDetailsManager.loadUserByUsername(any()) } throws UsernameNotFoundException("dummy")
        every { userDetailsManager.loadUserByPersonnelNumber(any()) } returns null

        val exception = assertThrows<TafelApiException> {
            controller.createUser(user = requestWithPermissions(UserPermissions.ADMINISTRATOR))
        }

        assertThat(exception.statusCode).isEqualTo(HttpStatus.FORBIDDEN)
        verify(exactly = 0) { userDetailsManager.createUser(any()) }
    }

    @Test
    fun `create user with the administrator permission is allowed for an administrator`() {
        authenticateWith(UserPermissions.USER_MANAGEMENT, UserPermissions.ADMINISTRATOR)
        every { userDetailsManager.loadUserByUsername(any()) } throws UsernameNotFoundException("dummy") andThen testUser
        every { userDetailsManager.loadUserByPersonnelNumber(any()) } returns null

        controller.createUser(user = requestWithPermissions(UserPermissions.ADMINISTRATOR))

        verify(exactly = 1) { userDetailsManager.createUser(any()) }
    }

    /**
     * Revoking matters as much as granting: without this a user manager could strip the
     * administrators and leave nobody able to put the permission back.
     */
    @Test
    fun `update user removing the administrator permission is refused without it`() {
        authenticateWith(UserPermissions.USER_MANAGEMENT)
        val administrator = testUser.copy(authorities = listOf(SimpleGrantedAuthority(UserPermissions.ADMINISTRATOR.key)))
        every { userDetailsManager.loadUserById(any()) } returns administrator

        val exception = assertThrows<TafelApiException> {
            controller.updateUser(userId = testUser.id!!, user = requestWithPermissions(UserPermissions.CHECKIN))
        }

        assertThat(exception.statusCode).isEqualTo(HttpStatus.FORBIDDEN)
        verify(exactly = 0) { userDetailsManager.updateUser(any()) }
    }

    /**
     * Only a *change* is refused - a user manager still has to be able to edit an administrator's
     * name, which means submitting the unchanged permission back untouched.
     */
    @Test
    fun `update user leaving the administrator permission untouched is allowed without it`() {
        authenticateWith(UserPermissions.USER_MANAGEMENT)
        val administrator = testUser.copy(authorities = listOf(SimpleGrantedAuthority(UserPermissions.ADMINISTRATOR.key)))
        every { userDetailsManager.loadUserById(any()) } returns administrator

        controller.updateUser(userId = testUser.id!!, user = requestWithPermissions(UserPermissions.ADMINISTRATOR))

        verify(exactly = 1) { userDetailsManager.updateUser(any()) }
    }

    /**
     * Losing the last administrator can't be undone from inside the application - only an
     * administrator can hand the permission back - so all three routes to that state are refused:
     * revoking the permission, disabling the account, and deleting it.
     */
    @Test
    fun `update user removing the administrator permission from the last administrator is refused`() {
        authenticateWith(UserPermissions.USER_MANAGEMENT, UserPermissions.ADMINISTRATOR)
        every { userDetailsManager.loadUserById(any()) } returns administratorUser()
        every { userDetailsManager.anotherEnabledAdministratorExists(any()) } returns false

        val exception = assertThrows<ConflictException> {
            controller.updateUser(userId = testUser.id!!, user = requestWithPermissions(UserPermissions.CHECKIN))
        }

        assertThat(exception.body.detail).contains("mindestens ein aktiver Benutzer")
        verify(exactly = 0) { userDetailsManager.updateUser(any()) }
    }

    @Test
    fun `update user removing the administrator permission is allowed while another one remains`() {
        authenticateWith(UserPermissions.USER_MANAGEMENT, UserPermissions.ADMINISTRATOR)
        every { userDetailsManager.loadUserById(any()) } returns administratorUser()
        every { userDetailsManager.anotherEnabledAdministratorExists(any()) } returns true

        controller.updateUser(userId = testUser.id!!, user = requestWithPermissions(UserPermissions.CHECKIN))

        verify(exactly = 1) { userDetailsManager.updateUser(any()) }
    }

    /**
     * A disabled administrator cannot log in, so disabling the last one locks everybody out just as
     * effectively as revoking the permission would.
     */
    @Test
    fun `update user disabling the last administrator is refused`() {
        authenticateWith(UserPermissions.USER_MANAGEMENT, UserPermissions.ADMINISTRATOR)
        every { userDetailsManager.loadUserById(any()) } returns administratorUser()
        every { userDetailsManager.anotherEnabledAdministratorExists(any()) } returns false

        val request = requestWithPermissions(UserPermissions.ADMINISTRATOR).copy(enabled = false)

        assertThrows<ConflictException> {
            controller.updateUser(userId = testUser.id!!, user = request)
        }

        verify(exactly = 0) { userDetailsManager.updateUser(any()) }
    }

    /**
     * validateAdministratorAssignment alone only guards the ADMINISTRATOR flag itself - without
     * this, a USER_MANAGEMENT holder could leave that flag untouched and still reset an
     * administrator's password, which hands over the account just as completely (issue #3566).
     */
    @Test
    fun `update user changing an administrator's password is refused without the administrator permission`() {
        authenticateWith(UserPermissions.USER_MANAGEMENT)
        every { userDetailsManager.loadUserById(any()) } returns administratorUser()

        val request =
            requestWithPermissions(UserPermissions.ADMINISTRATOR).copy(password = "newpass1", passwordRepeat = "newpass1")

        val exception = assertThrows<TafelApiException> {
            controller.updateUser(userId = testUser.id!!, user = request)
        }

        assertThat(exception.statusCode).isEqualTo(HttpStatus.FORBIDDEN)
        verify(exactly = 0) { userDetailsManager.updateUser(any()) }
    }

    @Test
    fun `update user changing an administrator's username is refused without the administrator permission`() {
        authenticateWith(UserPermissions.USER_MANAGEMENT)
        every { userDetailsManager.loadUserById(any()) } returns administratorUser()

        val request = requestWithPermissions(UserPermissions.ADMINISTRATOR).copy(username = "new-username")

        val exception = assertThrows<TafelApiException> {
            controller.updateUser(userId = testUser.id!!, user = request)
        }

        assertThat(exception.statusCode).isEqualTo(HttpStatus.FORBIDDEN)
        verify(exactly = 0) { userDetailsManager.updateUser(any()) }
    }

    @Test
    fun `update user forcing a password change on an administrator is refused without the administrator permission`() {
        authenticateWith(UserPermissions.USER_MANAGEMENT)
        every { userDetailsManager.loadUserById(any()) } returns administratorUser()

        val request = requestWithPermissions(UserPermissions.ADMINISTRATOR).copy(passwordChangeRequired = true)

        val exception = assertThrows<TafelApiException> {
            controller.updateUser(userId = testUser.id!!, user = request)
        }

        assertThat(exception.statusCode).isEqualTo(HttpStatus.FORBIDDEN)
        verify(exactly = 0) { userDetailsManager.updateUser(any()) }
    }

    /**
     * For an administrator on the e-mail method the address is the second factor, so changing it is the
     * reset `DELETE /{userId}/mfa` refuses to non-administrators.
     */
    @Test
    fun `update user changing an administrator's e-mail address is refused without the administrator permission`() {
        authenticateWith(UserPermissions.USER_MANAGEMENT)
        every { userDetailsManager.loadUserById(any()) } returns administratorUser().copy(email = "admin@example.org", mfaEmailEnabled = true)

        val request = requestWithPermissions(UserPermissions.ADMINISTRATOR).copy(email = "attacker@example.org")

        val exception = assertThrows<TafelApiException> {
            controller.updateUser(userId = testUser.id!!, user = request)
        }

        assertThat(exception.statusCode).isEqualTo(HttpStatus.FORBIDDEN)
        verify(exactly = 0) { userDetailsManager.updateUser(any()) }
    }

    @Test
    fun `update user keeping an administrator's e-mail address is allowed without the administrator permission`() {
        authenticateWith(UserPermissions.USER_MANAGEMENT)
        every { userDetailsManager.loadUserById(any()) } returns administratorUser().copy(email = "admin@example.org")

        val request = requestWithPermissions(UserPermissions.ADMINISTRATOR).copy(email = " Admin@example.org ")

        controller.updateUser(userId = testUser.id!!, user = request)

        verify(exactly = 1) { userDetailsManager.updateUser(any()) }
    }

    /**
     * The user administration must not be a way around the code the "Meine Daten" tab asks for: a caller
     * editing their own record could otherwise redirect their e-mailed login codes without giving one.
     */
    @Test
    fun `update user changing the caller's own e-mail address is refused while their e-mail method is on`() {
        val authentication = TafelJwtAuthentication(
            tokenValue = "TOKEN",
            username = testUser.username,
            authorities = listOf(SimpleGrantedAuthority(UserPermissions.USER_MANAGEMENT.key)),
            userId = testUser.id,
        )
        SecurityContextHolder.setContext(SecurityContextImpl(authentication))
        every { userDetailsManager.loadUserById(any()) } returns testUser.copy(email = "max@example.org", mfaEmailEnabled = true)

        val exception = assertThrows<BusinessRuleException> {
            controller.updateUser(userId = testUser.id!!, user = requestWithPermissions(*testUserPermissions.toTypedArray()).copy(email = "attacker@example.org"))
        }

        assertThat(exception.message).contains("Mein Konto")
        verify(exactly = 0) { userDetailsManager.updateUser(any()) }
    }

    @Test
    fun `update user changing the caller's own e-mail address is allowed while their e-mail method is off`() {
        val authentication = TafelJwtAuthentication(
            tokenValue = "TOKEN",
            username = testUser.username,
            authorities = listOf(SimpleGrantedAuthority(UserPermissions.USER_MANAGEMENT.key)),
            userId = testUser.id,
        )
        SecurityContextHolder.setContext(SecurityContextImpl(authentication))
        every { userDetailsManager.loadUserById(any()) } returns testUser.copy(email = "max@example.org", mfaTotpEnabled = true)

        controller.updateUser(userId = testUser.id!!, user = requestWithPermissions(*testUserPermissions.toTypedArray()).copy(email = "new@example.org"))

        verify(exactly = 1) { userDetailsManager.updateUser(any()) }
    }

    @Test
    fun `update user changing an administrator's password is allowed for an administrator`() {
        authenticateWith(UserPermissions.USER_MANAGEMENT, UserPermissions.ADMINISTRATOR)
        every { userDetailsManager.loadUserById(any()) } returns administratorUser()

        val request =
            requestWithPermissions(UserPermissions.ADMINISTRATOR).copy(password = "newpass1", passwordRepeat = "newpass1")

        controller.updateUser(userId = testUser.id!!, user = request)

        verify(exactly = 1) { userDetailsManager.updateUser(any()) }
    }

    /**
     * Only a *change* to those fields is refused - a user manager still has to be able to edit an
     * administrator's name, same as the ADMINISTRATOR-permission check above.
     */
    @Test
    fun `update user editing an administrator's name without touching password, username or passwordChangeRequired is allowed without the administrator permission`() {
        authenticateWith(UserPermissions.USER_MANAGEMENT)
        every { userDetailsManager.loadUserById(any()) } returns administratorUser()

        val request = requestWithPermissions(UserPermissions.ADMINISTRATOR).copy(firstname = "updated-firstname")

        controller.updateUser(userId = testUser.id!!, user = request)

        verify(exactly = 1) { userDetailsManager.updateUser(any()) }
    }

    @Test
    fun `delete user removing the last administrator is refused`() {
        every { userDetailsManager.loadUserById(any()) } returns administratorUser()
        every { userDetailsManager.anotherEnabledAdministratorExists(any()) } returns false

        assertThrows<ConflictException> { controller.deleteUser(userId = testUser.id!!) }

        verify(exactly = 0) { userDetailsManager.deleteUser(any()) }
    }

    @Test
    fun `delete user is allowed while another administrator remains`() {
        every { userDetailsManager.loadUserById(any()) } returns administratorUser()
        every { userDetailsManager.anotherEnabledAdministratorExists(any()) } returns true

        controller.deleteUser(userId = testUser.id!!)

        verify(exactly = 1) { userDetailsManager.deleteUser(testUser.username) }
    }

    /**
     * A user who isn't an active administrator was never the safeguard, so deleting them must not
     * need a lookup at all.
     */
    @Test
    fun `delete user who is not an administrator doesn't consult the administrator count`() {
        every { userDetailsManager.loadUserById(any()) } returns testUser

        controller.deleteUser(userId = testUser.id!!)

        verify(exactly = 0) { userDetailsManager.anotherEnabledAdministratorExists(any()) }
        verify(exactly = 1) { userDetailsManager.deleteUser(testUser.username) }
    }

    /**
     * Regression guard (issue #3602): the last-administrator check used to be a plain
     * check-then-act with no lock, so two concurrent deletes with exactly two enabled
     * administrators left could each see "another administrator exists" and both succeed.
     */
    @Test
    fun `delete user removing an administrator takes the LAST_ADMINISTRATOR_SAFEGUARD lock`() {
        every { userDetailsManager.loadUserById(any()) } returns administratorUser()
        every { userDetailsManager.anotherEnabledAdministratorExists(any()) } returns true

        controller.deleteUser(userId = testUser.id!!)

        verify(exactly = 1) { advisoryLockService.acquireLock(AdvisoryLockKey.LAST_ADMINISTRATOR_SAFEGUARD) }
    }

    @Test
    fun `delete user who is not an administrator doesn't take the LAST_ADMINISTRATOR_SAFEGUARD lock`() {
        every { userDetailsManager.loadUserById(any()) } returns testUser

        controller.deleteUser(userId = testUser.id!!)

        verify(exactly = 0) { advisoryLockService.acquireLock(any()) }
    }

    private fun administratorUser() = testUser.copy(
        enabled = true,
        authorities = listOf(SimpleGrantedAuthority(UserPermissions.ADMINISTRATOR.key)),
    )

    private fun authenticateWith(vararg permissions: UserPermissions) {
        val authentication = TafelJwtAuthentication(
            tokenValue = "TOKEN",
            username = testUser.username,
            authorities = permissions.map { SimpleGrantedAuthority(it.key) },
        )
        SecurityContextHolder.setContext(SecurityContextImpl(authentication))
    }

    private fun requestWithPermissions(vararg permissions: UserPermissions) = testUserRequest.copy(
        permissions = permissions.map {
            UserPermissionItem(key = it.key, title = it.title, category = it.category.title)
        },
    )

    @Test
    fun `create user with invalid password`() {
        every { userDetailsManager.loadUserByUsername(any()) } throws UsernameNotFoundException("dummy")
        every { userDetailsManager.loadUserByPersonnelNumber(any()) } returns null
        every { userDetailsManager.createUser(any()) } throws PasswordChangeException("Das neue Passwort ist ungültig!")

        val exception = assertThrows<BusinessRuleException> { controller.createUser(user = testUserRequest) }

        assertThat(exception.statusCode).isEqualTo(HttpStatus.BAD_REQUEST)
        assertThat(exception.body.detail).isEqualTo("Das neue Passwort ist ungültig!")
    }

    @Test
    fun `create user exists by username`() {
        every { userDetailsManager.loadUserByUsername(any()) } returns testUser

        val exception = assertThrows<ConflictException> { controller.createUser(user = testUserRequest) }
        assertThat(exception.body.detail).isEqualTo("Benutzer (Benutzername: test-username) existiert bereits!")
    }

    @Test
    fun `create user exists by personnelNumber`() {
        every { userDetailsManager.loadUserByUsername(any()) } throws UsernameNotFoundException("dummy")
        every { userDetailsManager.loadUserByPersonnelNumber(any()) } returns testUser

        val exception = assertThrows<ConflictException> { controller.createUser(user = testUserRequest) }
        assertThat(exception.body.detail).isEqualTo("Benutzer (Personalnummer: test-personnelnumber) existiert bereits!")
    }

    @Test
    fun `update user not found`() {
        every { userDetailsManager.loadUserById(any()) } returns null

        val exception =
            assertThrows<NotFoundException> {
                controller.updateUser(userId = 123, user = testUserRequest.copy(id = 123))
            }

        assertThat(exception.statusCode).isEqualTo(HttpStatus.NOT_FOUND)
        assertThat(exception.body.detail).isEqualTo("Benutzer (ID: 123) nicht vorhanden!")
    }

    /**
     * The write must always target the path id, not whatever id the body happens to carry - issue
     * #3522: a `USER_MANAGEMENT` holder without `ADMINISTRATOR` could otherwise send another user's
     * path id with their own id in the body and have the write land on their own account instead,
     * bypassing [validateAdministratorAssignment]/[validateNotLastAdministrator], which are only
     * ever checked against the path id's user.
     */
    @Test
    fun `update user rejects a body id that differs from the path id`() {
        every { userDetailsManager.loadUserById(any()) } returns testUser

        val exception = assertThrows<BusinessRuleException> {
            controller.updateUser(userId = testUser.id!!, user = testUserRequest.copy(id = 999))
        }

        assertThat(exception.statusCode).isEqualTo(HttpStatus.BAD_REQUEST)
        verify(exactly = 0) { userDetailsManager.updateUser(any()) }
    }

    @Test
    fun `update user allows a body id matching the path id`() {
        every { userDetailsManager.loadUserById(any()) } returns testUser

        val response = controller.updateUser(userId = testUser.id!!, user = testUserRequest.copy(id = testUser.id))

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
    }

    /** A missing body id (frontend never sends one) is fine - the path id is what's used either way. */
    @Test
    fun `update user allows a missing body id`() {
        every { userDetailsManager.loadUserById(any()) } returns testUser

        val response = controller.updateUser(userId = testUser.id!!, user = testUserRequest.copy(id = null))

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
    }

    @Test
    fun `update user found`() {
        every { userDetailsManager.loadUserById(any()) } returns testUser

        val newPermission = UserPermissionItem(
            key = UserPermissions.CHECKIN.key,
            title = UserPermissions.CHECKIN.title,
            category = UserPermissions.CHECKIN.category.title,
        )
        val updatedUser = UserRequest(
            id = testUser.id,
            username = "updated-username",
            personnelNumber = "updated-personnelnumber",
            firstname = "updated-firstname",
            lastname = "updated-lastname",
            email = " updated@example.org ",
            permissions = listOf(newPermission),
            passwordChangeRequired = true,
            enabled = false,
        )

        val updatedUserResponse = controller.updateUser(userId = testUser.id!!, user = updatedUser)

        assertThat(updatedUserResponse.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(updatedUserResponse.body).isEqualTo(testUserResponse)

        val updatedUserDetailsSlot = slot<TafelUser>()
        verify(exactly = 1) { userDetailsManager.updateUser(capture(updatedUserDetailsSlot)) }

        val userDetails = updatedUserDetailsSlot.captured
        // The write always targets the path id, regardless of what the body carried (issue #3522).
        assertThat(userDetails.id).isEqualTo(testUser.id)
        assertThat(userDetails.username).isEqualTo(updatedUser.username)
        assertThat(userDetails.personnelNumber).isEqualTo(updatedUser.personnelNumber)
        assertThat(userDetails.firstname).isEqualTo(updatedUser.firstname)
        assertThat(userDetails.lastname).isEqualTo(updatedUser.lastname)
        assertThat(userDetails.email).isEqualTo("updated@example.org")
        assertThat(userDetails.authorities).isEqualTo(listOf(SimpleGrantedAuthority(UserPermissions.CHECKIN.key)))
        assertThat(userDetails.password).isEqualTo(updatedUser.password)
        assertThat(userDetails.passwordChangeRequired).isEqualTo(updatedUser.passwordChangeRequired)
        assertThat(userDetails.enabled).isEqualTo(updatedUser.enabled)
    }

    /**
     * An admin resetting *someone else's* password: no authentication is set up in the security
     * context here (as with most other `updateUser` tests), so [UserController.updateUser] has no
     * "own account" to compare the target id against. See `update user including own password change
     * is refused` below for the self-service case.
     */
    @Test
    fun `update user including password change`() {
        every { userDetailsManager.loadUserById(any()) } returns testUser

        val newPassword = "123"
        val updatedUserResponse = controller.updateUser(
            userId = testUser.id!!,
            user = testUserRequest.copy(password = newPassword, passwordRepeat = newPassword),
        )

        assertThat(updatedUserResponse.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(updatedUserResponse.body).isEqualTo(testUserResponse)
        verify(exactly = 1) { userDetailsManager.updateUser(testUser.copy(password = newPassword)) }
        verify(exactly = 0) { response.addCookie(any()) }
    }

    /**
     * The self-service path is `POST /api/users/change-password`, which asks for the current password: a
     * caller who sets their own password through this endpoint would skip that (and the lockout that counts
     * wrong guesses) - which an open browser or a stolen session could use to take the account over.
     */
    @Test
    fun `update user including own password change is refused`() {
        every { userDetailsManager.loadUserById(any()) } returns testUser

        val authentication = TafelJwtAuthentication(
            tokenValue = "OLD-TOKEN",
            username = testUser.username,
            authorities = testUserPermissions.map { SimpleGrantedAuthority(it.key) },
            userId = testUser.id,
        )
        SecurityContextHolder.setContext(SecurityContextImpl(authentication))

        val newPassword = "123"
        val exception = assertThrows<BusinessRuleException> {
            controller.updateUser(
                userId = testUser.id!!,
                user = testUserRequest.copy(password = newPassword, passwordRepeat = newPassword),
            )
        }

        assertThat(exception.message).contains("Passwort ändern")
        verify(exactly = 0) { userDetailsManager.updateUser(any()) }
        verify(exactly = 0) { response.addCookie(any()) }
    }

    /** Editing another field on one's own account - without a password change - mints no cookie. */
    @Test
    fun `update user own account without a password change mints no cookie`() {
        every { userDetailsManager.loadUserById(any()) } returns testUser

        val authentication = TafelJwtAuthentication(
            tokenValue = "OLD-TOKEN",
            username = testUser.username,
            authorities = testUserPermissions.map { SimpleGrantedAuthority(it.key) },
            userId = testUser.id,
        )
        SecurityContextHolder.setContext(SecurityContextImpl(authentication))

        controller.updateUser(
            userId = testUser.id!!,
            user = testUserRequest.copy(firstname = "updated-firstname"),
        )

        verify(exactly = 0) { response.addCookie(any()) }
    }

    @Test
    fun `update user with passwords not matching`() {
        every { userDetailsManager.loadUserById(any()) } returns testUser

        val exception = assertThrows<BusinessRuleException> {
            controller.updateUser(
                userId = testUser.id!!,
                user = testUserRequest.copy(password = "123", passwordRepeat = "456"),
            )
        }

        assertThat(exception.statusCode).isEqualTo(HttpStatus.BAD_REQUEST)
        assertThat(exception.body.detail).isEqualTo("Passwörter stimmen nicht überein!")
    }

    /**
     * The update-time counterpart of `create user exists by personnelNumber` - without it,
     * `TafelUserDetailsManager.resolveEmployee` would re-link the edited user onto another account's
     * employee and overwrite its name (issue #3522).
     */
    @Test
    fun `update user exists by personnelNumber`() {
        every { userDetailsManager.loadUserById(any()) } returns testUser
        val otherUser = testUser.copy(id = 999)
        every { userDetailsManager.loadUserByPersonnelNumber(testUserRequest.personnelNumber) } returns otherUser

        val exception = assertThrows<ConflictException> {
            controller.updateUser(userId = testUser.id!!, user = testUserRequest)
        }

        assertThat(exception.body.detail).isEqualTo("Benutzer (Personalnummer: test-personnelnumber) existiert bereits!")
        verify(exactly = 0) { userDetailsManager.updateUser(any()) }
    }

    /** Keeping the same personnel number - i.e. the number already belongs to this very user - is fine. */
    @Test
    fun `update user keeping its own personnelNumber is allowed`() {
        every { userDetailsManager.loadUserById(any()) } returns testUser
        every { userDetailsManager.loadUserByPersonnelNumber(testUserRequest.personnelNumber) } returns testUser

        val response = controller.updateUser(userId = testUser.id!!, user = testUserRequest)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
    }

    @Test
    fun `delete user not found`() {
        every { userDetailsManager.loadUserById(any()) } returns null

        val exception =
            assertThrows<NotFoundException> { controller.deleteUser(userId = 123) }

        assertThat(exception.statusCode).isEqualTo(HttpStatus.NOT_FOUND)
        assertThat(exception.body.detail).isEqualTo("Benutzer (ID: 123) nicht vorhanden!")
    }

    @Test
    fun `delete user found`() {
        every { userDetailsManager.loadUserById(any()) } returns testUser

        val response = controller.deleteUser(userId = 123)

        assertThat(response.statusCode).isEqualTo(HttpStatus.NO_CONTENT)
        verify(exactly = 1) { userDetailsManager.deleteUser(testUser.username) }
    }

    @Test
    fun `get permissions`() {
        every { userDetailsManager.loadUserById(any()) } returns testUser

        val response = controller.getPermissions()

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)

        val permissions = response.body?.permissions

        // Every permission is offered, mapped key/title/category, and ordered by title - the order
        // the permission editor renders them in. Asserted against the enum rather than a literal
        // list so a newly added permission doesn't need this test edited, and by content rather
        // than by position, which the enum's own declaration order says nothing about.
        assertThat(permissions).hasSize(UserPermissions.entries.size)
        assertThat(permissions).containsExactlyElementsOf(
            UserPermissions.entries
                .sortedBy { it.title }
                .map { UserPermissionItem(key = it.key, title = it.title, category = it.category.title) },
        )
    }

    @Test
    fun `fetch login attempts as a page`() {
        val older = LoginAttemptItem(
            id = 1,
            username = "user1",
            failureCount = 1,
            lastFailureAt = LocalDate.of(2026, 1, 1).atStartOfDay(),
            lockedUntil = null,
        )
        val newer = LoginAttemptItem(
            id = 2,
            username = "user2",
            failureCount = 3,
            lastFailureAt = LocalDate.of(2026, 1, 2).atStartOfDay(),
            lockedUntil = LocalDate.of(2026, 1, 2).atStartOfDay().plusMinutes(15),
        )
        val pageRequest = PageRequest.of(0, PaginationDefaults.DEFAULT_PAGE_SIZE)
        val pagedResult = PageImpl(listOf(newer, older), pageRequest, 123)
        every { loginAttemptService.findAll(pageRequest, null, false) } returns pagedResult

        val response = controller.searchLoginAttempts(LoginAttemptSearchRequest())

        assertThat(response).isEqualTo(
            PagedResponse(
                items = listOf(newer, older),
                totalCount = 123,
                currentPage = 1,
                totalPages = pagedResult.totalPages,
                pageSize = PaginationDefaults.DEFAULT_PAGE_SIZE,
            ),
        )
    }

    @Test
    fun `fetch login attempts with explicit valid pageSize`() {
        val pageRequest = PageRequest.of(0, 25)
        every { loginAttemptService.findAll(pageRequest, null, false) } returns PageImpl(emptyList(), pageRequest, 0)

        val response = controller.searchLoginAttempts(LoginAttemptSearchRequest(page = 1, pageSize = 25))

        assertThat(response.pageSize).isEqualTo(25)
    }

    @Test
    fun `fetch login attempts with invalid pageSize falls back to default`() {
        val pageRequest = PageRequest.of(0, PaginationDefaults.DEFAULT_PAGE_SIZE)
        every { loginAttemptService.findAll(pageRequest, null, false) } returns PageImpl(emptyList(), pageRequest, 0)

        val response = controller.searchLoginAttempts(LoginAttemptSearchRequest(page = 1, pageSize = 7))

        assertThat(response.pageSize).isEqualTo(PaginationDefaults.DEFAULT_PAGE_SIZE)
    }

    @Test
    fun `fetch login attempts passes the username search and the locked-only filter on`() {
        val pageRequest = PageRequest.of(0, PaginationDefaults.DEFAULT_PAGE_SIZE)
        every { loginAttemptService.findAll(pageRequest, "hans", true) } returns PageImpl(emptyList(), pageRequest, 0)

        val response = controller.searchLoginAttempts(LoginAttemptSearchRequest(searchInput = "hans", lockedOnly = true))

        assertThat(response.totalCount).isEqualTo(0)
        verify(exactly = 1) { loginAttemptService.findAll(pageRequest, "hans", true) }
    }

    @Test
    fun `fetch login attempt settings`() {
        every { loginAttemptService.getSettings() } returns LoginAttemptSettingsResponse(maxFailures = 5, lockoutDurationInSeconds = 900)

        val response = controller.getLoginAttemptSettings()

        assertThat(response.statusCode.value()).isEqualTo(200)
        assertThat(response.body).isEqualTo(LoginAttemptSettingsResponse(maxFailures = 5, lockoutDurationInSeconds = 900))
    }

    @Test
    fun `delete login attempt`() {
        val response = controller.deleteLoginAttempt(42L)

        assertThat(response.statusCode.value()).isEqualTo(204)
        verify(exactly = 1) { loginAttemptService.deleteById(42L) }
    }
}
