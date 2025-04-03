monobundle := "bunx --bun ./nodedevpkg/monobundle/src/bin/index.ts"
bunx := "bunx --bun"
turbo := "bunx --bun turbo"

serve:
    go run ./cmd/webappserve serve --help
    go run ./cmd/webappserve serve --root=./cmd/webappserve/example/normal

serve-base-href:
    go run ./cmd/webappserve serve --base-href=/example --root=./cmd/webappserve/example/base

tidy:
    go mod tidy

dep:
    bun install

update:
    {{ bunx }} taze -w -r latest

bootstrap: build-monobundle
    {{ bunx }} monobundle

build-monobundle:
    {{ turbo }} run build --filter="@innoai-tech/monobundle" --force
    bun install

lint:
    {{ turbo }} run lint --filter="@innoai-tech/monobundle" --force

test:
    bun test

build:
    {{ turbo }} run build --filter="!@innoai-tech/monobundle" --force --concurrency=1

ci: bootstrap build test

pub:
    {{ bunx }} @morlay/bunpublish

ship:
    TTY=0 piper do ship push

clean:
    find . -name '.turbo' -type d -prune -print -exec rm -rf '{}' \;
    find . -name 'node_modules' -type d -prune -print -exec rm -rf '{}' \;
    rm -f bun.lock
