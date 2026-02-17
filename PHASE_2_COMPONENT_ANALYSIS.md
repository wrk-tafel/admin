# Phase 2: Component Lifecycle Analysis
## Components with OnInit/OnDestroy for Migration

**Analysis Date:** 2026-02-16
**Total Components Found:** 10 with OnInit, 2 with OnDestroy

---

## Summary

Based on code analysis, the following components need lifecycle migration:

### Category 1: SIMPLE (No destroy$ pattern)
Components with OnInit but no cleanup pattern - easiest to migrate

| Component | File | Pattern | Migration Effort |
|-----------|------|---------|------------------|
| LoginComponent | common/views/login/login.component.ts | route.params subscribe | 10 min |

**Total: 1 component**

### Category 2: MEDIUM (Single/Few subscriptions with destroy$)
Components with destroy$ and takeUntil but relatively simple logic

| Component | File | Subscriptions | Migration Effort |
|-----------|------|---------------|------------------|
| UserFormComponent | user/components/user-form/user-form.component.ts | 1 (form.valueChanges) | 20 min |
| TafelEmployeeSearchCreateComponent | logistics/components/tafel-employee-search-create.component.ts | TBD | 20 min |
| FoodCollectionRecordingBasedataComponent | logistics/views/food-collection-recording-basedata/food-collection-recording-basedata.component.ts | TBD | 30 min |
| MailRecipientsComponent | settings/components/mail-recipients/mail-recipients.component.ts | TBD | 20 min |

**Total: 4 components**

### Category 3: COMPLEX (Multiple subscriptions, dynamic forms)
Components with complex subscription management and dynamic form arrays

| Component | File | Subscriptions | Migration Effort |
|-----------|------|---------------|------------------|
| CustomerFormComponent | customer/components/customer-form/customer-form.component.ts | 3+ with dynamic form array | 45 min |
| UserEditComponent | user/views/user-edit/user-edit.component.ts | TBD | 30 min |
| CustomerEditComponent | customer/views/customer-edit/customer-edit.component.ts | TBD | 30 min |
| CustomerDetailComponent | customer/views/customer-detail/customer-detail.component.ts | TBD | 30 min |
| FoodCollectionRecordingComponent | logistics/views/food-collection-recording/food-collection-recording.component.ts | TBD | 45 min |

**Total: 5 components**

### Category 4: SPECIAL CASES
Components with unusual patterns requiring special attention

| Component | File | Pattern | Notes |
|-----------|------|---------|-------|
| ScannerComponent | checkin/views/scanner/scanner.component.ts | async ngOnInit, ngOnDestroy with cleanup | Uses QR scanner service, needs await |
| CheckinComponent | checkin/views/checkin/checkin.component.ts | TBD | Likely SSE related |

**Total: 2 components**

---

## Detailed Analysis

### 1. LoginComponent (SIMPLE)
**File:** `common/views/login/login.component.ts`
**Current Pattern:**
```typescript
ngOnInit(): void {
  this.route.params.subscribe(params => {
    const errorType: string = params['errorType'];
    if (errorType === 'abgelaufen') {
      this.errorMessage = 'Sitzung abgelaufen! Bitte erneut anmelden.';
    } else if (errorType === 'fehlgeschlagen') {
      this.errorMessage = 'Zugriff nicht erlaubt!';
    }
  });
}
```

**Migration Strategy:**
- Convert to toSignal(route.params)
- Use effect() or computed() to derive errorMessage
- No cleanup needed since no long-lived subscriptions

**Estimated Time:** 10 minutes

---

### 2. UserFormComponent (MEDIUM)
**File:** `user/components/user-form/user-form.component.ts`
**Current Pattern:**
```typescript
ngOnInit(): void {
  // ... setup logic ...

  this.form.valueChanges
    .pipe(takeUntil(this.destroy$))
    .subscribe(() => {
      const rawValue: UserFormData = this.form.getRawValue();
      const mappedUserData: UserData = {
        ...rawValue,
        permissions: rawValue.permissions.filter((permission) => permission.enabled === true)
      };
      this.userDataChange.emit(mappedUserData);
    });
}

ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}
```

**Migration Strategy:**
- Move initialization logic to constructor with effect()
- Convert form.valueChanges to toSignal()
- Use effect() to emit userDataChange when form changes
- Remove destroy$ and ngOnDestroy

**Estimated Time:** 20 minutes

---

