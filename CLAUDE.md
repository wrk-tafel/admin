# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a food bank (Tafel) administration system built with a Spring Boot/Kotlin backend and Angular 18 frontend. The system manages customer registrations, food distributions, logistics operations, and generates various reports and statistics. It supports German/Austrian locale (de-AT) with Euro currency.

## Build and Development Commands

### Full Application Build
```bash
# Build both backend and frontend (from root)
mvn clean install

# Build only backend
cd backend && mvn clean install

# Build only frontend
cd frontend && mvn clean install
```

### Backend Development
```bash
# Run backend with local profile (from backend/)
mvn spring-boot:run -Dspring-boot.run.profiles=local

# Run backend tests
mvn test

# Run with testdata
mvn spring-boot:run -Dspring-boot.run.profiles=local,testdata

# Run with e2e profile
mvn spring-boot:run -Dspring-boot.run.profiles=e2e
```

### Frontend Development
```bash
# Navigate to frontend webapp directory
cd frontend/src/main/webapp

# Install dependencies
npm install

# Start development server (proxies to backend at localhost:8080)
npm run dev

# Build for local testing
npm run build-local

# Build for production
npm run build-prod

# Run unit tests
npm test

# Run unit tests in CI mode (headless)
npm run test-ci

# Lint code
npm run lint

# Run E2E tests (requires backend running)
npm run cy:run-ci

# Open Cypress UI for E2E tests
npm run cy:open-local
```

## Architecture

### Backend Architecture

The backend uses **Spring Modulith** architecture with 7 core feature modules, each with explicit boundaries enforced via `package-info.java` annotations:

- **customer**: Client management with income validation, duplicate detection, PDF generation (ID cards, master data)
- **distribution**: Food distribution events with ticket management, statistics, and post-processors for emails/reports
- **logistics**: Routes, food collections, shelters, shops, cars, and food category management
- **checkin**: Scanner registration and customer check-in via QR codes
- **dashboard**: Overview page with real-time updates, registered customers, and distribution state
- **reporting**: Statistics exports (CSV), daily reports (PDF), age/country/household distributions
- **settings**: Application configuration and mail recipient management
- **base**: Shared utilities (countries, employees, exception handling)

**Layering Pattern:**
- Controllers: REST endpoints with `@PreAuthorize` method-level security
- Services: Business logic with `@Transactional` boundaries
- Repositories: Spring Data JPA with custom specifications for complex queries
- Entities: Located in `database/model/` with Flyway migrations in `resources/db-migration/`

**Key Technologies:**
- Kotlin 2.1 with coroutines support
- Spring Boot 3.5 with Spring Modulith for modular monolith architecture
- PostgreSQL with Flyway for database migrations (60+ R__ repeatable scripts)
- JWT authentication with Argon2 password hashing
- Server-Sent Events (SSE) via outbox pattern for real-time notifications
- Apache FOP for PDF generation from XSL templates
- Spring Security with role-based access control

**Notable Patterns:**
- Outbox pattern for reliable SSE event publishing (`sse_outbox` table)
- Post-processor chain for distribution events (DailyReportMailPostProcessor, StatisticMailPostProcessor, etc.)
- Converter pattern for entity-to-DTO mapping
- Custom validators for income limits and customer validation
- Base entities with change tracking (created/updated timestamps, employee references)

### Frontend Architecture

The frontend is an Angular 18 single-page application using CoreUI 5.2 as the UI framework.

**Feature Modules:**
- **dashboard**: Overview with distribution state, registered customers, food amounts, statistics input
- **customer**: Search, create, edit, detail views with duplicate detection
- **checkin**: Scanner registration, QR code reading, ticket screen for customer calls
- **logistics**: Food collection recording (desktop/responsive layouts), route management
- **user**: User search, create, edit with password change functionality
- **settings**: System settings and mail recipient configuration

**Architecture Patterns:**
- Standalone components with lazy-loaded feature modules
- Resolver pattern for data pre-fetching before route activation
- Route guards for authentication and permission-based access control
- Global state service using RxJS BehaviorSubjects
- SSE service for real-time updates from backend
- Custom directives (`tafelIfPermission`, `tafelAutofocus`, `tafelIfDistributionActive`)

**Module Structure Convention:**
```
modules/<feature>/
  ├── components/       # Reusable components
  ├── views/           # Page-level components
  ├── services/        # Feature-specific services
  ├── resolver/        # Route data resolvers
  └── <feature>.routes.ts
```

**Key Technologies:**
- Angular 18 with standalone components
- CoreUI 5.2 (Bootstrap-based UI library)
- RxJS for reactive programming
- html5-qrcode for scanner functionality
- ngx-cookie-service for session management
- Chart.js for statistics visualization
- Cypress for E2E testing

**Authentication:**
- Basic HTTP authentication with session cookies
- Permission-based access control (CUSTOMER, SCANNER, CHECKIN, LOGISTICS, USER_MANAGEMENT, SETTINGS)
- Functional route guards checking permissions
- HTTP interceptors for API path handling and error management

## Database

The application uses PostgreSQL with Flyway for schema management. Migration files are located in `backend/src/main/resources/db-migration/` with the naming pattern `R__XXXXX_<description>.sql` (repeatable migrations).

