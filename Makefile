export GIT_SHA ?= $(shell git rev-parse HEAD)
export GIT_REF ?= HEAD

go.test:
	go test -v -race ./pkg/...

go.tidy:
	go mod tidy

node.dep:
	pnpm install

node.upgrade:
	pnpm up -r --latest

node.fmt:
	./node_modules/.bin/prettier --write "nodepkg/{,**/}{,**/}*.{ts,tsx,json,md}"

node.test:
	./node_modules/.bin/jest nodepkg

node.build: node.dep
	pnpm -r --filter=!monobundle exec ../../../node_modules/.bin/monobundle

node.pub:
	pnpm -r publish --no-git-checks
