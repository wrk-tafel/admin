package at.wrk.tafel.admin.backend.common

/**
 * Strips CR/LF from a value taken from an incoming request (URI, header, ...) before it goes into
 * a log line. Without this, an attacker can smuggle a forged log line - e.g. a fake
 * `... WARN ... Login successful ...` entry - into a request path or header, made to look like a
 * separate, legitimate log entry once a newline splits it apart (CWE-117 log injection). Flagged by
 * SonarCloud's `kotlinsecurity:S5145` on [at.wrk.tafel.admin.backend.modules.base.exception.GenericExceptionHandler]
 * and applied the same way in [at.wrk.tafel.admin.backend.common.auth.components.TafelAccessDeniedHandler],
 * both of which log request data on an access-denied path that is, by definition, reachable by
 * anyone who can send a request at all.
 */
fun sanitizeForLog(value: String?): String = value?.replace(Regex("[\r\n]"), "_") ?: "?"
