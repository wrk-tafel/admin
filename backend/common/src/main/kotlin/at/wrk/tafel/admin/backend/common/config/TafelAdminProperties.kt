package at.wrk.tafel.admin.backend.common.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.ConstructorBinding

@ConfigurationProperties(prefix = "tafeladmin")
@ConstructorBinding
class TafelAdminProperties
