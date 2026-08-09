package at.wrk.tafel.admin.backend.config.properties

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.boot.context.properties.ConfigurationProperties

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

    var features: TafelAdminFeaturesProperties = TafelAdminFeaturesProperties()
    var mail: TafelAdminMailProperties? = null
    var password: TafelAdminPasswordProperties = TafelAdminPasswordProperties()
    var server: TafelAdminServerProperties = TafelAdminServerProperties()
    var support: TafelAdminSupportProperties? = null
    var storage: TafelAdminStorageProperties = TafelAdminStorageProperties()
    var push: TafelAdminPushProperties? = null
    var search: TafelAdminSearchProperties = TafelAdminSearchProperties()
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
 * What a user's password has to satisfy - the installation's own policy, expressed as configuration
 * rather than constants, since the deployments running this application don't agree on how long a
 * password has to be or what may not appear in it. Enforced by `TafelPasswordValidator` and
 * described to the frontend through `/api/config`, so the password-change screen states exactly the
 * rules the backend applies. Read per validation, so an operator's edit takes effect without a
 * restart.
 *
 * Every Passay rule that can be decided from the password and the username alone is configurable
 * here. Two of Passay's rules are deliberately absent because there is nothing to configure them
 * against:
 * - `HistoryRule`/`SourceRule` (and their digest variants) compare against a user's previous or
 *   other-system passwords, which this application does not store - only the current Argon2 hash.
 * - `LengthComplexityRule` is not a rule of its own but a container that applies *other* rules per
 *   password-length interval; configuring it would mean nesting this whole class once per interval.
 *
 * Defaults here reproduce what the application enforced before any of this was configurable: a
 * length range, no username, no whitespace, and whatever `dictionary.forbiddenWords` names.
 */
@ExcludeFromTestCoverage
class TafelAdminPasswordProperties {
    /** `LengthRule`. */
    var minLength: Int = 8
    var maxLength: Int = 50

    /**
     * Which language's letters count as lower/upper case and as an alphabetical run - Passay ships a
     * character and sequence set per language, and the German one is what matches the users of this
     * application (ä/ö/ü/ß are letters, and the keyboard is a QWERTZ one).
     */
    var alphabet: PasswordAlphabet = PasswordAlphabet.GERMAN

    var characters: TafelAdminPasswordCharactersProperties = TafelAdminPasswordCharactersProperties()
    var username: TafelAdminPasswordUsernameProperties = TafelAdminPasswordUsernameProperties()
    var whitespace: TafelAdminPasswordWhitespaceProperties = TafelAdminPasswordWhitespaceProperties()
    var dictionary: TafelAdminPasswordDictionaryProperties = TafelAdminPasswordDictionaryProperties()
    var sequences: TafelAdminPasswordSequencesProperties = TafelAdminPasswordSequencesProperties()
    var repeatedCharacters: TafelAdminPasswordRepeatedCharactersProperties = TafelAdminPasswordRepeatedCharactersProperties()

    /** `CharacterOccurrencesRule`: how often the same character may appear. 0 switches it off. */
    var maxCharacterOccurrences: Int = 0

    /** `AllowedCharacterRule`: if set, the password may consist of these characters only. */
    var allowedCharacters: String? = null

    /** `IllegalCharacterRule`: characters the password may not contain at all. */
    var illegalCharacters: String? = null

    /** `AllowedRegexRule`: every pattern here must match the password. */
    var allowedPatterns: List<String> = emptyList()

    /** `IllegalRegexRule`: no pattern here may match the password. */
    var illegalPatterns: List<String> = emptyList()

    /**
     * `NumberRangeRule`: numbers the password may not contain, e.g. `1900`-`2100` to keep birth
     * years out of it.
     */
    var illegalNumberRanges: List<TafelAdminPasswordNumberRangeProperties> = emptyList()
}

/**
 * `CharacterRule` per character class, and `CharacterCharacteristicsRule` on top of them via
 * [minTypes]. A minimum of 0 means that class isn't required at all.
 */
@ExcludeFromTestCoverage
class TafelAdminPasswordCharactersProperties {
    var minLowerCase: Int = 0
    var minUpperCase: Int = 0
    var minDigits: Int = 0
    var minSpecial: Int = 0
    var minAlphabetical: Int = 0

    /** Which characters count as special - see Passay's `EnglishCharacterData`. */
    var specialCharacters: PasswordSpecialCharacters = PasswordSpecialCharacters.ANY

    /**
     * How many of the classes configured above have to be satisfied, rather than all of them: the
     * usual "at least 3 of lower case / upper case / digits / special" policy. 0 - the default -
     * requires every configured minimum to be met. A value above the number of configured classes
     * would make every password fail, so it is capped at that number.
     */
    var minTypes: Int = 0
}

