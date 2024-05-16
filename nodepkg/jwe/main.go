package main

import (
	"syscall/js"

	"github.com/lestrrat-go/jwx/v2/jwa"
	"github.com/lestrrat-go/jwx/v2/jwe"
	"github.com/lestrrat-go/jwx/v2/jwk"
)

func main() {
	js.Global().Set("__go_jwe_encrypt", js.FuncOf(func(this js.Value, args []js.Value) any {
		if len(args) != 2 {
			return nil
		}
		return encrypt(args[0].String(), args[1].String())
	}))
	select {}
}

//go:wasm-module jwe
//export encrypt
func encrypt(payload string, kjson string) string {
	ret, _ := jweEncrypt(payload, kjson)
	return ret
}

func jweEncrypt(payload string, kjson string) (string, error) {
	key, err := jwk.ParseKey([]byte(kjson))
	if err != nil {
		return "", err
	}

	pubKey, err := key.PublicKey()
	if err != nil {
		return "", err
	}

	ret, err := jwe.Encrypt(
		[]byte(payload),
		jwe.WithKey(key.Algorithm(), pubKey),
		jwe.WithContentEncryption(jwa.A256GCM),
	)

	if err != nil {
		return "", err
	}

	return string(ret), nil
}
