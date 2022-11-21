module: "github.com/innai-tech/nodekit"

require: {
	"dagger.io":                      "v0.3.0"
	"github.com/innoai-tech/runtime": "v0.0.0-20221114082425-7a5e0cdc3035"
}

require: {
	"universe.dagger.io": "v0.3.0" @indirect()
}
