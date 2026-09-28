package at.wrk.tafel.admin.backend.modules.notification

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

/**
 * Published when an administrator creates an announcement (not when one is edited), so `push` can
 * send it as a notification to the users who have that type switched on. The announcement itself
 * reaches every user's bell regardless.
 */
@ExcludeFromTestCoverage
data class AnnouncementPublishedEvent(
    val title: String,
    val message: String,
)
