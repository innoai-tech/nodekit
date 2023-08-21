package main

import (
	"strings"

	"wagon.octohelm.tech/core"

	"github.com/innoai-tech/runtime/cuepkg/golang"
)

pkg: version: core.#Version & {
}

actions: go: golang.#Project & {
	source: {
		path: "."
		include: [
			"cmd/",
			"pkg/",
			"go.mod",
			"go.sum",
		]
	}

	goos: ["linux", "darwin"]
	goarch: ["amd64", "arm64"]
	main:    "./cmd/webappserve"
	version: pkg.version.output

	ldflags: [
		"-s -w",
		"-X \(go.module)/cmd/webappserve.version=\(go.version)",
	]

	build: {
		pre: [
			"go mod download",
		]
	}

	ship: {
		name: "\(strings.Replace(actions.go.module, "github.com/", "ghcr.io/", -1))/webappserve"
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

setting: {
	_env: core.#ClientEnv & {
		GH_USERNAME: string | *""
		GH_PASSWORD: core.#Secret
	}

	setup: core.#Setting & {
		registry: "ghcr.io": auth: {
			username: _env.GH_USERNAME
			secret:   _env.GH_PASSWORD
		}
	}
}
