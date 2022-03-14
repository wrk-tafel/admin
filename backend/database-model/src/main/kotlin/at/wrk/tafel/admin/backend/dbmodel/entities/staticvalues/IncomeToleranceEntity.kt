package at.wrk.tafel.admin.backend.dbmodel.entities.staticvalues

import javax.persistence.DiscriminatorValue
import javax.persistence.Entity

@Entity(name = "IncomeTolerance")
@DiscriminatorValue("INCOME-TOLERANCE")
class IncomeToleranceEntity : StaticValueEntity()
