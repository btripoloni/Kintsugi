package recipe

import (
	"encoding/json"
	"fmt"
)

type Fetcher interface {
	Type() string
}

type BaseFetcher struct {
	TypeStr string `json:"type"`
}

func (f BaseFetcher) Type() string {
	return f.TypeStr
}

type FetchUrl struct {
	BaseFetcher
	URL       string `json:"url"`
	SHA256    string `json:"sha256"`
	Unpack    bool   `json:"unpack,omitempty"`
	PostFetch string `json:"postFetch,omitempty"`
}

type FetchGit struct {
	BaseFetcher
	URL       string `json:"url"`
	Rev       string `json:"rev,omitempty"`
	Ref       string `json:"ref,omitempty"`
	PostFetch string `json:"postFetch,omitempty"`
}

type FetchLocal struct {
	BaseFetcher
	Path      string   `json:"path"`
	Exclude   []string `json:"exclude,omitempty"`
	PostFetch string   `json:"postFetch,omitempty"`
}

type FetchVase struct {
	BaseFetcher
	Vase string `json:"vase"`
}

type WriteText struct {
	BaseFetcher
	Path    string `json:"path"`
	Content string `json:"content"`
}

type WriteJson struct {
	BaseFetcher
	Path    string      `json:"path"`
	Content interface{} `json:"content"`
}

type WriteToml struct {
	BaseFetcher
	Path    string      `json:"path"`
	Content interface{} `json:"content"`
}

type FetchBuild struct {
	BaseFetcher
	Layers      []string          `json:"layers"`
	Entrypoint  string            `json:"entrypoint,omitempty"`
	Umu         string            `json:"umu,omitempty"`
	Args        []string          `json:"args,omitempty"`
	Env         map[string]string `json:"env,omitempty"`
	Permissions []string          `json:"permissions,omitempty"`
}

type RunInBuildCommand struct {
	Entrypoint string         `json:"entrypoint"`
	Args       []string       `json:"args,omitempty"`
	Umu        *RunInBuildUmu `json:"umu,omitempty"`
}

type RunInBuildUmu struct {
	Version string `json:"version"`
	ID      string `json:"id"`
}

type RunInBuild struct {
	BaseFetcher
	Build   string            `json:"build"` // Hash of the build derivation
	Command RunInBuildCommand `json:"command"`
	Outputs []string          `json:"outputs"`
}

type BlankSource struct {
	BaseFetcher
	// This source is intentionally blank and ignored by the compiler
	// It serves as a placeholder for shards to be inserted later
}

// RunSpec represents the content of a .run.json file created by writeRunSpec
type RunSpec struct {
	Entrypoint string            `json:"entrypoint"`
	Umu        *RunSpecUmu       `json:"umu,omitempty"`
	Args       []string          `json:"args,omitempty"`
	Env        map[string]string `json:"env,omitempty"`
}

// RunSpecUmu represents UMU configuration in a RunSpec
type RunSpecUmu struct {
	Version string `json:"version"`
	ID      string `json:"id"`
}

type Derivation struct {
	Out          string   `json:"out"`
	Src          Fetcher  `json:"src"`
	Dependencies []string `json:"dependencies,omitempty"`
	Permissions  []string `json:"permissions,omitempty"`
	Postbuild    string   `json:"postbuild,omitempty"`
}

func (d *Derivation) UnmarshalJSON(data []byte) error {
	type Alias Derivation
	aux := &struct {
		Src json.RawMessage `json:"src"`
		*Alias
	}{
		Alias: (*Alias)(d),
	}
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	if aux.Src == nil {
		return nil
	}

	var base BaseFetcher
	if err := json.Unmarshal(aux.Src, &base); err != nil {
		return err
	}

	var src Fetcher
	switch base.TypeStr {
	case "fetch_url":
		var f FetchUrl
		if err := json.Unmarshal(aux.Src, &f); err != nil {
			return err
		}
		src = &f
	case "fetch_git":
		var f FetchGit
		if err := json.Unmarshal(aux.Src, &f); err != nil {
			return err
		}
		src = &f
	case "fetch_local":
		var f FetchLocal
		if err := json.Unmarshal(aux.Src, &f); err != nil {
			return err
		}
		src = &f
	case "fetch_vase":
		var f FetchVase
		if err := json.Unmarshal(aux.Src, &f); err != nil {
			return err
		}
		src = &f
	case "write_text":
		var f WriteText
		if err := json.Unmarshal(aux.Src, &f); err != nil {
			return err
		}
		src = &f
	case "write_json":
		var f WriteJson
		if err := json.Unmarshal(aux.Src, &f); err != nil {
			return err
		}
		src = &f
	case "write_toml":
		var f WriteToml
		if err := json.Unmarshal(aux.Src, &f); err != nil {
			return err
		}
		src = &f
	case "fetch_build":
		var f FetchBuild
		if err := json.Unmarshal(aux.Src, &f); err != nil {
			return err
		}
		src = &f
	case "run_in_build":
		var f RunInBuild
		if err := json.Unmarshal(aux.Src, &f); err != nil {
			return err
		}
		src = &f
	case "blank_source":
		var f BlankSource
		if err := json.Unmarshal(aux.Src, &f); err != nil {
			return err
		}
		src = &f
	default:
		return fmt.Errorf("unknown fetcher type: %s", base.TypeStr)
	}

	d.Src = src
	return nil
}
