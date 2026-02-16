# Angular Signal Patterns & Best Practices
## Tafel Admin System - Frontend Development Guide

**Document Version:** 1.0
**Date:** 2026-02-16
**Angular Version:** 21.1.4
**Application Mode:** Zoneless (provideZonelessChangeDetection)

---

## Table of Contents
1. [Overview](#overview)
2. [Signal Basics](#signal-basics)
3. [Signal Components](#signal-components)
4. [Reactive Patterns](#reactive-patterns)
5. [Resource API](#resource-api)
6. [Effect Usage](#effect-usage)
7. [Form State Management](#form-state-management)
8. [Best Practices](#best-practices)
9. [Migration Examples](#migration-examples)

---

## Overview

The Tafel Admin frontend uses **Angular Signals** as the primary state management solution. The application runs in **zoneless mode**, which means:
- Change detection is triggered by signal updates, not zones
- No `ngZone.run()` calls needed
- Better performance and simpler mental model
- Native async/await support

### Key Signal Features in Use
- ✅ **Signal Inputs/Outputs** - All components use `input()` and `output()`
- ✅ **Signal Queries** - `viewChild()`, `viewChildren()` for template references
- ✅ **Computed Signals** - Derived state with `computed()`
- ✅ **Effects** - Side effects with automatic cleanup
- ✅ **toSignal** - Converting Observables to Signals
- 🔄 **Resource API** - Being adopted for data fetching (Angular 21)
- 🔄 **linkedSignal** - Being adopted for form state (Angular 20+)

---

## Signal Basics

### Creating Signals

```typescript
import { signal, computed, effect } from '@angular/core';

export class MyComponent {
  // Writable signal
  count = signal(0);

  // Computed signal (read-only, derived)
  doubleCount = computed(() => this.count() * 2);

  // Effect (runs when dependencies change)
  constructor() {
    effect(() => {
      console.log('Count changed:', this.count());
    });
  }

  // Update signal
  increment() {
    this.count.update(current => current + 1);
    // or: this.count.set(5);
  }
}
```

### Signal Inputs and Outputs

**✅ CORRECT - Use signal inputs/outputs**
```typescript
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'tafel-customer-card',
  template: `
    <div>{{ customer().firstname }}</div>
    <button (click)="handleEdit()">Edit</button>
  `
})
export class CustomerCardComponent {
  // Signal input (required)
  customer = input.required<Customer>();

  // Signal input (optional with default)
  showActions = input(true);

  // Signal output
  edit = output<number>();

  handleEdit() {
    this.edit.emit(this.customer().id);
  }
}
```

**❌ DEPRECATED - Don't use @Input/@Output**
```typescript
// DON'T DO THIS - Old pattern
@Input() customer: Customer;
@Output() edit = new EventEmitter<number>();
```

---

## Signal Components

### Component Structure

All components should follow this structure:

```typescript
import { Component, input, output, signal, computed } from '@angular/core';

@Component({
  selector: 'tafel-example',
  templateUrl: './example.component.html',
  standalone: true,
  imports: [CommonModule, /* other imports */]
})
export class ExampleComponent {
  // 1. Injected services
  private readonly apiService = inject(ExampleApiService);

  // 2. Signal inputs
  customerId = input.required<number>();

  // 3. Signal outputs
  saved = output<void>();

  // 4. Local state (signals)
  loading = signal(false);
  data = signal<Data[]>([]);

  // 5. Computed signals
  hasData = computed(() => this.data().length > 0);

  // 6. Constructor with effects
  constructor() {
    effect(() => {
      const id = this.customerId();
      this.loadData(id);
    });
  }

  // 7. Methods
  loadData(id: number) {
    this.loading.set(true);
    this.apiService.getData(id).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      }
    });
  }
}
```

### Template Syntax

**✅ CORRECT - Read signals with ()**
```html
@if (loading()) {
  <p>Loading...</p>
}

@if (hasData()) {
  @for (item of data(); track item.id) {
    <div>{{ item.name }}</div>
  }
}
```

**❌ WRONG - Don't forget ()**
```html
<!-- DON'T DO THIS -->
@if (loading) {  <!-- Missing () -->
  <p>Loading...</p>
}
```

---

## Reactive Patterns

### Converting Observables to Signals

Use `toSignal` to convert Observables to Signals:

```typescript
import { toSignal } from '@angular/core/rxjs-interop';

export class CustomerListComponent {
  private readonly customerApi = inject(CustomerApiService);

  // Convert Observable to Signal
  customers = toSignal(
    this.customerApi.getCustomers$(),
    { initialValue: [] }
  );

  // Use in template
  // Template: @for (customer of customers(); track customer.id)
}
```

### Signal Queries

Use signal-based queries instead of decorators:

**✅ CORRECT - Signal queries**
```typescript
import { viewChild, viewChildren } from '@angular/core';

export class FormComponent {
  // Single element
  inputElement = viewChild<ElementRef>('input');

  // Multiple elements
  checkboxes = viewChildren<ElementRef>('checkbox');

  focusInput() {
    this.inputElement()?.nativeElement.focus();
  }
}
```

**❌ DEPRECATED - Don't use decorators**
```typescript
// DON'T DO THIS
@ViewChild('input') inputElement: ElementRef;
@ViewChildren('checkbox') checkboxes: QueryList<ElementRef>;
```

---

## Resource API

### Using Resource API for Data Fetching

The **Resource API** (stable in Angular 21) provides declarative data fetching with automatic loading/error states.

**✅ RECOMMENDED - Resource API**
```typescript
import { resource } from '@angular/core';

export class CustomerListComponent {
  private readonly customerApi = inject(CustomerApiService);

  // Simple resource
  customersResource = resource({
    loader: () => this.customerApi.getCustomers$()
  });

  // Access data
  customers = computed(() => this.customersResource.value() ?? []);
  isLoading = this.customersResource.isLoading;
  hasError = this.customersResource.hasError;
  error = this.customersResource.error;

  // Reload data
  reload() {
    this.customersResource.reload();
  }
}
```

### Resource with Dependencies

Resources can depend on signals:

```typescript
export class CustomerDetailComponent {
  customerId = input.required<number>();

  // Resource that reloads when customerId changes
  customerResource = resource({
    request: () => ({ id: this.customerId() }),
    loader: ({ request }) => this.customerApi.getCustomer$(request.id)
  });

  customer = this.customerResource.value;
}
```

### Template Usage

```html
@if (customersResource.isLoading()) {
  <p>Loading customers...</p>
} @else if (customersResource.hasError()) {
  <p>Error: {{ customersResource.error()?.message }}</p>
} @else {
  @for (customer of customers(); track customer.id) {
    <tafel-customer-card [customer]="customer" />
  }
}

<button (click)="reload()">Refresh</button>
```

### Benefits of Resource API

- ✅ Automatic cleanup (no manual unsubscribe)
- ✅ Built-in loading/error states
- ✅ Request deduplication
- ✅ Reactive reloading with dependencies
- ✅ ~70% less boilerplate code

---

## Effect Usage

### Effects for Side Effects

Use `effect()` for side effects that should run when signals change:

**✅ CORRECT - Effect in constructor**
```typescript
export class SearchComponent {
  searchTerm = signal('');
  results = signal<Result[]>([]);

  constructor() {
    effect(() => {
      const term = this.searchTerm();
      if (term.length >= 3) {
        this.performSearch(term);
      }
    });
  }

  performSearch(term: string) {
    this.apiService.search(term).subscribe({
      next: (results) => this.results.set(results)
    });
  }
}
```

### Replacing Lifecycle Hooks

**Before: Using OnInit/OnDestroy**
```typescript
export class OldComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  data = signal([]);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.apiService.getData()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.data.set(data));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

**After: Using Effects**
```typescript
export class NewComponent {
  data = signal([]);

  constructor() {
    // Effect runs automatically, cleanup is automatic
    effect(() => {
      this.apiService.getData().subscribe({
        next: (data) => this.data.set(data)
      });
    });
  }
}
```

**Even Better: Using Resource API**
```typescript
export class BestComponent {
  dataResource = resource({
    loader: () => this.apiService.getData()
  });

  data = this.dataResource.value;
}
```

---

## Form State Management

### Using toSignal for Form State

Convert form value changes to signals:

```typescript
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder } from '@angular/forms';

export class CustomerFormComponent {
  private readonly fb = inject(FormBuilder);

  form = this.fb.group({
    firstname: ['', Validators.required],
    lastname: ['', Validators.required]
  });

  // Convert form value to signal
  formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.value
  });

  // Computed based on form state
  isFormValid = toSignal(this.form.statusChanges.pipe(
    map(status => status === 'VALID')
  ), { initialValue: false });

  // Derived computed
  fullName = computed(() => {
    const value = this.formValue();
    return `${value.firstname} ${value.lastname}`;
  });
}
```

### Using linkedSignal (Angular 20+)

`linkedSignal` creates a signal that's linked to a source signal with computation:

```typescript
import { linkedSignal } from '@angular/core';

export class CustomerFormComponent {
  form = this.fb.group({
    firstname: [''],
    lastname: [''],
    birthdate: [null]
  });

  // Source signal from form
  formValueSignal = toSignal(this.form.valueChanges, {
    initialValue: this.form.value
  });

  // Linked signal with transformation
  formData = linkedSignal({
    source: this.formValueSignal,
    computation: (value) => ({
      ...value,
      age: this.calculateAge(value.birthdate)
    })
  });

  calculateAge(birthdate: Date | null): number | null {
    if (!birthdate) return null;
    const today = new Date();
    const birth = new Date(birthdate);
    return today.getFullYear() - birth.getFullYear();
  }
}
```

---

## Best Practices

### 1. Signal Naming

```typescript
// ✅ GOOD - Clear signal names
customers = signal<Customer[]>([]);
isLoading = signal(false);
selectedCustomer = signal<Customer | null>(null);

// ❌ BAD - Don't use $ suffix (that's for Observables)
customers$ = signal<Customer[]>([]);
```

### 2. Computed Signals

```typescript
// ✅ GOOD - Use computed for derived state
filteredCustomers = computed(() => {
  const customers = this.customers();
  const filter = this.filter();
  return customers.filter(c => c.name.includes(filter));
});

// ❌ BAD - Don't use methods for derived state
getFilteredCustomers() {
  return this.customers().filter(c =>
    c.name.includes(this.filter())
  );
}
```

### 3. Signal Updates

```typescript
// ✅ GOOD - Use update() for transformations
counter.update(value => value + 1);
customers.update(list => [...list, newCustomer]);

// ✅ GOOD - Use set() for replacements
counter.set(0);
customers.set([]);

// ❌ BAD - Don't mutate signal values
customers().push(newCustomer); // DON'T DO THIS
```

### 4. Effects

```typescript
// ✅ GOOD - Effects for side effects only
constructor() {
  effect(() => {
    const filter = this.filter();
    this.performSearch(filter);
  });
}

// ❌ BAD - Don't use effects to compute values
constructor() {
  effect(() => {
    // BAD: Use computed() instead
    const filtered = this.customers().filter(/*...*/);
    this.filteredCustomers.set(filtered);
  });
}
```

### 5. Template Access

```html
<!-- ✅ GOOD - Always call signals with () -->
@if (isLoading()) {
  <p>Loading...</p>
}

<!-- ❌ BAD - Missing () will not work -->
@if (isLoading) {
  <p>This won't show correctly</p>
}
```

---

## Migration Examples

### Example 1: Simple Component

**Before:**
```typescript
export class CustomerListComponent implements OnInit, OnDestroy {
  @Input() distributionId: number;
  @Output() customerSelected = new EventEmitter<Customer>();

  customers: Customer[] = [];
  loading = false;
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.loadCustomers();
  }

  loadCustomers() {
    this.loading = true;
    this.apiService.getCustomers(this.distributionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (customers) => {
          this.customers = customers;
          this.loading = false;
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

**After (with Resource API):**
```typescript
export class CustomerListComponent {
  // Signal input/output
  distributionId = input.required<number>();
  customerSelected = output<Customer>();

  // Resource API
  customersResource = resource({
    request: () => ({ id: this.distributionId() }),
    loader: ({ request }) => this.apiService.getCustomers(request.id)
  });

  // Computed values
  customers = computed(() => this.customersResource.value() ?? []);
  loading = this.customersResource.isLoading;
}
```

### Example 2: Form Component

**Before:**
```typescript
export class CustomerFormComponent implements OnInit, OnDestroy {
  @Input() customer: Customer;
  @Output() saved = new EventEmitter<void>();

  form: FormGroup;
  formValue: any = {};
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.form = this.fb.group({
      firstname: [this.customer?.firstname || ''],
      lastname: [this.customer?.lastname || '']
    });

    this.form.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.formValue = value;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

**After:**
```typescript
export class CustomerFormComponent {
  // Signal input/output
  customer = input<Customer | null>(null);
  saved = output<void>();

  // Form setup
  form = this.fb.group({
    firstname: [''],
    lastname: ['']
  });

  // Signal-based form state
  formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.value
  });

  // Initialize form from input
  constructor() {
    effect(() => {
      const customer = this.customer();
      if (customer) {
        this.form.patchValue({
          firstname: customer.firstname,
          lastname: customer.lastname
        });
      }
    });
  }
}
```

---

## Summary

### Quick Reference

| Pattern | Old Way | New Way |
|---------|---------|---------|
| **Inputs** | `@Input()` | `input()` / `input.required()` |
| **Outputs** | `@Output()` | `output()` |
| **View Queries** | `@ViewChild()` | `viewChild()` |
| **State** | Class properties | `signal()` |
| **Derived State** | Methods / pipes | `computed()` |
| **Side Effects** | `ngOnInit()` | `effect()` in constructor |
| **Cleanup** | `ngOnDestroy()` | Automatic with effects |
| **Observable→Signal** | Manual subscribe | `toSignal()` |
| **Data Fetching** | Manual subscribe | `resource()` |
| **Form State** | Manual subscribe | `toSignal()` + `linkedSignal()` |

### Migration Priority

1. ✅ **Done**: Standalone components, new control flow
2. ✅ **Done**: Signal inputs/outputs
3. 🔄 **In Progress**: Resource API for data fetching
4. 🔄 **In Progress**: Effects instead of lifecycle hooks
5. 📋 **Planned**: linkedSignal for form state
6. 📋 **Future**: Signal forms (experimental)

---

## References

- [Angular Signals Documentation](https://angular.dev/guide/signals)
- [Angular Resource API](https://angular.dev/guide/signals/resource)
- [Angular linkedSignal](https://angular.dev/guide/signals/linked-signal)
- [Zoneless Change Detection](https://angular.dev/guide/zoneless)
- [ANGULAR_18_TO_21_IMPROVEMENT_PLAN.md](./ANGULAR_18_TO_21_IMPROVEMENT_PLAN.md)

---

**Document Revision History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-16 | Claude Code | Initial creation |

---

**End of Document**