**Key Tables:**
- `users`, `user_authorities`: User authentication and permissions
- `employees`: Employee records referenced in change tracking
- `customers`, `customers_addpersons`: Customer data with household members
- `customer_notes`: Notes attached to customers
- `distributions`: Food distribution events
- `distribution_customers`: Customer participation in distributions
- `distribution_statistics`: Statistics per distribution
- `routes`, `route_stops`, `shops`: Logistics route management
- `food_categories`, `food_collections`, `food_collection_items`: Food recording
- `shelters`, `shelter_contacts`: Shelter management
- `cars`: Vehicle management
- `sse_outbox`: Outbox pattern for SSE events
- `mail_addresses`: Email recipient configuration

## Testing

### Backend Tests
- Unit tests: Named `*Test.kt`
- Integration tests: Named `*IT.kt` (use Testcontainers for PostgreSQL)
- Run all tests: `mvn test` (from backend/)
- Base test class: `TafelBaseIntegrationTest` sets up test environment

### Frontend Tests
- Unit tests: Karma + Jasmine (`.spec.ts` files)
- Run unit tests: `npm test` (from frontend/src/main/webapp)
- Run headless: `npm run test-ci`
- E2E tests: Cypress (in `frontend/src/main/webapp/cypress/e2e/`)
- Run E2E: `npm run cy:run-ci` (requires backend running on port 8080)

## Code Conventions

### Backend (Kotlin)
- Package structure: `at.wrk.tafel.admin.backend.modules.<module>.<subpackage>`
- Controllers: Suffix with `Controller`, return response models
- Services: Suffix with `Service`, mark internal services in `internal/` package
- Entities: Suffix with `Entity`, located in `database/model/`
- Repositories: Suffix with `Repository`, use Spring Data JPA
- Models: Suffix with `Model` or `ResponseModel` for DTOs
- Use constructor injection for dependencies
- Use `@Transactional` on service methods that modify data
- Converters in `internal/converter/` package convert entities to models

### Frontend (TypeScript/Angular)
- Use standalone components (not NgModules)
- Component selectors: `tafel-<component-name>`
- Services: Suffix with `.service.ts`
- API services: Suffix with `-api.service.ts`, located in `app/api/`
- Resolvers: Suffix with `-resolver.component.ts`
- Use `inject()` function for dependency injection in components
- Use `HttpClient` for API calls, typed with interfaces
- Reactive forms for all form handling
- Use `async` pipe in templates for observables
- Custom validators in `common/validator/`

## API Structure

The backend exposes REST APIs under `/api/` prefix:
- `/api/users`: User management
- `/api/customers`: Customer CRUD operations
- `/api/customers/{id}/notes`: Customer notes
- `/api/distributions`: Distribution management
- `/api/distributions/{id}/tickets`: Ticket management
- `/api/distributions/ticket-screen`: Ticket screen SSE endpoint
- `/api/countries`: Country list
- `/api/employees`: Employee management
- `/api/scanners`: Scanner registration
- `/api/routes`: Route management
- `/api/food-categories`: Food category management
- `/api/food-collections`: Food collection recording
- `/api/cars`: Car management
- `/api/shelters`: Shelter management
- `/api/settings`: Application settings

Authentication: Basic HTTP auth with JWT token stored in cookie.

## Special Considerations

- **Distribution State**: Many features require an active distribution (started but not ended). The backend enforces this via `@ActiveDistributionRequired` annotation, and the frontend uses `tafelIfDistributionActive` directive.
- **Customer Duplicates**: The system detects potential duplicates based on lastname, firstname, and birthdate. Review duplicate candidates before creating customers.
- **Income Validation**: Customer income is validated against configurable limits. The validation logic is in `IncomeValidatorService`.
- **PDF Generation**: Uses XSL-FO templates in `backend/src/main/resources/pdf-templates/`. PDFs are generated via Apache FOP.
- **Mail Templates**: Thymeleaf templates in `backend/src/main/resources/mail-templates/`.
- **Ticket System**: Customers receive ticket numbers (1-999) during distributions for organized food collection.
- **Scanner Integration**: Supports handheld scanners for customer check-in via QR codes.
- **Real-time Updates**: Dashboard and ticket screen use SSE for live updates without polling.

## Profiles and Configuration

Backend profiles (in `backend/src/main/resources/application-<profile>.yml`):
- `local`: Development with local PostgreSQL
- `e2e`: E2E testing configuration
- `testdata`: Loads test data via Flyway callback

Frontend proxy configuration: `frontend/src/main/webapp/proxy.conf.json` proxies `/api` to `http://localhost:8080` during development.

## Common Tasks

### Adding a New Feature Module (Backend)
1. Create package under `modules/<module-name>/`
2. Add `package-info.java` with `@ApplicationModule` annotation
3. Create controller, service, and repository layers
4. Add entities in `database/model/<module>/`
5. Create Flyway migration for new tables
6. Add response models

### Adding a New Feature Module (Frontend)
1. Create folder under `modules/<module-name>/`
2. Create `<module>.routes.ts` with route configuration
3. Add views in `views/` subfolder
4. Add reusable components in `components/` subfolder
5. Create API service in `app/api/<module>-api.service.ts`
6. Add resolvers if needed in `resolver/` subfolder
7. Update main routes in `app.routes.ts`

### Creating a New Database Migration
1. Create file `backend/src/main/resources/db-migration/R__XXXXX_<description>.sql`
2. Use next available number for XXXXX
3. Include IF NOT EXISTS clauses for repeatability
4. Test migration with clean database

### Adding a New Permission
1. Add permission to `UserPermissions` enum in backend
2. Update `application.yml` with permission description
3. Add permission check in controller with `@PreAuthorize`
4. Update frontend permission checks in guards and directives
5. Update user creation UI to include new permission
