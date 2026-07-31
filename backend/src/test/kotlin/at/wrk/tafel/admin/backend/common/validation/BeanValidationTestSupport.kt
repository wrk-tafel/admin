package at.wrk.tafel.admin.backend.common.validation

import jakarta.validation.Validation
import jakarta.validation.Validator

object BeanValidationTestSupport {
    val validator: Validator = Validation.buildDefaultValidatorFactory().validator
}
