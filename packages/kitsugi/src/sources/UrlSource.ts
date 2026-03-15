export interface UrlSourceOptions {
  url: string;
  sha256: string;
  unpack?: boolean;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  body?: string;
}

export interface UrlSourceResult {
  type: "url";
  url: string;
  sha256: string;
  unpack?: boolean;
  method: "GET" | "POST";
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  body?: string;
  toJSON(): UrlSourceResult;
}

function isValidHex(str: string): boolean {
  return /^[a-f0-9]+$/.test(str);
}

export function UrlSource(options: UrlSourceOptions): UrlSourceResult {
  if (!options.url || options.url.trim() === "") {
    throw new Error("UrlSource: url is required");
  }

  if (!options.sha256 || options.sha256.length !== 64) {
    throw new Error("UrlSource: sha256 must be 64 characters");
  }

  if (!isValidHex(options.sha256)) {
    throw new Error("UrlSource: sha256 must be valid hex");
  }

  const result: UrlSourceResult = {
    type: "url",
    url: options.url,
    sha256: options.sha256,
    unpack: options.unpack,
    method: options.method || "GET",
    headers: options.headers,
    cookies: options.cookies,
    body: options.body,
    toJSON() {
      return {
        type: this.type,
        url: this.url,
        sha256: this.sha256,
        unpack: this.unpack,
        method: this.method,
        headers: this.headers,
        cookies: this.cookies,
        body: this.body,
      };
    },
  };

  return result;
}
