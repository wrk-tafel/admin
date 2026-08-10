package at.wrk.tafel.admin.backend.config.properties

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.util.unit.DataSize
import java.time.Duration

/**
 * Mutable, JavaBean-bound on purpose - that is what makes this application's configuration
 * reloadable at runtime (see [ConfigFileReloadService]).
 *
 * Spring Cloud's `ConfigurationPropertiesRebinder` re-binds the *existing* bean instance when the
 * environment changes, so every consumer that injected it keeps seeing current values without
 * knowing anything about reloading. That only works for setter binding: a Kotlin primary
 * constructor with parameters makes Spring Boot deduce value-object binding and produce an
 * instance that can only ever be replaced, never updated - which is why these classes declare a
 * no-arg constructor and their properties in the body rather than as constructor parameters.
 *
 * The trade-off is that a reload mutates fields other threads may be reading at that moment. A
 * reader can therefore briefly see one setting updated and another not (they are written one at a
 * time), and there is no happens-before edge guaranteeing it sees the new value on the very next
 * read. Both are inherent to how Spring Cloud refreshes configuration and are acceptable here:
 * reloads are operator-driven, seconds apart from anything that reads them, and every value is
 * re-read per request rather than cached.
 */
@ConfigurationProperties(prefix = "tafeladmin")
@ExcludeFromTestCoverage
class TafelAdminProperties {
    var version: String = "dev"
    var buildTime: String = "unknown"

    // Set per-deployment (e.g. "DEV", "TEST", empty for prod) alongside server.relativeBaseUrl -
    // dev/test/prod share one origin at different path prefixes, so without this the PWA install
    // title/manifest would look identical across all three (see #3027).
    var environmentLabel: String = ""

    var audit: TafelAdminAuditProperties = TafelAdminAuditProperties()
    var checkin: TafelAdminCheckinProperties = TafelAdminCheckinProperties()
    var distribution: TafelAdminDistributionProperties = TafelAdminDistributionProperties()
    var features: TafelAdminFeaturesProperties = TafelAdminFeaturesProperties()
    var mail: TafelAdminMailProperties? = null
    var mailOutbox: TafelAdminMailOutboxProperties = TafelAdminMailOutboxProperties()
    var server: TafelAdminServerProperties = TafelAdminServerProperties()
    var sse: TafelAdminSseProperties = TafelAdminSseProperties()
    var support: TafelAdminSupportProperties? = null
    var storage: TafelAdminStorageProperties = TafelAdminStorageProperties()
    var push: TafelAdminPushProperties? = null
    var pushDelivery: TafelAdminPushDeliveryProperties = TafelAdminPushDeliveryProperties()
    var search: TafelAdminSearchProperties = TafelAdminSearchProperties()
    var setup: TafelAdminSetupProperties = TafelAdminSetupProperties()
    var testdata: TafelAdminTestdataProperties = TafelAdminTestdataProperties()

    /**
     * Whether the scanner folder is available at all - the single rule both the backend
     * (`ScannerFileService`) and the frontend (via `ConfigController`) go by, so neither can decide
     * the feature is on while the other has it off.
     *
     * Lives here rather than on either section because it is the conjunction of both: the switch
     * ([TafelAdminFeaturesProperties.scannerFolderEnabled]) says whether this deployment should offer the
     * feature, the mount point ([TafelAdminStorageProperties.scannerPath]) says whether it *can*.
     *
     * Deliberately answered from configuration alone rather than by probing the filesystem: a share
     * that is momentarily unreachable should surface as an empty file list, not make the whole
     * feature disappear from the UI mid-shift.
     */
    val scannerFolderAvailable: Boolean
        get() = features.scannerFolderEnabled && !storage.scannerPath.isNullOrBlank()
}

/**
 * Switches for optional features, kept apart from the settings that configure them: whether a
 * deployment offers something is an operational decision an operator flips on its own, while
 * `storage`, `mail` and friends describe how the thing is wired up once it is on.
 */
