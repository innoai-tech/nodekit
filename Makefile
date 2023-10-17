BUN = bun
BUNX = bunx --bun

serve:
	go run ./cmd/webappserve serve --help
	go run ./cmd/webappserve serve --root=./cmd/webappserve/example/normal

serve.base.href:
	go run ./cmd/webappserve serve --base-href=/example --root=./cmd/webappserve/example/base

tidy:
	go mod tidy

dep:
	$(BUN) install

dep.update:
	$(BUN) update --save --latest

bootstrap: dep build.monobundle
	$(BUNX) monobundle

build.monobundle:
	$(BUNX) turbo run build --filter=monobundle --force
	$(BUN) install

lint:
	$(BUNX) turbo run lint --force

test:
	$(BUNX) turbo run test --force

build:
	$(BUNX) turbo run build --filter=!monobundle --force

ci: bootstrap lint build test

pub:
	$(BUN) ./nodedevpkg/bunpublish/src/bin/index.ts publish

export BUILDKIT_HOST =
ship:
	wagon do go ship pushx

clean:
	find . -name 'node_modules' -type d -prune -print -exec rm -rf '{}' \;