### 3. CustomerFormComponent (COMPLEX)
**File:** `customer/components/customer-form/customer-form.component.ts`
**Current Pattern:**
```typescript
ngOnInit(): void {
  // 1. Country data fetch
  this.countryApiService.getCountries()
    .pipe(takeUntil(this.destroy$))
    .subscribe((countries) => {
      this.countries = countries;
    });

  // 2. IncomeDue changes
  this.incomeDue.valueChanges
    .pipe(takeUntil(this.destroy$))
    .subscribe(() => {
      this.updateValidUntilDate();
    });

  // 3. Form value changes
  this.form.valueChanges
    .pipe(takeUntil(this.destroy$))
    .subscribe(() => {
      this.customerDataChange.emit(this.form.getRawValue());
    });
}

// PLUS: Dynamic subscriptions in pushPersonGroupControl (lines 246-250)
control.get('incomeDue').valueChanges
  .pipe(takeUntil(this.destroy$))
  .subscribe(() => {
    this.updateValidUntilDate();
  });
```

**Migration Strategy:**
- Convert countryApiService to Resource API or toSignal
- Use effect() for incomeDue and form value changes
- Handle dynamic form array subscriptions carefully
- Consider using linkedSignal for form state
- Remove destroy$ and ngOnDestroy

**Estimated Time:** 45 minutes

**Challenges:**
- Dynamic form arrays add subscriptions at runtime
- Need to ensure cleanup still works properly
- May need to refactor how dynamic subscriptions are added

---

### 4. ScannerComponent (SPECIAL CASE)
**File:** `checkin/views/scanner/scanner.component.ts`
**Current Pattern:**
```typescript
async ngOnInit(): Promise<void> {
  const registrationPromise = this.registerScanner();
  const qrPromise = this.qrCodeReaderService.getCameras().then(async cameras => {
    // ... camera setup ...
    const promise = this.qrCodeReaderService.start(this.currentCamera.id);
    await this.processQrCodeReaderPromise(promise);
  });
  await Promise.all([registrationPromise, qrPromise])
}

async ngOnDestroy(): Promise<void> {
  await this.qrCodeReaderService.stop();
}
```

**Migration Strategy:**
- Use effect() with async operations
- DestroyRef for cleanup (inject(DestroyRef))
- Register cleanup callback with destroyRef.onDestroy()
- Keep async/await pattern

**Estimated Time:** 30 minutes

**Challenges:**
- Async initialization
- Need proper cleanup for QR scanner
- Can't use async in effect(), need afterNextRender or other approach

---

## Migration Priority Order

### Phase 2A: Simple Components (Day 1)
1. LoginComponent - 10 min

**Total: ~10 minutes**

### Phase 2B: Medium Components (Days 2-3)
2. UserFormComponent - 20 min
3. TafelEmployeeSearchCreateComponent - 20 min
4. FoodCollectionRecordingBasedataComponent - 30 min
5. MailRecipientsComponent - 20 min

**Total: ~1.5 hours**

### Phase 2C: Complex Components (Days 4-6)
6. UserEditComponent - 30 min
7. CustomerEditComponent - 30 min
8. CustomerDetailComponent - 30 min
9. CustomerFormComponent - 45 min
10. FoodCollectionRecordingComponent - 45 min

**Total: ~3 hours**

### Phase 2D: Special Cases (Day 7)
11. ScannerComponent - 30 min
12. CheckinComponent - 30 min

**Total: ~1 hour**

---

## Grand Total Estimated Effort

**Total Components:** 12
**Total Time:** ~6 hours (actual coding)
**With Testing:** ~2 days
**With Buffer:** 1 week

---

## Testing Strategy

For each migrated component:
1. ✅ Unit tests pass
2. ✅ Component mounts correctly
3. ✅ Effects trigger as expected
4. ✅ No memory leaks (no lingering subscriptions)
5. ✅ Change detection works (signals trigger updates)
6. ✅ Forms still validate correctly
7. ✅ E2E tests pass (where applicable)

---

## Success Metrics

**Before:**
- Components with OnInit: 10
- Components with OnDestroy: 2
- destroy$ subjects: 4
- takeUntil usages: 4

**After (Target):**
- Components with OnInit: 0
- Components with OnDestroy: 0
- destroy$ subjects: 0
- takeUntil usages: 0 (except for non-component code)
- Effects in constructors: ~12-15

---

**End of Analysis**
