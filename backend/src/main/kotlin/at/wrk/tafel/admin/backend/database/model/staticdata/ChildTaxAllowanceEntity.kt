package at.wrk.tafel.admin.backend.database.model.staticdata

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.persistence.DiscriminatorValue
import jakarta.persistence.Entity

@Entity(name = "ChildTaxAllowance")
@DiscriminatorValue("CHILD-TAX-ALLOWANCE")
@ExcludeFromTestCoverage
class ChildTaxAllowanceEntity : StaticValueEntity()
