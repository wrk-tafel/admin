# Angular Frontend Analysis - Key File Reference

## Configuration Files

### Application Bootstrap
- **main.ts** - Application entry point with zoneless change detection
  - Location: `src/main.ts`
  - Key: `provideZonelessChangeDetection()`

- **app.config.ts** - Application configuration and providers
  - Location: `src/app/app.config.ts`
  - Includes: HTTP interceptors, routing, animations, locale

### Build Configuration
- **angular.json** - Angular CLI configuration
  - Build tool: @angular/build (esbuild)
  - Optimization enabled for production
  - No polyfills array (zoneless)

- **tsconfig.app.json** - TypeScript compiler options
  - Module: es2022
  - Target: Angular 21 standards

### Testing Configuration
- **vitest.config.ts** - Vitest configuration (primary framework)
  - Location: `vitest.config.ts`
  - Environment: jsdom
  - Globals enabled

- **karma.conf.js** - Karma configuration (legacy, ready for removal)
  - Location: `karma.conf.js`
  - Status: Still available but not actively used

- **src/test.ts** - Test environment setup (Karma-specific)
  - Locale registration for testing

### Package Configuration
- **package.json** - Dependencies and scripts
  - Angular 21.1.3
  - Vitest 4.0.18
  - Node: >=20.19.0
  - Commands: dev, build-prod, test, test-ci, cy:run-ci

---

## Application Architecture Files

### Routing
- **app.routes.ts** - Main application routes
  - Location: `src/app/app.routes.ts`
  - Hash-based routing
  - Lazy-loaded feature modules
  - Functional guards with inject()

- **Feature Module Routes** (examples)
  - `modules/dashboard/dashboard.routes.ts`
  - `modules/customer/customer.routes.ts`
  - `modules/logistics/logistics.routes.ts`

### State Management
- **common/state/global-state.service.ts** - Global state with signals
  - WritableSignal for distribution state
  - SSE-driven updates
  - ReadOnly signal getters

### HTTP & Networking
- **common/sse/sse.service.ts** - Server-Sent Events service
  - Real-time updates
  - Auto-reconnection logic (1s delay)
  - Zone management for async events

- **common/http/apipath-interceptor.service.ts** - Request path normalization
- **common/http/errorhandler-interceptor.service.ts** - Global error handling

### Security & Authentication
- **common/security/authentication.service.ts** - Auth service
- **common/security/authguard.service.ts** - Route guard
- **common/security/tafel-if-permission.directive.ts** - Permission directive with signals

---

## Component Examples

### Using Signals with Forms
- **modules/customer/components/customer-form/customer-form.component.ts** (108 lines)
  - `input<CustomerData>()` for reactive data
  - `output<CustomerData>()` for events
  - `effect()` for form initialization
  - ReactiveFormsModule, FormArray
  - Custom validators

### Dashboard with SSE
- **modules/dashboard/dashboard.component.ts** (48 lines)
  - `input<ShelterListResponse>()` from resolver
  - `toSignal()` converting SSE observable to signal
  - Clean, minimal component

### Global Layout
- **common/views/default-layout/default-layout.component.ts**
  - Layout with sidebar and header
  - New control flow syntax in template

---

## Service Examples

### API Services
- **api/customer-api.service.ts** - Customer CRUD operations
- **api/distribution-api.service.ts** - Distribution management
- **api/user-api.service.ts** - User management
- **api/food-categories-api.service.ts** - Food categories
- Plus 13 more API services (18 total)

All API services use:
- HttpClient with Observable<T>
- Typed responses
- Error handling via interceptor

---

## Test File Examples

### Service Testing
- **common/state/global-state.service.spec.ts** (52 lines)
  - Vitest setup function pattern
  - TestBed configuration
  - Signal testing: `service.getCurrentDistribution()()`

### Component Testing
- **modules/customer/components/customer-form/customer-form.component.spec.ts** (80+ lines)
  - MockedObject<CountryApiService>
  - vi.fn() for mocking
  - TestBed with component imports

---

## Directive Examples

### Signal-Based Directive
- **common/security/tafel-if-permission.directive.ts** (28 lines)
  - `input.required<string>()` for permission check
  - `effect()` for reactive rendering
  - TemplateRef and ViewContainerRef

### Distribution-Active Directive
- **common/directive/tafel-if-distribution-active.directive.ts**
  - Reactive conditional rendering

### Autofocus Directive
- **common/directive/tafel-autofocus.directive.ts**
  - Auto-focus on element creation

---

## Template Files Showing New Control Flow

### Using @if Control Flow
```html
<!-- Example from default-layout.component.html -->
@if (!sidebar1.narrow) {
  <c-sidebar-footer ...>
    <button cSidebarToggler></button>
  </c-sidebar-footer>
}
```

