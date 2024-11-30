package at.wrk.tafel.admin.backend.database.model.staticdata

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.persistence.DiscriminatorValue
import jakarta.persistence.Entity

@Entity(name = "IncomeTolerance")
@DiscriminatorValue("INCOME-TOLERANCE")
@ExcludeFromTestCoverage
class IncomeToleranceEntity : StaticValueEntity()
