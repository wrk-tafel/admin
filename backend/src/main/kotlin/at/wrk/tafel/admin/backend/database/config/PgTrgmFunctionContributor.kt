package at.wrk.tafel.admin.backend.database.config

import org.hibernate.boot.model.FunctionContributions
import org.hibernate.boot.model.FunctionContributor
import org.hibernate.type.StandardBasicTypes

/**
 * Makes PostgreSQL's `pg_trgm` `strict_word_similarity(text, text)` callable from HQL and the
 * Criteria API (`cb.function("strict_word_similarity", ...)`), which the fuzzy search on households
 * and users needs both to filter and to rank by.
 *
 * Hibernate only resolves function names it knows about, and no dialect registers the `pg_trgm`
 * contrib functions - hence this contributor, discovered via
 * `META-INF/services/org.hibernate.boot.model.FunctionContributor`.
 */
class PgTrgmFunctionContributor : FunctionContributor {

    override fun contributeFunctions(functionContributions: FunctionContributions) {
        functionContributions.functionRegistry.registerPattern(
            "strict_word_similarity",
            "strict_word_similarity(?1, ?2)",
            functionContributions.typeConfiguration.basicTypeRegistry.resolve(StandardBasicTypes.FLOAT),
        )
    }
}
