module: "github.com/innai-tech/nodekit"

require: {
	"dagger.io":                      "v0.3.0"
	"github.com/innoai-tech/runtime": "v0.0.0-20220811070139-d4617ab0d757"
}

require: {
	"universe.dagger.io": "v0.3.0" @indirect()
}
