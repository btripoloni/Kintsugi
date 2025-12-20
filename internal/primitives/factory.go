package primitives

import (
	"fmt"
)

func New(op string) (Action, error) {
	switch op {
	case "fetch_local":
		return NewFetchLocal(), nil
	case "extract":
		return NewExtract(), nil
	case "copy":
		return NewCopy(), nil
	case "compose":
		return NewCompose(), nil
	default:
		return nil, fmt.Errorf("unknown operation: %s", op)
	}
}
