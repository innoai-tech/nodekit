serve:
	go run ./cmd/webappserve serve --help
	go run ./cmd/webappserve serve --root=./cmd/webappserve/example/normal

serve.base.href:
	go run ./cmd/webappserve serve --base-href=/example --root=./cmd/webappserve/example/base

tidy:
	go mod tidy

update:
	pnpm up -r --latest

dep:
	pnpm install

bootstrap: dep build.monobundle
	pnpm exec monobundle

build.monobundle:
	pnpm exec turbo run build --filter=monobundle --force
	pnpm install

ci: lint test

lint:
	pnpm exec turbo run lint --force

test:
	pnpm exec turbo run test --force

build:
	pnpm exec turbo run build --filter=!monobundle --force

pub:
	pnpm -r publish --no-git-checks

export BUILDKIT_HOST =
ship:
	wagon do go ship pushx

clean:
	find . -name 'node_modules' -type d -prune -print -exec rm -rf '{}' \;
