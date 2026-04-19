# Enterprise Test Automation Framework - Makefile

# Variables
NODE_VERSION := 18
DOCKER_IMAGE := enterprise-test-framework
DOCKER_TAG := latest
TEST_RESULTS_DIR := test-results
REPORTS_DIR := playwright-report

# Default target
.DEFAULT_GOAL := help

# Help target
.PHONY: help
help: ## Show this help message
	@echo "Enterprise Test Automation Framework - Available Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Setup and Installation
.PHONY: install
install: ## Install dependencies
	npm install
	npx playwright install

.PHONY: install-ci
install-ci: ## Install dependencies for CI
	npm ci
	npx playwright install --with-deps

.PHONY: setup
setup: install ## Complete setup including dependencies and browsers
	@echo "✅ Setup completed successfully"

# Development
.PHONY: dev
dev: ## Start development environment
	npm run dev

.PHONY: build
build: ## Build the project
	npm run build

.PHONY: clean
clean: ## Clean build artifacts and test results
	rm -rf dist/
	rm -rf $(TEST_RESULTS_DIR)/
	rm -rf $(REPORTS_DIR)/
	rm -rf coverage/
	rm -rf node_modules/.cache/
	@echo "✅ Cleaned build artifacts"

# Testing
.PHONY: test
test: ## Run all tests
	npm run test

.PHONY: test-ui
test-ui: ## Run UI tests only
	npx playwright test tests/ui/ tests/registration/

.PHONY: test-api
test-api: ## Run API tests only
	npx playwright test tests/api/

.PHONY: test-database
test-database: ## Run database tests only
	npx playwright test tests/database/

.PHONY: test-performance
test-performance: ## Run performance tests only
	npx playwright test tests/performance/

.PHONY: test-security
test-security: ## Run security tests only
	npx playwright test tests/security/

.PHONY: test-mobile
test-mobile: ## Run mobile tests only
	npx playwright test tests/mobile/

.PHONY: test-headed
test-headed: ## Run tests in headed mode
	npx playwright test --headed

.PHONY: test-debug
test-debug: ## Run tests in debug mode
	npx playwright test --debug

.PHONY: test-parallel
test-parallel: ## Run tests in parallel with maximum workers
	npx playwright test --workers=max

.PHONY: test-retry
test-retry: ## Run failed tests with retry
	npx playwright test --last-failed --retries=3

# Test Reports
.PHONY: report
report: ## Show test report
	npx playwright show-report

.PHONY: report-open
report-open: ## Open test report in browser
	npx playwright show-report --host=0.0.0.0 --port=9323

# Code Quality
.PHONY: lint
lint: ## Run linting
	npm run lint

.PHONY: lint-fix
lint-fix: ## Run linting with auto-fix
	npm run lint:fix

.PHONY: format
format: ## Format code
	npm run format

.PHONY: type-check
type-check: ## Run TypeScript type checking
	npx tsc --noEmit

.PHONY: quality
quality: lint type-check ## Run all code quality checks

# Unit Tests
.PHONY: test-unit
test-unit: ## Run unit tests with Jest
	npm run test:unit

.PHONY: test-unit-watch
test-unit-watch: ## Run unit tests in watch mode
	npm run test:unit:watch

.PHONY: test-unit-coverage
test-unit-coverage: ## Run unit tests with coverage
	npm run test:unit:coverage

# Docker
.PHONY: docker-build
docker-build: ## Build Docker image
	docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) .

.PHONY: docker-run
docker-run: ## Run tests in Docker container
	docker run --rm -v $(PWD)/$(TEST_RESULTS_DIR):/app/$(TEST_RESULTS_DIR) $(DOCKER_IMAGE):$(DOCKER_TAG)

.PHONY: docker-run-interactive
docker-run-interactive: ## Run Docker container interactively
	docker run --rm -it -v $(PWD):/app $(DOCKER_IMAGE):$(DOCKER_TAG) /bin/sh

.PHONY: docker-clean
docker-clean: ## Clean Docker images and containers
	docker system prune -f
	docker image prune -f

# Environment Management
.PHONY: env-dev
env-dev: ## Set up development environment
	cp .env.example .env.development
	@echo "TEST_ENV=dev" >> .env.development
	@echo "✅ Development environment configured"

.PHONY: env-sit
env-sit: ## Set up SIT environment
	cp .env.example .env.sit
	@echo "TEST_ENV=sit" >> .env.sit
	@echo "✅ SIT environment configured"

