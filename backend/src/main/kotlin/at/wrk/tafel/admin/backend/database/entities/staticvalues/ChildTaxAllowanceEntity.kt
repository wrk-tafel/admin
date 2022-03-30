package at.wrk.tafel.admin.backend.database.entities.staticvalues

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import javax.persistence.DiscriminatorValue
import javax.persistence.Entity

@Entity(name = "ChildTaxAllowance")
@DiscriminatorValue("CHILD-TAX-ALLOWANCE")
@ExcludeFromTestCoverage
class ChildTaxAllowanceEntity : StaticValueEntity()
