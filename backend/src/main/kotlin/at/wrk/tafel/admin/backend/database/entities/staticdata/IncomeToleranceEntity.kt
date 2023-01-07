package at.wrk.tafel.admin.backend.database.entities.staticdata

import jakarta.persistence.DiscriminatorValue
import jakarta.persistence.Entity

@Entity(name = "IncomeTolerance")
@DiscriminatorValue("INCOME-TOLERANCE")
class IncomeToleranceEntity : StaticValueEntity()
