module: "github.com/innai-tech/nodekit"

require: {
	"dagger.io":                      "v0.3.0"
	"github.com/innoai-tech/runtime": "v0.0.0-20221114082425-7a5e0cdc3035"
}

require: {
	"universe.dagger.io":  "v0.3.0"                             @indirect()
	"wagon.octohelm.tech": "v0.0.0-20200202235959-3d91e2e3161f" @indirect()
}
