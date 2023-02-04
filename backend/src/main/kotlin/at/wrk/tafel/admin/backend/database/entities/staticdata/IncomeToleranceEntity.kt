package at.wrk.tafel.admin.backend.database.entities.staticdata

import jakarta.persistence.DiscriminatorValue
import jakarta.persistence.Entity
import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

@Entity(name = "IncomeTolerance")
@DiscriminatorValue("INCOME-TOLERANCE")
@ExcludeFromTestCoverage
class IncomeToleranceEntity : StaticValueEntity()
