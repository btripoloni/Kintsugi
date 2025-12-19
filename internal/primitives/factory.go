package primitives

import (
	"fmt"
)

func New(op string) (Action, error) {
	switch op {
	case "fetch_local":
		return NewFetchLocal(), nil
	default:
		return nil, fmt.Errorf("unknown operation: %s", op)
	}
}
