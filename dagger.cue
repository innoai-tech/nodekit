package main

import (
	"strings"
	"dagger.io/dagger"

	"github.com/innoai-tech/runtime/cuepkg/tool"
	"github.com/innoai-tech/runtime/cuepkg/golang"
)

dagger.#Plan

client: env: {
	VERSION: string | *"dev"
	GIT_SHA: string | *""
	GIT_REF: string | *""

	GOPROXY:   string | *""
	GOPRIVATE: string | *""
	GOSUMDB:   string | *""

	GH_USERNAME: string | *""
	GH_PASSWORD: dagger.#Secret

	LINUX_MIRROR:                  string | *""
	CONTAINER_REGISTRY_PULL_PROXY: string | *""
}

actions: version: tool.#ResolveVersion & {
	ref:     "\(client.env.GIT_REF)"
	version: "\(client.env.VERSION)"
}

actions: go: golang.#Project & {
	mirror: {
		linux: client.env.LINUX_MIRROR
		pull:  client.env.CONTAINER_REGISTRY_PULL_PROXY
	}

	auths: "ghcr.io": {
		username: client.env.GH_USERNAME
		secret:   client.env.GH_PASSWORD
	}

	source: {
		path: "."
		include: [
			"cmd/",
			"pkg/",
			"go.mod",
			"go.sum",
		]
	}

	version:  actions.version.output
	revision: client.env.GIT_SHA

	goos: ["linux", "darwin"]
	goarch: ["amd64", "arm64"]
	main: "./cmd/webappserve"
	ldflags: [
		"-s -w",
		"-X \(go.module)/cmd/webappserve.version=\(go.version)",
		"-X \(go.module)/cmd/webappserve.revision=\(go.revision)",
	]
	env: {
		GOPROXY:   client.env.GOPROXY
		GOPRIVATE: client.env.GOPRIVATE
		GOSUMDB:   client.env.GOSUMDB
	}

	build: {
		pre: [
			"go mod download",
		]
	}

	ship: {
		name: "\(strings.Replace(actions.go.module, "github.com/", "ghcr.io/", -1))/\(go.binary)"
		from: "gcr.io/distroless/static-debian11:debug"
		config: {
			env: {
				APP_ROOT: "/app"
				ENV:      ""
			}
			cmd: [
				"serve",
			]
		}
	}
}

client: filesystem: ".build/output": write: contents: actions.go.archive.output
