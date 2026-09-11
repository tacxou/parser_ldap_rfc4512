#!make

ifneq (,$(wildcard ./.env))
	include .env
	export
endif

.PHONY: help install build package docs-build lint typecheck format test test-coverage test-cli test-scripts ncu ncu-upgrade
.DEFAULT_GOAL := help
help:
	@printf "\033[33mUsage:\033[0m\n  make [target] [arg=\"val\"...]\n\n\033[33mTargets:\033[0m\n"
	@awk 'BEGIN { FS = ":.*##"; } /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

install: ## Install dependencies with Yarn Classic
	@yarn install

build: ## Type-check and build ESM, CommonJS, declarations and CLI
	@yarn build

package: ## Build, audit and smoke-test the npm tarball -> .artifacts/npm
	@yarn package

docs-build: ## Build the static documentation, llms.txt and llms-full.txt
	@yarn docs:build

lint: ## Check formatting and lint with Biome
	@yarn lint

typecheck: ## Type-check without emitting build artifacts
	@yarn typecheck

format: ## Apply safe Biome fixes and formatting
	@yarn lint:fix

test: ## Run the Vitest suite
	@yarn test

test-coverage: ## Run the Vitest suite with v8 coverage
	@yarn test:coverage

test-cli: ## Run the CLI regression suite
	@yarn test:cli

test-scripts: ## Test packaging and documentation tooling
	@yarn test:scripts

ncu: ## Check latest versions of all project dependencies
	@npx npm-check-updates

ncu-upgrade: ## Upgrade all project dependencies to the latest versions
	@npx npm-check-updates -u