@ExcludeFromTestCoverage
class TafelAdminFeaturesProperties {
    /**
     * Kill switch for the scanner-folder document picker, independent of whether
     * [TafelAdminStorageProperties.scannerPath] happens to be set: an environment that has the share
     * mounted but shouldn't offer the feature (or where the share is misbehaving and the
     * once-per-second poll needs to stop) can turn it off here without touching the mount
     * configuration. Defaults to true so environments with a `scannerPath` keep working unchanged;
     * with no `scannerPath` the feature is off either way.
     */
    var scannerFolderEnabled: Boolean = true
}

/**
 * The audit trail (`audit_log`) - see ADR-0039.
 *
 * Both values are read per use, so an operator can widen the retention window or switch recording
 * off on a running deployment (`ConfigFileReloadService`) - the latter being the point of having a
 * switch at all: if the listener ever misbehaves under load during a distribution, turning it off
 * must not need a restart.
 *
 * `tafeladmin.audit.cleanupCron` - when the retention job runs, default 05:00 daily - is deliberately
 * *not* a field here: `@Scheduled` fixes its expression at bean creation, so it is startup-only. It
 * lives in `application.yml` as a plain placeholder, same as `tafeladmin.configReload.interval`. See
 * `AuditRetentionService`.
 */
@ExcludeFromTestCoverage
class TafelAdminAuditProperties {
    var enabled: Boolean = true

    /**
     * How long a recorded change is kept. The log holds names, addresses and income figures of
     * people whose household may since have been deleted - precisely the data a deletion is meant to
     * remove - so the window is kept to what the trail is actually used for: answering "who changed
     * this, and what was it before" while the change is still being questioned. That is a matter of
     * days or weeks, not years, and a shorter window is the cheaper answer to the DSGVO question
     * than any amount of pseudonymisation.
     *
     * Raise it per deployment if a longer trail is genuinely needed; it is re-read per use, so a
     * change takes effect without a restart. Note that raising it does not bring back what has
     * already been deleted.
     *
     * Deleting a household deliberately does *not* purge its entries early - the DELETE entry, with
     * the last known values, is the single thing the old schema lost and this table exists for. They
     * age out on this clock like everything else.
     */
    var retentionDays: Long = 30
}

/**
 * Check-in via handheld scanners - see `ScannerService`.
 */
@ExcludeFromTestCoverage
class TafelAdminCheckinProperties {
    /**
     * How long a scanner registration survives without being refreshed. A scanner heartbeats while
     * it is in use, so this only has to outlast the gaps within a distribution day - long enough
     * that a scanner switched off over lunch keeps its id, short enough that ids freed by devices
     * put away for good are handed out again rather than pushing every new scanner to a higher
     * number.
     *
     * Read per use, so it can be widened on a running deployment: a cleanup that starts reclaiming
     * ids mid-distribution hands the scanners new ones (see `ScannerService.registerScanner`), and
     * waiting for a restart to stop that is not an option during an ongoing distribution.
     */
    var scannerRegistrationRetention: Duration = Duration.ofDays(2)
}

/**
 * The distribution module's operational tuning - see `DistributionEndedEventListener`.
 */
@ExcludeFromTestCoverage
class TafelAdminDistributionProperties {
    var closeRetry: TafelAdminDistributionCloseRetryProperties = TafelAdminDistributionCloseRetryProperties()
}

/**
 * How often the work that runs right after a distribution closes - the statistics snapshot and the
 * missing cost contributions, in one transaction - is retried before it is given up on.
 *
 * Both values are read per use (a fresh `RetryTemplate` is built for each event), so an operator can
 * give the retry more room while a distribution is being closed against a database that is
 * struggling - which is exactly the moment a restart is not available.
 */
@ExcludeFromTestCoverage
class TafelAdminDistributionCloseRetryProperties {
    /** Total attempts, including the first one. */
    var maxAttempts: Int = 3

    /** Waited between attempts, unchanged from one attempt to the next. */
    var backoff: Duration = Duration.ofSeconds(2)
}

/**
 * The server-sent-event streams the frontend keeps open (see `SseEmitterFactory`) and the outbox
 * rows behind them (`SseOutboxService`).
 *
 * All three are read per use, so a stream opened after a change carries the new settings without a
 * restart - streams already open keep what they were created with, since a timeout is fixed when the
 * emitter is built.
 */
