package at.wrk.tafel.admin.backend.dbmodel.entities.staticvalues

import javax.persistence.DiscriminatorValue
import javax.persistence.Entity

@Entity(name = "ChildTaxAllowance")
@DiscriminatorValue("CHILD-TAX-ALLOWANCE")
class ChildTaxAllowanceEntity : StaticValueEntity()
