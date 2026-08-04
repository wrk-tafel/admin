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

### AdvisoryLockRepository
Spring Data JPA repository providing native query methods for PostgreSQL advisory lock functions.

### AdvisoryLockService
Service providing high-level methods to acquire and release advisory locks using the repository.

## Usage

### Basic Lock Usage (`withLock`)

Blocks until the lock is acquired, always releases it afterwards (even on exception), and
returns the block's result:

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
acquired the lock, ran the block, and released it. Real usage from `DistributionService`:

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

```kotlin
@Transactional
fun manualLockOperation() {
    advisoryLockService.acquireLock(AdvisoryLockKey.PATCH_FOOD_COLLECTION_ITEM)
    try {
        doOperation()
    } finally {
        advisoryLockService.releaseLock(AdvisoryLockKey.PATCH_FOOD_COLLECTION_ITEM)
    }
}
```

There is also a non-blocking variant of manual acquisition, `tryAcquireLock(lockKey): Boolean`,
which `tryWithLock` is built on top of.

## Lock Types

The service uses two types of PostgreSQL advisory locks:

1. **Transaction-level locks** (`pg_advisory_xact_lock`): Automatically released at transaction end
2. **Session-level locks** (`pg_advisory_lock`/`pg_advisory_unlock`): Manually released

This implementation primarily uses transaction-level locks (`xact`) for safety, as they are automatically released when the transaction commits or rolls back.

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
    MY_NEW_LOCK(6000L), // Add new lock key here - existing keys are spaced 1000 apart by convention
}
```

## Best Practices

1. **Always use within @Transactional context** - Advisory locks are most effective when tied to transactions
2. **Use descriptive lock keys** - Each lock should represent a specific resource or operation
3. **Prefer `withLock()` over manual lock management** - Ensures locks are always released
4. **Keep critical sections small** - Only lock the minimum code necessary
5. **Document lock usage** - Comment why a specific lock is needed in your service

## Technical Details

- Lock IDs must be unique across the application
- Locks are connection/transaction-scoped
- Different lock keys can be held simultaneously
- Same lock key cannot be acquired twice in the same transaction
- Transaction-level locks are automatically released on COMMIT or ROLLBACK
