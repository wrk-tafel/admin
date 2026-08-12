package at.wrk.tafel.admin.backend.modules.reporting.internal.statisticexporter

import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import java.time.LocalDate

/**
 * The household's members other than its main person, as they were on [referenceDate] - a person
 * born after that day is left out.
 *
 * The point-in-time exporters read a distribution's households as they are *now*; nothing snapshots
 * a household's members per distribution. So a household that has grown since - a child born after
 * that day, most of all - would otherwise be reported with people who were not part of it back then,
 * and [AgeDistributionExporter] would ask [AgeRange.fromAge] to bucket their negative age, which it
 * rejects.
 *
 * A member whose birth date is unknown is kept: not knowing when someone was born is no evidence
 * that they were not there yet.
 */
internal fun HouseholdEntity.additionalPersonsAsOf(referenceDate: LocalDate): List<PersonEntity> = additionalPersons().filterNot { it.birthDate?.isAfter(referenceDate) == true }
