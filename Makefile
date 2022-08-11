export GIT_SHA ?= $(shell git rev-parse HEAD)
export GIT_REF ?= HEAD

ship:
	dagger do go ship pushx

serve:
	go run ./cmd/webappserve serve --help
	go run ./cmd/webappserve serve --root=./cmd/webappserve/example/normal

serve.base.href:
	go run ./cmd/webappserve serve --base-href=/example --root=./cmd/webappserve/example/base

tidy:
	go mod tidy

up:
	pnpm up -r --latest

dep:
	pnpm install

fmt:
	./node_modules/.bin/prettier --write "@innoai-tech/{,**/}{,**/}*.{ts,tsx,json,md}"

test:
	./node_modules/.bin/vitest

bd:
	pnpx turbo run build --filter=monobundle
	pnpx turbo run build --filter=!monobundle

bd.force:
	pnpx turbo run build --force

pub: bd
	pnpm -r publish --no-git-checks
