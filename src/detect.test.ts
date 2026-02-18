import { detectLlmSignal, isLlmRequest } from "./detect";

describe("detectLlmSignal", () => {
  describe("priority order", () => {
    it("prefers .md suffix over accept header", () => {
      const signal = detectLlmSignal("/pricing.md", "text/markdown", null);
      expect(signal).toEqual({
        type: "md-suffix",
        originalPath: "/pricing",
      });
    });

    it("prefers accept header over user-agent", () => {
      const signal = detectLlmSignal(
        "/pricing",
        "text/markdown",
        "ClaudeBot/1.0",
      );
      expect(signal).toEqual({
        type: "accept-header",
        quality: 1,
      });
    });

    it("falls back to user-agent when no other signals", () => {
      const signal = detectLlmSignal(
        "/pricing",
        "text/html",
        "ClaudeBot/1.0",
      );
      expect(signal).toEqual({
        type: "user-agent",
        botName: "ClaudeBot",
      });
    });
  });

  describe(".md suffix parsing", () => {
    it("strips .md and returns original path", () => {
      const signal = detectLlmSignal("/docs/getting-started.md", null, null);
      expect(signal).toEqual({
        type: "md-suffix",
        originalPath: "/docs/getting-started",
      });
    });

    it("returns / for root .md", () => {
      const signal = detectLlmSignal("/.md", null, null);
      expect(signal).toEqual({
        type: "md-suffix",
        originalPath: "/",
      });
    });

    it("can be disabled via config", () => {
      const signal = detectLlmSignal("/pricing.md", null, null, {
        enableMdSuffix: false,
      });
      expect(signal).toBeNull();
    });
  });

  describe("accept header quality", () => {
    it("parses quality parameter", () => {
      const signal = detectLlmSignal(
        "/pricing",
        "text/html, text/markdown;q=0.8",
        null,
      );
      expect(signal).toEqual({
        type: "accept-header",
        quality: 0.8,
      });
    });

    it("defaults quality to 1 when not specified", () => {
      const signal = detectLlmSignal(
        "/pricing",
        "text/markdown, text/html",
        null,
      );
      expect(signal).toEqual({
        type: "accept-header",
        quality: 1,
      });
    });

    it("ignores when text/markdown not present", () => {
      const signal = detectLlmSignal(
        "/pricing",
        "text/html, application/json",
        null,
      );
      expect(signal).toBeNull();
    });
  });

  describe("user-agent matching", () => {
    it("matches known bot user agents", () => {
      const bots = ["ChatGPT-User", "GPTBot", "PerplexityBot", "CCBot"];
      for (const bot of bots) {
        const signal = detectLlmSignal("/page", null, `${bot}/1.0`);
        expect(signal).toEqual({
          type: "user-agent",
          botName: bot,
        });
      }
    });

    it("matches additional custom bot patterns", () => {
      const signal = detectLlmSignal("/page", null, "MyCustomBot/2.0", {
        additionalBotUserAgents: ["MyCustomBot"],
      });
      expect(signal).toEqual({
        type: "user-agent",
        botName: "MyCustomBot",
      });
    });

    it("can be disabled via config", () => {
      const signal = detectLlmSignal("/page", null, "ClaudeBot/1.0", {
        enableUserAgentDetection: false,
      });
      expect(signal).toBeNull();
    });

    it("returns null for normal browser user agents", () => {
      const signal = detectLlmSignal(
        "/page",
        null,
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      );
      expect(signal).toBeNull();
    });
  });

  describe("returns null when no signal", () => {
    it("returns null for a normal browser request", () => {
      const signal = detectLlmSignal(
        "/pricing",
        "text/html,application/xhtml+xml",
        "Mozilla/5.0",
      );
      expect(signal).toBeNull();
    });
  });
});

describe("isLlmRequest", () => {
  it("returns true when a signal is detected", () => {
    expect(isLlmRequest("/pricing.md", null, null)).toBe(true);
  });

  it("returns false when no signal", () => {
    expect(isLlmRequest("/pricing", "text/html", "Mozilla/5.0")).toBe(false);
  });
});
