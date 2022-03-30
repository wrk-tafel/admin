package at.wrk.tafel.admin.backend.database.entities.staticvalues

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import javax.persistence.DiscriminatorValue
import javax.persistence.Entity

@Entity(name = "IncomeTolerance")
@DiscriminatorValue("INCOME-TOLERANCE")
@ExcludeFromTestCoverage
class IncomeToleranceEntity : StaticValueEntity()