.PHONY: env-preprod
env-preprod: ## Set up preprod environment
	cp .env.example .env.preprod
	@echo "TEST_ENV=preprod" >> .env.preprod
	@echo "✅ Preprod environment configured"

.PHONY: env-prod
env-prod: ## Set up production environment
	cp .env.example .env.production
	@echo "TEST_ENV=prod" >> .env.production
	@echo "✅ Production environment configured"

.PHONY: env-list
env-list: ## List available environments
	@echo "Available environments:"
	@ls config/environments/ | sed 's/.json//' | sed 's/^/  - /'

.PHONY: env-validate
env-validate: ## Validate current environment configuration
	npm run env:validate

.PHONY: env-summary
env-summary: ## Show current environment summary
	npm run env:summary

.PHONY: test-dev
test-dev: ## Run tests in development environment
	TEST_ENV=dev npm test

.PHONY: test-sit
test-sit: ## Run tests in SIT environment
	TEST_ENV=sit npm test

.PHONY: test-preprod
test-preprod: ## Run tests in preprod environment
	TEST_ENV=preprod npm test

.PHONY: test-prod
test-prod: ## Run tests in production environment (smoke tests only)
	TEST_ENV=prod npm test -- --grep @smoke

# Database
.PHONY: db-setup
db-setup: ## Set up test database
	@echo "Setting up test database..."
	# Add database setup commands here

.PHONY: db-seed
db-seed: ## Seed test database with data
	@echo "Seeding test database..."
	# Add database seeding commands here

.PHONY: db-reset
db-reset: ## Reset test database
	@echo "Resetting test database..."
	# Add database reset commands here

# CI/CD
.PHONY: ci-install
ci-install: ## Install dependencies for CI
	npm ci --prefer-offline --no-audit
	npx playwright install --with-deps

.PHONY: ci-test
ci-test: ## Run tests for CI
	npm run test:ci

.PHONY: ci-quality
ci-quality: ## Run quality checks for CI
	npm run lint
	npm run type-check
	npm run test:unit:coverage

.PHONY: ci-build
ci-build: ## Build for CI
	npm run build

.PHONY: ci-deploy
ci-deploy: ## Deploy for CI
	@echo "Deploying application..."
	# Add deployment commands here

# Utilities
.PHONY: update-snapshots
update-snapshots: ## Update visual test snapshots
	npx playwright test --update-snapshots

.PHONY: install-browsers
install-browsers: ## Install/update Playwright browsers
	npx playwright install

.PHONY: check-browsers
check-browsers: ## Check browser installation
	npx playwright install --dry-run

.PHONY: generate-types
generate-types: ## Generate TypeScript types
	npx tsc --declaration --emitDeclarationOnly --outDir types

# Performance
.PHONY: perf-test
perf-test: ## Run performance tests
	npm run test:performance

.PHONY: load-test
load-test: ## Run load tests
	npm run test:load

.PHONY: benchmark
benchmark: ## Run benchmark tests
	npm run test:benchmark

# Security
.PHONY: security-audit
security-audit: ## Run security audit
	npm audit
	npm audit fix

.PHONY: security-test
security-test: ## Run security tests
	npm run test:security

# Monitoring
.PHONY: health-check
health-check: ## Run health checks
	@echo "Running health checks..."
	node --version
	npm --version
	npx playwright --version

.PHONY: system-info
system-info: ## Show system information
	@echo "System Information:"
	@echo "Node.js: $(shell node --version)"
	@echo "NPM: $(shell npm --version)"
	@echo "Playwright: $(shell npx playwright --version)"
	@echo "OS: $(shell uname -s)"
	@echo "Architecture: $(shell uname -m)"

# Maintenance
.PHONY: update-deps
update-deps: ## Update dependencies
	npm update
	npm audit fix

.PHONY: outdated
outdated: ## Check for outdated dependencies
	npm outdated

.PHONY: cleanup
cleanup: clean ## Full cleanup including node_modules
	rm -rf node_modules/
	npm install

# All-in-one commands
.PHONY: full-test
full-test: quality test ## Run all quality checks and tests

.PHONY: ci-full
ci-full: ci-install ci-quality ci-test ci-build ## Complete CI pipeline

.PHONY: reset
reset: clean install ## Reset project to clean state

# Validate Makefile
.PHONY: validate
validate: ## Validate Makefile syntax
	@echo "Validating Makefile..."
	@make -n help > /dev/null && echo "✅ Makefile is valid"