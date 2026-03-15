import { describe, expect, test } from "bun:test";
import { UrlSource } from "../../../src/sources/UrlSource";

describe("UrlSource handler", () => {
  test("creates UrlSource with required fields", () => {
    const source = UrlSource({
      url: "https://example.com/mod.zip",
      sha256: "abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
    });

    expect(source.type).toBe("url");
    expect(source.url).toBe("https://example.com/mod.zip");
    expect(source.sha256).toBe("abc123def456abc123def456abc123def456abc123def456abc123def456abc1");
  });

  test("UrlSource validates url is provided", () => {
    expect(() => {
      UrlSource({ url: "", sha256: "abc123def456abc123def456abc123def456abc123def456abc123def456abc1" });
    }).toThrow();
  });

  test("UrlSource validates sha256 is 64 characters", () => {
    expect(() => {
      UrlSource({ url: "https://example.com/mod.zip", sha256: "short" });
    }).toThrow();
  });

  test("UrlSource validates sha256 is hex", () => {
    expect(() => {
      UrlSource({ url: "https://example.com/mod.zip", sha256: "gghhabcdef123456789abcdef123456789abcdef123456789abcdef12" });
    }).toThrow();
  });

  test("UrlSource handles optional unpack field", () => {
    const source = UrlSource({
      url: "https://example.com/mod.zip",
      sha256: "abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
      unpack: true,
    });

    expect(source.unpack).toBe(true);
  });

  test("UrlSource handles optional method field", () => {
    const source = UrlSource({
      url: "https://example.com/api/mod",
      sha256: "abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
      method: "POST",
    });

    expect(source.method).toBe("POST");
  });

  test("UrlSource defaults method to GET", () => {
    const source = UrlSource({
      url: "https://example.com/mod.zip",
      sha256: "abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
    });

    expect(source.method).toBe("GET");
  });

  test("UrlSource handles optional headers", () => {
    const source = UrlSource({
      url: "https://example.com/mod.zip",
      sha256: "abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
      headers: { "Authorization": "Bearer token123", "User-Agent": "kitsugi/1.0" },
    });

    expect(source.headers).toEqual({ "Authorization": "Bearer token123", "User-Agent": "kitsugi/1.0" });
  });

  test("UrlSource handles optional cookies", () => {
    const source = UrlSource({
      url: "https://example.com/mod.zip",
      sha256: "abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
      cookies: { "session": "abc123", "user": "gamer" },
    });

    expect(source.cookies).toEqual({ "session": "abc123", "user": "gamer" });
  });

  test("UrlSource handles optional body", () => {
    const source = UrlSource({
      url: "https://example.com/api/upload",
      sha256: "abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
      method: "POST",
      body: '{"name": "my-mod", "version": "1.0.0"}',
    });

    expect(source.body).toBe('{"name": "my-mod", "version": "1.0.0"}');
  });

  test("UrlSource has toJSON method", () => {
    const source = UrlSource({
      url: "https://example.com/mod.zip",
      sha256: "abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
      unpack: true,
    });

    const json = source.toJSON();
    expect(json.type).toBe("url");
    expect(json.url).toBe("https://example.com/mod.zip");
    expect(json.unpack).toBe(true);
  });
});