### Using @for Control Flow
```html
<!-- Example showing dynamic list rendering -->
@for (item of items(); track item.id) {
  <component [item]="item"></component>
}
```

---

## Feature Module Structure Examples

### Customer Module
- `modules/customer/customer.routes.ts` - Routes
- `modules/customer/views/` - Page components
  - customer-search
  - customer-detail
  - customer-edit
  - customer-duplicates
- `modules/customer/components/customer-form/` - Reusable form
- `modules/customer/resolver/` - Data pre-fetching

### Dashboard Module
- `modules/dashboard/dashboard.routes.ts` - Routes
- `modules/dashboard/dashboard.component.ts` - Main component
- `modules/dashboard/components/` - Sub-components
  - distribution-state
  - registered-customers
  - distribution-statistics-input
  - recorded-food-collections
  - food-amount
  - tickets-processed
  - distribution-notes-input
  - select-shelters

### Similar for: checkin, logistics, settings, statistics, user modules

---

## Shared Component Files

Location: `common/components/`

- **tafel-pagination/tafel-pagination.component.ts**
  - `input()` and `output()` signals
  - Pagination logic with signals

- **tafel-counter-input/tafel-counter-input.component.ts**
  - Form input for numeric values
  - Signal-based value handling

- **toasts/tafel-toaster.component.ts**
  - Toast notifications service
  - Signal-driven visibility

- **CoreUI Components** (via imports)
  - RowComponent, ColComponent
  - CardComponent, FormSelectDirective
  - ButtonDirective, etc.

---

## Custom Validator Files

Location: `common/validator/`

- **CustomValidator.ts**
  - minDate validator
  - maxDate validator
  - Income validation logic

---

## Pipe Files

Location: `common/pipes/`

- **gender-label.pipe.ts** - Gender enum display
- Currency formatting via CoreUI
- Locale-aware formatting (de-AT)

---

## API Service Location Pattern

All API services located in: `api/`

- **Structure:** `<feature>-api.service.ts`
- **Examples:**
  - `customer-api.service.ts`
  - `distribution-api.service.ts`
  - `user-api.service.ts`
  - `shelter-api.service.ts`
  - `route-api.service.ts`
  - `food-categories-api.service.ts`
  - And 12 more...

- **Pattern:** All return `Observable<T>` from HttpClient
- **Ready for:** Signal wrapping at service level

---

## Key Utility Services

Location: `common/util/`

- **url-helper.service.ts** - URL base construction
- **file-helper.service.ts** - File operations

Location: `common/security/`

- **authentication.service.ts** - User info, permissions
- **tafel-if-permission.directive.ts** - Permission checks

---

## Environment Configuration Files

- `src/environments/environment.ts` - Development
- `src/environments/environment.prod.ts` - Production

Used for: API base URLs, feature flags

---

## Stylesheet Files

- `src/scss/styles.scss` - Global styles
- Component-level styles via `styles:` in @Component

- **UI Framework:**
  - CoreUI 5.6
  - Bootstrap 5.3.8
  - FontAwesome icons

---

## Development & Debugging

### Dev Tools
- **Proxy Config:** `proxy.conf.json`
  - Redirects `/api` to `http://localhost:8080`
  - Allows backend at Spring Boot default port

### Commands
- `npm run dev` - Development server
- `npm run build-prod` - Production build
- `npm test` - Run tests
- `npm run cy:run-ci` - E2E tests

---

## Summary Statistics

| Category | Count | Location |
|----------|-------|----------|
| Components | 55 | `app/modules/*/` and `app/common/` |
| Services | 27 | `app/api/` and feature modules |
| Directives | 3 | `app/common/directive/` |
| Test Files | 91 | `**/*.spec.ts` |
| API Services | 18 | `app/api/` |
| Feature Modules | 7 | `app/modules/` |
| Routes | 8 | `*.routes.ts` files |

---

## Next Steps for Improvement

1. **Signal Migration Phase**
   - Start with `api/` service layer
   - Wrap HttpClient observables with `toSignal()`
   - Update component consumers to expect signals

2. **Testing Consolidation**
   - Remove `karma.conf.js`
   - Remove `src/test.ts`
   - Confirm all tests pass with Vitest

3. **Lifecycle Hook Reduction**
   - Replace `ngOnInit` with constructor + `effect()`
   - Eliminate `ngOnDestroy` with signal cleanup

4. **Form Enhancement**
   - Migrate to Angular 19+ FormControl as signal
   - Reduce `valueChanges` subscriptions

---

**Generated:** 2026-02-15
**Analysis Tool:** Claude Code
