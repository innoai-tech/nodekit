export PRETTIER_EXPERIMENTAL_CLI := "1"

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

fmt:
    {{ turbo }} run fmt

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
    find . -type d \
         -name '.swc' \
         -o -name '.turbo' \
         -o -name 'node_modules' \
         -prune -print -exec rm -rf '{}' \;