@ExcludeFromTestCoverage
class TafelAdminSseProperties {
    /**
     * How long a stream is held open before the server ends it and the browser reconnects. Long
     * enough to span a whole distribution day without a reconnect, since every reconnect costs a
     * fresh request and a re-registration of the callback; not unlimited, so a stream nobody is on
     * the other end of is eventually released.
     */
    var timeout: Duration = Duration.ofHours(12)

    /**
     * Handed to the browser as the SSE `retry:` field - how long it waits before reconnecting after
     * the stream ends. Deliberately short: a dashboard that reconnects a second after a deploy is
     * what makes a restart invisible to whoever is looking at it.
     */
    var reconnectTime: Duration = Duration.ofSeconds(1)

    /**
     * How long a published event's `sse_outbox` row is kept. Only the first few minutes of that
     * window are read by anything - a reconnect replays at most
     * [SseOutboxListenerService.REPLAY_MAX_AGE] of it - so the rest is what a published event can
     * still be looked up in afterwards, at the cost of a table that grows with every dashboard
     * update. That trade is what this value sets.
     */
    var outboxRetention: Duration = Duration.ofDays(14)
}

@ExcludeFromTestCoverage
class TafelAdminSearchProperties {
    /**
     * How close a typed term has to come to a run of words in a household's or user's search text to
     * still count as a hit, between 0 (everything matches) and 1 (only a perfect match). Verbatim
     * substring hits are returned regardless of this value - it only governs the typo tolerance on
     * top.
     *
     * The right value depends on the actual data, so it is configuration rather than a constant:
     * too high and a mistyped name finds nothing, too low and every search returns half the
     * customers. 0.5 is a little more forgiving than `pg_trgm`'s own 0.6 default, which is about
     * where a single mistyped character in the middle of a name-length term stops being found - and
     * the cost of being wrong in that direction is low, since verbatim hits still rank above every
     * fuzzy one.
     */
    var similarityThreshold: Float = 0.5f
}

@ExcludeFromTestCoverage
class TafelAdminSetupProperties {
    var initialAdmin: TafelAdminInitialAdminProperties = TafelAdminInitialAdminProperties()
}

/**
 * The administrator account a brand-new installation is bootstrapped with, so an empty database can
 * be logged into and configured from the UI instead of needing a hand-written SQL insert. Only ever
 * applied to a database with no users at all - see `InitialAdminUserService`.
 *
 * Read once during startup by definition, so unlike most of this configuration, reloading it has no
 * meaning (same as [TafelAdminTestdataProperties.enabled]).
 */
@ExcludeFromTestCoverage
class TafelAdminInitialAdminProperties {
    var enabled: Boolean = true
    var username: String = "admin"

    /**
     * Left unset in every environment's configuration on purpose: with no password given, a random
     * one is generated and printed to the log once, which keeps this repository - and any config
     * file copied from it - free of a credential that would otherwise be the same on every
     * installation. Setting it is supported for an automated/unattended rollout that needs to know
     * the password up front; it must satisfy the same rules as any other password
     * (`WebSecurityConfig.passwordValidator`), and startup fails with those rules listed if it
     * doesn't.
     */
    var password: String? = null

    var personnelNumber: String = "00001"
    var firstname: String = "Tafel"
    var lastname: String = "Administrator"
}

@ExcludeFromTestCoverage
class TafelAdminTestdataProperties {
    /**
     * Wipes and re-creates the schema on startup so the `testdata` migrations can seed it from
     * scratch (`FlywayConfig`). Read once during startup by definition - Flyway has finished long
     * before anyone could edit the config file - so unlike the rest of this class, reloading it has
     * no meaning.
     */
    var enabled: Boolean = false
}

@ExcludeFromTestCoverage
class TafelAdminMailProperties {
    var from: String = ""
    var subjectPrefix: String? = null
    var defaultRecipientsBcc: List<String>? = emptyList()
}

