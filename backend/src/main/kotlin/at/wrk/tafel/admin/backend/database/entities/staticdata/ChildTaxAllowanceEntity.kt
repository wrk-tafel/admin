package at.wrk.tafel.admin.backend.database.entities.staticdata

import jakarta.persistence.DiscriminatorValue
import jakarta.persistence.Entity

@Entity(name = "ChildTaxAllowance")
@DiscriminatorValue("CHILD-TAX-ALLOWANCE")
class ChildTaxAllowanceEntity : StaticValueEntity()
