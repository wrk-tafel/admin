package at.wrk.tafel.admin.backend.database.entities.staticdata

import javax.persistence.DiscriminatorValue
import javax.persistence.Entity

@Entity(name = "ChildTaxAllowance")
@DiscriminatorValue("CHILD-TAX-ALLOWANCE")
class ChildTaxAllowanceEntity : StaticValueEntity()
