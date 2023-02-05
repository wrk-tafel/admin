package at.wrk.tafel.admin.backend.database.entities.staticdata

import jakarta.persistence.DiscriminatorValue
import jakarta.persistence.Entity
import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

@Entity(name = "ChildTaxAllowance")
@DiscriminatorValue("CHILD-TAX-ALLOWANCE")
@ExcludeFromTestCoverage
class ChildTaxAllowanceEntity : StaticValueEntity()