/**
 * How the mail outbox delivers what `MailSenderService` queued - see ADR-0041 and `MailOutboxService`.
 *
 * All of these are read per use, so an operator can slow the retries down or drain a backlog faster
 * on a running deployment (`ConfigFileReloadService`). They are also the knobs worth having during an
 * incident: a mail server that is refusing connections is exactly when the defaults are wrong.
 *
 * `tafeladmin.mailOutbox.interval` - how often the poller looks, default 10s - is deliberately *not*
 * a field here: `@Scheduled` fixes its delay at bean creation, so it is startup-only. It lives in
 * `application.yml` as a plain placeholder, same as `tafeladmin.audit.cleanupCron`.
 */
@ExcludeFromTestCoverage
class TafelAdminMailOutboxProperties {
    /**
     * How many times delivery is attempted before the mail is parked as `FAILED` and reported. Not a
     * deadline: with the backoff below, five attempts span roughly half an hour, which covers a
     * restart of the mail server but not an outage somebody has to be told about.
     */
    var maxAttempts: Int = 5

    /** How many mails one poll takes on, oldest first. The rest wait for the next tick. */
    var batchSize: Int = 20

    /** Waited after the first failed attempt, and multiplied by the attempt count after that. */
    var retryBackoff: Duration = Duration.ofMinutes(5)

    /** Ceiling for the growing backoff, so a long outage still gets a regular retry. */
    var maxRetryBackoff: Duration = Duration.ofMinutes(30)

    /**
     * How long a sent mail's row is kept before the cleanup job deletes it. It is the record of what
     * this installation mailed out, including personal data in the attachments, so the window is the
     * span in which somebody still asks "did the report go out on Saturday?" - not an archive.
     * `FAILED` rows are never deleted by that job; they are the mails nobody received.
     */
    var sentRetention: Duration = Duration.ofDays(14)
}

@ExcludeFromTestCoverage
class TafelAdminServerProperties {
    var relativeBaseUrl: String = "/"

    /**
     * [relativeBaseUrl] with a guaranteed trailing slash - what anything building a URL *below* the
     * app's base has to use.
     *
     * Without one, the last path segment counts as a filename and gets replaced rather than
     * appended to: `"/verwaltung-dev" + "main.js"` resolves to `/main.js`, not
     * `/verwaltung-dev/main.js`. [relativeBaseUrl] historically only fed the JWT cookie path, where
     * that distinction doesn't matter, so not every environment's config carries the slash -
     * normalized here rather than relied upon from ops config.
     */
    val basePath: String
        get() = relativeBaseUrl.let { if (it.endsWith("/")) it else "$it/" }
}

@ExcludeFromTestCoverage
class TafelAdminSupportProperties {
    /**
     * Who an in-app support request is mailed to. Deployment-specific, so it stays empty here -
     * with no recipient the endpoint fails with a clear "not configured" message instead of
     * accepting a request nobody would ever read.
     *
     * The mail itself goes out through the same `spring.mail` server and `tafeladmin.mail.from`
     * address as every other mail this application sends; only the recipients are configured here
     * rather than in the UI, because support has to keep working when nobody can reach a screen to
     * fix it.
     */
    var recipients: List<String> = emptyList()

    /**
     * Put in front of the reported title to make up the subject of a support mail, so a report is
     * recognizable as one in a mailbox that also receives the automated mails. The value shipped in
     * `application.yml` is "Support:".
     *
     * Separate from [TafelAdminMailProperties.subjectPrefix], which marks *which environment* every
     * mail came from - both end up on the subject, the environment's first.
     */
    var subjectPrefix: String = ""
}

@ExcludeFromTestCoverage
class TafelAdminStorageProperties {
    var documentsPath: String = "documents"

    // Mount point for a NAS share a physical scanner writes to. Not every environment has one, so
    // this stays null unless explicitly set (same reasoning as TafelAdminSupportProperties.recipients).
    // Whether the feature is offered at all is TafelAdminProperties.scannerFolderAvailable.
    var scannerPath: String? = null

