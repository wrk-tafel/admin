# PostgreSQL Advisory Lock Service

This module provides a service for using PostgreSQL advisory locks to ensure mutual exclusion across transactions and database connections.

## Components

### AdvisoryLockKey
Enum defining all available lock keys in the system. Each key has a unique numeric ID.

Available lock keys:
- `CREATE_DISTRIBUTION` (1000L) - For creating new distribution events
- `CLOSE_DISTRIBUTION` (2000L) - For closing distribution events
- `LOGIN_ATTEMPT_TRACKING` (3000L) - Serializes concurrent login-failure updates across instances
- `PATCH_FOOD_COLLECTION_ITEM` (4000L) - Serializes read-modify-write updates to a food collection's items to avoid duplicate-key races when multiple patches for the same route/shop overlap
- `SCANNER_REGISTRATION` (5000L) - Serializes scanner registration's gap-filling scanner-id lookup to avoid two concurrent registrations computing and inserting the same id
- `SAVE_FOOD_COLLECTION_RETURN_ITEMS` (6000L) - Serializes the per-shop replace of a food collection's free-text return items, whose whole element collection is rewritten on every save
- `REGISTER_PUSH_SUBSCRIPTION` (7000L) - Serializes the upsert-by-endpoint of a push subscription, whose check-then-act would otherwise let overlapping registrations of one endpoint collide on its UNIQUE constraint

### AdvisoryLockRepository
Spring Data JPA repository providing native query methods for PostgreSQL advisory lock functions.

### AdvisoryLockService
Service providing high-level methods to acquire advisory locks using the repository.

## Lock Lifetime

Every lock taken here is a **transaction-level** lock (`pg_advisory_xact_lock` /
`pg_try_advisory_xact_lock`), which PostgreSQL releases by itself when the transaction commits or
rolls back. Nothing releases a lock explicitly, and there is no `releaseLock` - `pg_advisory_unlock`
only releases *session*-level locks, so calling it for these locks would release nothing and make
the server log `you don't own a lock of type ExclusiveLock` on every locked operation.

Two consequences worth knowing before locking:

- **A transaction is required.** Every method here is `@Transactional`, so a caller without a
  transaction gets one for the duration of the call.
- **The outermost transaction owns the lock.** When the caller is already transactional, the lock is
  held until *that* transaction ends, not until the locked block returns. Lock as late as possible in
  a long transaction, and keep the transaction itself short.

## Not for scheduled jobs

These locks serialize a short critical section inside a transaction that was going to exist anyway.
They are the wrong tool for running a `@Scheduled` job once per cluster, and that is not a style
preference:

- Holding one for a job's duration means holding a transaction, and therefore a pooled connection,
  for that duration. Hikari's `leak-detection-threshold` is 60s, so anything slower logs a warning
  with a stack trace on every run - and the transaction pins the vacuum horizon while the job does
  no database work at all.
- The lock lives on a TCP connection. If that connection drops, Postgres releases the lock while the
  job thread carries on, and a second instance starts the same work.
- `tryWithLock` answers "is someone doing this right now?". A daily job's actual risk is two
  instances firing seconds apart, each finding the lock free - which mutual exclusion does not cover.

A job that works through rows claims them with `FOR UPDATE SKIP LOCKED` instead; one with no rows of
its own uses `@SchedulerLock` (see `config/SchedulerLockConfig.kt`). ADR-0047 has the full reasoning.

## Usage

### Basic Lock Usage (`withLock`)

Blocks until the lock is acquired and returns the block's result:

```kotlin
@Service
class MyService(
    private val advisoryLockService: AdvisoryLockService
) {

    @Transactional
    fun criticalOperation(): SomeResult {
        return advisoryLockService.withLock(AdvisoryLockKey.CREATE_DISTRIBUTION) {
            // Critical section - only one transaction can execute this at a time
            doSomethingCritical()
        }
    }
}
```

### Try-Lock Pattern (`tryWithLock`)

Never blocks: returns `false` immediately if the lock is already held elsewhere, `true` if it
acquired the lock and ran the block. Real usage from `DistributionService`:

```kotlin
@Transactional
fun createNewDistribution(): DistributionEntity {
    var result: DistributionEntity? = null

    val acquired = advisoryLockService.tryWithLock(AdvisoryLockKey.CREATE_DISTRIBUTION) {
        val currentDistribution = distributionRepository.getCurrentDistribution()
        if (currentDistribution != null) {
            throw ConflictException("Ausgabe bereits gestartet!")
        }
        result = /* ... create and save the distribution ... */
    }

    if (!acquired) {
        throw ConflictException("Ausgabe wird bereits erstellt!")
    }
    return result!!
}
```

Note `tryWithLock`'s block returns `Unit`, not a value - assign to an outer `var` (as above) to
get a result out of it, unlike `withLock` which returns the block's value directly.

### Manual Lock Management

`acquireLock(lockKey)` takes the lock for the rest of the current transaction, without a block:

```kotlin
@Transactional
fun manualLockOperation() {
    advisoryLockService.acquireLock(AdvisoryLockKey.PATCH_FOOD_COLLECTION_ITEM)
    doOperation()
    // the lock is released when this transaction ends - there is nothing to call
}
```

There is also a non-blocking variant of manual acquisition, `tryAcquireLock(lockKey): Boolean`,
which `tryWithLock` is built on top of.

## Adding New Lock Keys

To add a new lock key:

1. Add a new entry to the `AdvisoryLockKey` enum with a unique ID
2. Document the purpose of the lock key
3. Use the lock key in your service method

```kotlin
enum class AdvisoryLockKey(val lockId: Long) {
    CREATE_DISTRIBUTION(1000L),
    CLOSE_DISTRIBUTION(2000L),
    LOGIN_ATTEMPT_TRACKING(3000L),
    PATCH_FOOD_COLLECTION_ITEM(4000L),
    SCANNER_REGISTRATION(5000L),
    SAVE_FOOD_COLLECTION_RETURN_ITEMS(6000L),
    REGISTER_PUSH_SUBSCRIPTION(7000L),
    MY_NEW_LOCK(8000L), // Add new lock key here - existing keys are spaced 1000 apart by convention
}
```

## Best Practices

1. **Use descriptive lock keys** - Each lock should represent a specific resource or operation
2. **Prefer `withLock()` over manual lock management** - Makes the critical section explicit
3. **Keep the locking transaction short** - The lock is held until the transaction ends, so a long
   transaction blocks everyone else for just as long
4. **Document lock usage** - Comment why a specific lock is needed in your service

## Technical Details

- Lock IDs must be unique across the application
- Locks are transaction-scoped
- Different lock keys can be held simultaneously
- Acquiring the same lock key twice in the same transaction succeeds - advisory locks are re-entrant
- Locks are released on COMMIT or ROLLBACK, never explicitly
