package recipe

type SourceType string

const (
	SourceLocal SourceType = "local"
	SourceURL   SourceType = "url"
	SourceBuild SourceType = "build"
	SourceVase  SourceType = "vase"
)

type Source struct {
	Source      SourceType        `json:"source"`
	Path        string            `json:"path,omitempty"`
	URL         string            `json:"url,omitempty"`
	SHA256      string            `json:"sha256,omitempty"`
	Vase        string            `json:"vase,omitempty"`
	Unpack      bool              `json:"unpack,omitempty"`
	Run         string            `json:"run,omitempty"`
	Layers      []string          `json:"layers,omitempty"`
	Entrypoint  string            `json:"entrypoint,omitempty"`
	Umu         string            `json:"umu,omitempty"`
	Args        []string          `json:"args,omitempty"`
	Env         map[string]string `json:"env,omitempty"`
	Permissions []string          `json:"permissions,omitempty"`
}

type Derivation struct {
	Out          string   `json:"out"`
	Src          Source   `json:"src"`
	Dependencies []string `json:"dependencies,omitempty"`
	Permissions  []string `json:"permissions,omitempty"`
	Postbuild    string   `json:"postbuild,omitempty"`
}
