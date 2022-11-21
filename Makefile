export GIT_SHA ?= $(shell git rev-parse HEAD)
export GIT_REF ?= HEAD

serve:
	go run ./cmd/webappserve serve --help
	go run ./cmd/webappserve serve --root=./cmd/webappserve/example/normal

serve.base.href:
	go run ./cmd/webappserve serve --base-href=/example --root=./cmd/webappserve/example/base

dev:
	pnpm exec turbo run dev --filter=example

tidy:
	go mod tidy

update:
	pnpm up -r --latest

dep:
	pnpm install
	pnpm exec turbo run build --filter=monobundle --force
	pnpm install

bootstrap:
	pnpm exec turbo run build --filter=monobundle --force
	pnpm exec monobundle

ci: lint test

lint:
	pnpm exec turbo run lint --force

test:
	pnpm exec turbo run test

build:
	pnpm exec turbo run build --filter=!monobundle --force

pub:
	pnpm -r publish --no-git-checks

ship:
	dagger do go ship pushx

#save:
	#dagger --log-level=debug do go ship save linux/arm64
#
#devkit.save:
#	dagger --log-level=debug do go devkit save linux/arm64