    /**
     * The largest document that may be attached to a household, and the *only* place that size is
     * configured: the servlet container's own multipart ceiling is derived from it with a fixed
     * headroom (`MultipartConfig`), so the request is never refused by the container before
     * `HouseholdDocumentService` can turn it into a readable error.
     *
     * The check itself re-reads this per upload, so lowering the limit takes effect on a running
     * deployment. Raising it takes effect up to the ceiling the container was built with at startup;
     * beyond that the upload is refused by the container instead, so a raise past the previous
     * headroom needs a restart to be fully effective.
     */
    var maxDocumentSize: DataSize = DataSize.ofMegabytes(25)

    /**
     * How long an unreferenced file in the documents folder is left alone before the cleanup deletes
     * it. A file is written to disk before its database row is committed, so anything younger than
     * this may still belong to an upload in flight - the window is what keeps the cleanup from
     * deleting a document out from under the request creating it, not a grace period for anything
     * else.
     */
    var orphanedFileMinAge: Duration = Duration.ofMinutes(60)
}

@ExcludeFromTestCoverage
class TafelAdminPushProperties {
    // A VAPID keypair identifies this server to browser push services. Both values must be the
    // RAW key material, base64url-encoded (NOT the PEM file's own base64, which wraps DER/ASN.1
    // structure around the raw bytes and will fail to decode). Generate and extract with:
    //
    //   openssl ecparam -name prime256v1 -genkey -noout -out vapid.pem
    //   openssl ec -in vapid.pem -pubout -outform DER | tail -c 65 | base64 -w 0 | tr '+/' '-_' | tr -d '='; echo          # -> vapidPublicKey (65 raw bytes, 0x04-prefixed uncompressed point)
    //   openssl ec -in vapid.pem -outform DER | tail -c +8 | head -c 32 | base64 -w 0 | tr '+/' '-_' | tr -d '='; echo     # -> vapidPrivateKey (32 raw bytes)
    //   rm vapid.pem                                                                                                      # both values are now in the config - don't leave the key material on disk
    //
    // (`base64 -w 0` disables line-wrapping so the output is a single line, easy to copy-paste as
    // one value - GNU coreutils' base64 defaults to wrapping at 76 characters otherwise, and with
    // -w 0 it also drops the trailing newline, so the trailing `; echo` just restores a clean
    // shell prompt on its own line afterward - it has no effect on the copied value itself.)
    //
    // Key material, so not set here on purpose - only mounted in prod via /app/config/config.yml.
    var vapidPublicKey: String? = null
    var vapidPrivateKey: String? = null

    // Contact address browser push services may use to reach the sender, per RFC 8292 - a mailto:
    // URI or an https: URL. Not defaulted since it must be a real, reachable contact.
    var vapidSubject: String? = null
}

/**
 * How a Web Push message asks the browser's push service to deliver it - see `WebPushSenderService`.
 *
 * Kept out of [TafelAdminPushProperties] on purpose, for the same reason `mailOutbox` sits next to
 * `mail` rather than inside it: that section holds key material and is absent unless a deployment
 * configures it, and giving these two defaults underneath it would make it exist everywhere.
 *
 * Both are read per send, so a delivery that is arriving late or not at all can be re-tuned while
 * the distribution it is about is still running.
 */
@ExcludeFromTestCoverage
class TafelAdminPushDeliveryProperties {
    /**
     * How long the push service may hold a message for a device that is currently offline. Roughly
     * the span of a distribution day (about 12:00-24:00, with the "started"/"closed" alerts at
     * either end): long enough that a phone merely asleep or out of signal for a few hours still
     * gets told about the distribution the notification is actually about, short enough that it
     * can't resurface the next day when it means nothing.
     */
    var ttl: Duration = Duration.ofHours(12)

    /**
     * The RFC 8030 `Urgency` of every message this application sends. Without one the push service
     * applies `normal`, and FCM defers normal-urgency messages to the next maintenance window while
     * the device is in Doze - so they only surface once something else wakes the device (typically
     * the user opening the app). `high` is what tells FCM to deliver immediately, which is the whole
     * point of an "Ausgabe gestartet" alert; lowering it is the knob for a deployment whose users
     * would rather have the battery.
     */
    var urgency: String = "high"
}
