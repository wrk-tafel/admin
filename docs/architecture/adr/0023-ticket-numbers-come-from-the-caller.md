# ADR-0023: Ticket numbers come from the caller; the backend only enforces uniqueness

**Status:** accepted · **Recorded:** 2026-08-09

## Context

During a distribution, each household gets a ticket number and is called up by it. The numbers come
from a **physical booklet of paper tickets** handed out at the door — that booklet is the artefact
the person in the queue actually holds, and the number on it is the one called from the ticket
screen.

So the number exists in the real world before the system ever hears about it. Whatever the backend
does, it cannot be the thing that decides which number a person has.

## Decision

**The check-in client sends the ticket number; the backend validates it and stores it.**

- `AssignHouseholdRequest(householdId, ticketNumber)` carries a number chosen by the caller.
- `DistributionService.assignHouseholdToDistribution()` enforces exactly one invariant: **a ticket
  number is unique within a distribution**. Assigning a number already held by a *different*
  household is rejected with a conflict.
- Re-submitting the same `(householdId, ticketNumber)` pair is explicitly allowed — it is how
  `costContributionPaid` gets flipped without an error.
- There is **no server-side range check**. The 1–999 range is a property of the paper booklet and the
  UI, not an enforced rule.
- Once assigned, the queue is walked in `ticketNumber` order using the `processed` flag:
  `closeCurrentTicketAndGetNext()` marks the current one processed and returns the next,
  `reopenAndGetPreviousTicket()` flips the last processed one back for "go back one".

## Consequences

- The paper ticket and the system always agree, because the paper ticket is the source. A generated
  number could differ from the one in someone's hand, which would be visible and confusing in front
  of the queue.
- Handing out tickets keeps working when the system does not — the booklet is independent, and
  check-ins can be entered afterwards.
- **Nothing prevents a gap, an out-of-order assignment or a number outside 1–999.** The backend's
  only guarantee is uniqueness within the distribution; everything else is the desk's discipline.
  Anyone reading ticket data must not assume a dense or ordered sequence.
- The idempotent re-submit is load-bearing for the cost-contribution flow, not a convenience. A
  future "reject duplicate assignment" tightening would break it.
- The client is trusted with a business value. That is acceptable here because the value is
  externally visible and the uniqueness check catches the one collision that matters, but it is a
  deliberate departure from "the server decides".

## Alternatives considered

**Generate the next number server-side.** The obvious design, and wrong here: it would produce a
number that has no relationship to the paper ticket the person is holding.

**Enforce the 1–999 range in the backend.** Rejected: the range is a property of the current booklet,
not of the domain. Encoding it would turn a change of stationery into a code change and a deploy.

**Reject any repeated assignment.** Rejected: re-sending the same pair is the mechanism used to
update the cost-contribution flag.

**Drop ticket numbers and call households by name.** Rejected as a domain question, not a technical
one — the ticket system is how the distribution is organised and how privacy in the hall is
maintained.

## References

- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/distribution/README.md` — "Ticket
  numbering"
- `modules/distribution/internal/DistributionService.kt`
- `modules/checkin/README.md`
</content>
