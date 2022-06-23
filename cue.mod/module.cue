module: "github.com/innai-tech/nodekit"

require: {
	"dagger.io":                      "v0.3.0"
	"github.com/innoai-tech/runtime": "v0.0.0-20220623082625-49393a572006"
}

require: {
	"universe.dagger.io": "v0.3.0" @indirect()
}
