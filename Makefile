BUN = bun
BUNX = bunx --bun
MONOBUNDLE = $(BUN) ./nodedevpkg/monobundle/src/bin/index.ts

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
	$(BUNX) taze -w -r latest

bootstrap: build.monobundle
	$(BUNX) monobundle

build.monobundle:
	$(BUNX) turbo run build --filter="@innoai-tech/monobundle" --force
	$(BUN) install

lint:
	$(BUNX) turbo run lint --filter="@innoai-tech/monobundle" --force

test:
	$(BUN) test

build:
	$(BUNX) turbo run build --filter="!@innoai-tech/monobundle" --force --concurrency=1

ci: bootstrap build test

pub:
	$(BUNX) @morlay/bunpublish

ship:
	TTY=0 piper do ship push

clean:
	find . -name '.turbo' -type d -prune -print -exec rm -rf '{}' \;
	find . -name 'node_modules' -type d -prune -print -exec rm -rf '{}' \;
	rm -f bun.lockb