/** `UsernameRule`. Defaults match Passay's own: case-sensitive, forwards only, anywhere in the password. */
@ExcludeFromTestCoverage
class TafelAdminPasswordUsernameProperties {
    var enabled: Boolean = true
    var ignoreCase: Boolean = false
    var matchBackwards: Boolean = false
    var matchBehavior: PasswordMatchBehavior = PasswordMatchBehavior.CONTAINS
}

/** `WhitespaceRule` - tab, line feed, vertical tab, form feed, carriage return and space. */
@ExcludeFromTestCoverage
class TafelAdminPasswordWhitespaceProperties {
    var enabled: Boolean = true
    var matchBehavior: PasswordMatchBehavior = PasswordMatchBehavior.CONTAINS
}

/**
 * The two dictionary rules: [forbiddenWords] is `DictionarySubstringRule` (the word may not appear
 * anywhere in the password), [forbiddenPasswords] is `DictionaryRule` (the password may not *be* one
 * of these). Both empty - the default here - means neither rule is applied at all; the list this
 * deployment actually uses is in `application.yml`, since it names this organisation rather than
 * anything inherent to the application.
 */
@ExcludeFromTestCoverage
class TafelAdminPasswordDictionaryProperties {
    var forbiddenWords: List<String> = emptyList()
    var forbiddenPasswords: List<String> = emptyList()
    var ignoreCase: Boolean = true
    var matchBackwards: Boolean = false
}

/**
 * `IllegalSequenceRule` per kind of run. The alphabetical and keyboard sequences follow
 * [TafelAdminPasswordProperties.alphabet]; note that Passay only ships keyboard data for English
 * (QWERTY) and German (QWERTZ), so [keyboard] has no effect under the other alphabets.
 */
@ExcludeFromTestCoverage
class TafelAdminPasswordSequencesProperties {
    var alphabetical: TafelAdminPasswordSequenceProperties = TafelAdminPasswordSequenceProperties()
    var numerical: TafelAdminPasswordSequenceProperties = TafelAdminPasswordSequenceProperties()
    var keyboard: TafelAdminPasswordSequenceProperties = TafelAdminPasswordSequenceProperties()
}

@ExcludeFromTestCoverage
class TafelAdminPasswordSequenceProperties {
    var enabled: Boolean = false

    /** How many characters in a row make a sequence. Passay refuses anything below 3. */
    var length: Int = 5

    /** Whether a sequence may wrap around the end of the alphabet, e.g. `xyzab`. */
    var wrap: Boolean = false
}

/** `RepeatCharactersRule`: [sequenceCount] runs of [length] identical characters are already too many. */
@ExcludeFromTestCoverage
class TafelAdminPasswordRepeatedCharactersProperties {
    var enabled: Boolean = false
    var length: Int = 5
    var sequenceCount: Int = 1
}

@ExcludeFromTestCoverage
class TafelAdminPasswordNumberRangeProperties {
    var lower: Int = 0
    var upper: Int = 0
    var matchBehavior: PasswordMatchBehavior = PasswordMatchBehavior.CONTAINS
}

/**
 * Where in the password a match counts. Mirrors Passay's `MatchBehavior`, declared here so the
 * configuration binds to names in this application's own casing rather than to a library enum.
 */
enum class PasswordMatchBehavior {
    CONTAINS,
    STARTS_WITH,
    ENDS_WITH,
}

/** The language whose character and sequence data Passay should use. */
enum class PasswordAlphabet {
    ENGLISH,
    GERMAN,
    CZECH,
    POLISH,
    CYRILLIC,
    CYRILLIC_MODERN,
}

/** Which set of special characters `characters.minSpecial` counts. */
enum class PasswordSpecialCharacters {
    ANY,
    ASCII,
    LATIN,
    UNICODE,
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
    // Personal access token (Issues: Read and write) for creating support-request issues via the
    // GitHub REST API. Not set here on purpose - only mounted in prod via /app/config/config.yml.
    var githubToken: String? = null

    var githubRepository: String = ""

    // Prepended to every issue title so it's obvious which environment a support request came from.
    var titlePrefix: String = ""
}

@ExcludeFromTestCoverage
class TafelAdminStorageProperties {
    var documentsPath: String = "documents"

    // Mount point for a NAS share a physical scanner writes to. Not every environment has one, so
    // this stays null unless explicitly set (same reasoning as TafelAdminSupportProperties.githubToken).
    // Whether the feature is offered at all is TafelAdminProperties.scannerFolderAvailable.
    var scannerPath: String? = null
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
    // Not set here on purpose - only mounted in prod via /app/config/config.yml (same reasoning
    // as TafelAdminSupportProperties.githubToken).
    var vapidPublicKey: String? = null
    var vapidPrivateKey: String? = null

    // Contact address browser push services may use to reach the sender, per RFC 8292 - a mailto:
    // URI or an https: URL. Not defaulted since it must be a real, reachable contact.
    var vapidSubject: String? = null
}
