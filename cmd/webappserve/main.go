package main

import (
	"context"
	"github.com/innoai-tech/infra/pkg/cli"
	"github.com/innoai-tech/infra/pkg/http/webapp"
	"github.com/innoai-tech/infra/pkg/otel"
)

var (
	version = "devel"
)

var App = cli.NewApp(
	"webappserve",
	version,
	cli.WithImageNamespace("ghcr.io/octohelm"),
)

type Serve struct {
	cli.C
	otel.Otel
	webapp.Server
}

func main() {
	cli.AddTo(App, &Serve{})
	cli.Exec(context.Background(), App)
}
