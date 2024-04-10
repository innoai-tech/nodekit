package main

import (
	"strings"

	"piper.octohelm.tech/wd"
	"piper.octohelm.tech/client"
	"piper.octohelm.tech/container"

	"github.com/octohelm/piper/cuepkg/golang"
	"github.com/octohelm/piper/cuepkg/containerutil"
)

hosts: {
	local: wd.#Local & {
	}
}

ver: client.#RevInfo & {
}

actions: go: golang.#ContainerBuild & {
	source: {
		cwd: hosts.local.dir
		include: [
			"cmd/",
			"go.mod",
			"go.sum",
		]
	}
	module:  _
	main:    "./cmd/webappserve"
	version: ver.version
	goos: [
		"linux",
	]
	goarch: [
		"amd64",
		"arm64",
	]
	ldflags: [
		"-s", "-w",
		"-X", "\(module)/cmd/webappserve.version=\(version)",
	]
	env: {
		GOEXPERIMENT: "rangefunc"
	}
}

actions: ship: containerutil.#Ship & {
	name: "\(strings.Replace(actions.go.module, "github.com/", "ghcr.io/", -1))/webappserve"
	tag:  "\(ver.version)"
	from: "gcr.io/distroless/static-debian12:debug"

	steps: [
		{
			input: _

			_bin: container.#SourceFile & {
				file: actions.go.dump[input.platform].file
			}

			_copy: container.#Copy & {
				"input":    input
				"contents": _bin.output
				"dest":     "/"
			}

			output: _copy.output
		},

		container.#Set & {
			config: {
				workdir: "/"
				entrypoint: [
					"/\(actions.go.bin)",
				]
				cmd: ["serve"]
			}
		},
	]
}

settings: {
	_env: client.#Env & {
		GH_USERNAME!: string
		GH_PASSWORD!: client.#Secret
	}

	registry: container.#Config & {
		auths: "ghcr.io": {
			username: _env.GH_USERNAME
			secret:   _env.GH_PASSWORD
		}
	}
}
