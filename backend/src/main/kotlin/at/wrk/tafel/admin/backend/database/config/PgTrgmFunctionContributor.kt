package at.wrk.tafel.admin.backend.database.config

import org.hibernate.boot.model.FunctionContributions
import org.hibernate.boot.model.FunctionContributor
import org.hibernate.type.StandardBasicTypes

/**
 * Makes PostgreSQL's `pg_trgm` strict word similarity callable from HQL and the Criteria API: the
 * `<<%` operator the fuzzy search filters with, under the name [STRICT_WORD_SIMILAR], and the
 * `strict_word_similarity(text, text)` function it ranks by. See `SearchTextSpecs` for why they are
 * two different things.
 *
 * Hibernate only resolves function names it knows about, and no dialect registers the `pg_trgm`
 * contrib functions - hence this contributor, discovered via
 * `META-INF/services/org.hibernate.boot.model.FunctionContributor`.
 */
class PgTrgmFunctionContributor : FunctionContributor {

    companion object {
        const val STRICT_WORD_SIMILARITY = "strict_word_similarity"
        const val STRICT_WORD_SIMILAR = "strict_word_similar"
    }

    override fun contributeFunctions(functionContributions: FunctionContributions) {
        val types = functionContributions.typeConfiguration.basicTypeRegistry
        functionContributions.functionRegistry.registerPattern(
            STRICT_WORD_SIMILARITY,
            "strict_word_similarity(?1, ?2)",
            types.resolve(StandardBasicTypes.FLOAT),
        )
        functionContributions.functionRegistry.registerPattern(
            STRICT_WORD_SIMILAR,
            "(?1 <<% ?2)",
            types.resolve(StandardBasicTypes.BOOLEAN),
        )
    }
}
