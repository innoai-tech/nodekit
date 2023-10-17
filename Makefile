serve:
	go run ./cmd/webappserve serve --help
	go run ./cmd/webappserve serve --root=./cmd/webappserve/example/normal

serve.base.href:
	go run ./cmd/webappserve serve --base-href=/example --root=./cmd/webappserve/example/base

tidy:
	go mod tidy

update:
	bun update --latest

dep:
	bun install

bootstrap: dep build.monobundle
	bunx monobundle

build.monobundle:
	bunx turbo run build --filter=monobundle --force
	bun install

ci: lint test

lint:
	bunx turbo run lint --force

test:
	bunx turbo run test --force

build:
	bunx turbo run build --filter=!monobundle --force

pub:
	bun add -g pnpm
	pnpm -r publish --no-git-checks

export BUILDKIT_HOST =
ship:
	wagon do go ship pushx

clean:
	find . -name 'node_modules' -type d -prune -print -exec rm -rf '{}' \;
