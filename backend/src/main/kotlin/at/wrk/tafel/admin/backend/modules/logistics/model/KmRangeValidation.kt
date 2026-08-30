package at.wrk.tafel.admin.backend.modules.logistics.model

import jakarta.validation.Constraint
import jakarta.validation.ConstraintValidator
import jakarta.validation.ConstraintValidatorContext
import jakarta.validation.Payload
import kotlin.reflect.KClass

/**
 * `kmStart`/`kmEnd` are each only `@PositiveOrZero` on their own, so a typo in either one (e.g.
 * `120340` instead of `12034`) that still leaves both non-negative passes field validation even
 * though the resulting distance is nonsensical - see
 * [at.wrk.tafel.admin.backend.modules.distribution.internal.statistic.DistributionStatisticService]'s
 * `routesLengthKm`, which sums `kmEnd - kmStart` per route unchecked. A class-level constraint is
 * what can compare the two fields against each other; attached to `kmEnd` here (rather than left as
 * a global/object-level violation) so it surfaces the same way a field-level constraint would in
 * `GenericExceptionHandler.handleMethodArgumentNotValid`'s `fieldErrors`.
 */
@Target(AnnotationTarget.CLASS)
@Retention(AnnotationRetention.RUNTIME)
@MustBeDocumented
@Constraint(validatedBy = [KmEndNotBeforeKmStartValidator::class])
annotation class KmEndNotBeforeKmStart(
    val message: String = "kmEnde darf nicht kleiner als kmStart sein!",
    val groups: Array<KClass<*>> = [],
    val payload: Array<KClass<out Payload>> = [],
)

class KmEndNotBeforeKmStartValidator : ConstraintValidator<KmEndNotBeforeKmStart, FoodCollectionSaveKmRequest> {
    override fun isValid(value: FoodCollectionSaveKmRequest?, context: ConstraintValidatorContext): Boolean {
        if (value == null || value.kmEnd >= value.kmStart) {
            return true
        }

        context.disableDefaultConstraintViolation()
        context.buildConstraintViolationWithTemplate(context.defaultConstraintMessageTemplate)
            .addPropertyNode("kmEnd")
            .addConstraintViolation()
        return false
    }
}
