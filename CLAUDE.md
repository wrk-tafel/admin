# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a food bank administration system ("Tafel Admin") built with Spring Boot 3.5.4 (Kotlin) backend and Angular 19 frontend. It manages customers, distributions, food collections, routes, shelters, and other logistics for a food bank organization.

## Common Development Commands

### Build & Test
```bash
# Full build with tests and analysis
./mvnw clean install

# Backend only
cd backend && ./mvnw clean install

# Frontend only
cd frontend/src/main/webapp && npm install && npm run build-prod

# Run backend locally
./mvnw spring-boot:run

# Run frontend locally
cd frontend/src/main/webapp && npm start
```

### Testing
```bash
# Backend tests
./mvnw test

# Frontend unit tests
cd frontend/src/main/webapp && npm run test-ci

# Frontend linting
cd frontend/src/main/webapp && npm run lint

# E2E tests (depends on running backend)
cd frontend/src/main/webapp && npm run cy:run-ci
```

### Database & Docker
```bash
# Start development environment
docker-compose up -d database database2 pgadmin mailpit

# Database migrations are handled by Flyway - located in backend/src/main/resources/db-migration/
```

## Architecture

### Backend Structure (Spring Boot + Kotlin)
- **Modules organized by domain**: customer, distribution, logistics, dashboard, settings, reporting, checkin
- **Database**: PostgreSQL with Flyway migrations, JPA entities
- **Security**: JWT-based authentication with Spring Security
- **API**: RESTful controllers with dedicated internal service layers
- **Key technologies**: Spring Boot 3.5.4, Kotlin 2.1.21, Spring Modulith

### Frontend Structure (Angular 19)
- **Location**: `frontend/src/main/webapp/`
- **Framework**: Angular 19 with CoreUI admin template
- **Architecture**: Modular structure with feature-based modules
- **Key modules**: customer, dashboard, distribution, logistics, settings, user
- **Testing**: Jasmine/Karma for unit tests, Cypress for E2E

### Database Schema
Core entities include:
- **Customer**: Master data with additional persons, notes, validation
- **Distribution**: Events with customer check-ins, statistics, ticketing
- **Logistics**: Food collections, routes, cars, shelters, shops
- **User Management**: Employees, authorities, authentication

### Key Services
- **CustomerService**: Business logic for customer management, duplication detection
- **DistributionService**: Distribution event handling, statistics, reporting
- **PDF Generation**: Apache FOP for customer master data and distribution reports
- **Authentication**: JWT token service, user details management
- **Mail**: Thymeleaf templates for daily reports and notifications

### Configuration
- **Application profiles**: local, testdata, e2e, production
- **Database**: PostgreSQL with testcontainer support for integration tests
- **Security**: JWT configuration, CORS settings
- **Logging**: Logback configuration

### Development Workflow
1. Backend builds first (Maven reactor project)
2. Frontend builds and copies to backend's static resources
3. Single JAR contains both backend API and built frontend
4. Flyway migrations run on startup
5. E2E tests run against full application

### Important Notes
- Uses Spring Modulith for module boundaries and observability
- Frontend compiled with AOT for production builds
- Database migrations are versioned and run automatically
- E2E tests require running backend server on port 8080
- Mailpit service captures emails for development