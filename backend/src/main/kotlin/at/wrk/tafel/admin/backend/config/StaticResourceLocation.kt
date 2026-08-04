package at.wrk.tafel.admin.backend.config

// Mirrors spring.web.resources.static-locations (file:${user.dir}/static/) in application.yml -
// shared so IndexHtmlController and WebMvcConfig can't drift apart on where the frontend build
// actually lives. Kept as a plain system property read rather than @Value, since this codebase's
// "no field injection" ArchUnit rule (GeneralCodingRulesTest) forbids @Value fields.
internal fun staticResourceLocation(): String = "file:${System.getProperty("user.dir")}/static/"
