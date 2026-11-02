package at.wrk.tafel.admin.backend.database.model.household

import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import jakarta.persistence.Tuple
import org.hibernate.query.criteria.HibernateCriteriaBuilder
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.domain.Specification

fun interface HouseholdPageRepository {

    /**
     * What `findAll(spec, pageable)` answers, in one statement rather than a page plus a separate
     * `count` with the same predicate: the customer search's predicate is the expensive part of both,
     * so `count(*) over ()` computes it once (ADR-0078).
     *
     * A page past the last result has no row to carry the total, so only that case takes a second
     * statement.
     */
    fun findPageWithTotal(spec: Specification<HouseholdEntity>, pageable: Pageable): Page<HouseholdEntity>
}

class HouseholdPageRepositoryImpl : HouseholdPageRepository {

    @PersistenceContext
    private lateinit var entityManager: EntityManager

    override fun findPageWithTotal(spec: Specification<HouseholdEntity>, pageable: Pageable): Page<HouseholdEntity> {
        val cb = entityManager.criteriaBuilder as HibernateCriteriaBuilder
        val query = cb.createTupleQuery()
        val root = query.from(HouseholdEntity::class.java)
        spec.toPredicate(root, query, cb)?.let { query.where(it) }
        query.select(cb.tuple(root, cb.count(root.get<Long>("id"), cb.createWindow())))

        val rows: List<Tuple> = entityManager.createQuery(query)
            .setFirstResult(pageable.offset.toInt())
            .setMaxResults(pageable.pageSize)
            .resultList

        val total = rows.firstOrNull()?.get(1, java.lang.Long::class.java)?.toLong()
            ?: if (pageable.offset == 0L) 0L else count(spec, cb)

        return PageImpl(rows.map { it.get(0, HouseholdEntity::class.java) }, pageable, total)
    }

    private fun count(spec: Specification<HouseholdEntity>, cb: HibernateCriteriaBuilder): Long {
        val query = cb.createQuery(Long::class.javaObjectType)
        val root = query.from(HouseholdEntity::class.java)
        spec.toPredicate(root, query, cb)?.let { query.where(it) }
        // the specification sets the order of the page, which an aggregate can't be sorted by
        query.orderBy(emptyList())
        query.select(cb.count(root))
        return entityManager.createQuery(query).singleResult
    }
}
