# PostgreSQL Advisory Lock Service

This module provides a service for using PostgreSQL advisory locks to ensure mutual exclusion across transactions and database connections.

## Components

### AdvisoryLockKey
Enum defining all available lock keys in the system. Each key has a unique numeric ID.

Available lock keys:
- `CREATE_DISTRIBUTION` (1000L) - For creating new distribution events
- `CLOSE_DISTRIBUTION` (2000L) - For closing distribution events

### AdvisoryLockRepository
Spring Data JPA repository providing native query methods for PostgreSQL advisory lock functions.

### AdvisoryLockService
Service providing high-level methods to acquire and release advisory locks using the repository.

## Usage

### Basic Lock Usage

```kotlin
@Service
class MyService(
    private val advisoryLockService: AdvisoryLockService
) {
    
    @Transactional
    fun criticalOperation() {
        advisoryLockService.withLock(AdvisoryLockKey.DISTRIBUTION_MANAGEMENT) {
            // Critical section - only one transaction can execute this at a time
            doSomethingCritical()
        }
    }
}
```

### Try-Lock Pattern

```kotlin
@Transactional
fun tryOperation(): Boolean {
    return advisoryLockService.tryWithLock(AdvisoryLockKey.CUSTOMER_TICKET_ASSIGNMENT) {
        // Execute if lock is available
        doOperation()
    }
}
```

### Manual Lock Management

```kotlin
@Transactional
fun manualLockOperation() {
    advisoryLockService.acquireLock(AdvisoryLockKey.FOOD_COLLECTION_UPDATE)
    try {
        doOperation()
    } finally {
        advisoryLockService.releaseLock(AdvisoryLockKey.FOOD_COLLECTION_UPDATE)
    }
}
```

### Check Lock Status

```kotlin
@Transactional
fun checkLock() {
    if (advisoryLockService.isLockHeld(AdvisoryLockKey.DISTRIBUTION_MANAGEMENT)) {
        // Lock is currently held by this transaction
    }
}
```

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
    DISTRIBUTION_MANAGEMENT(1L),
    CUSTOMER_TICKET_ASSIGNMENT(2L),
    FOOD_COLLECTION_UPDATE(3L),
    MY_NEW_LOCK(4L);  // Add new lock key here
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
