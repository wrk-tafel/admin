package at.wrk.tafel.admin.backend.dbmodel.entities.staticdata.values

import javax.persistence.DiscriminatorValue
import javax.persistence.Entity

@Entity(name = "IncomeTolerance")
@DiscriminatorValue("INCOME-TOLERANCE")
class IncomeToleranceEntity : StaticValueEntity()
