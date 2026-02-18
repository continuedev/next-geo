import {
  routePathToUrl,
  extractTitle,
  extractDescription,
} from "./llms-txt";

describe("routePathToUrl", () => {
  it("returns / for empty string", () => {
    expect(routePathToUrl("")).toBe("/");
  });

  it("strips route group prefixes", () => {
    expect(routePathToUrl("(main-layout)/pricing")).toBe("/pricing");
  });

  it("strips nested route group prefixes", () => {
    expect(routePathToUrl("(main-layout)/(marketing)/about")).toBe("/about");
  });

  it("preserves non-group segments", () => {
    expect(routePathToUrl("docs/getting-started")).toBe(
      "/docs/getting-started",
    );
  });

  it("handles route group at root only", () => {
    expect(routePathToUrl("(homepage)")).toBe("/");
  });

  it("handles mixed groups and segments", () => {
    expect(routePathToUrl("(main-layout)/docs/(reference)/api")).toBe(
      "/docs/api",
    );
  });
});

describe("extractTitle", () => {
  it("extracts first h1 heading", () => {
    expect(extractTitle("# Hello World\n\nSome content")).toBe("Hello World");
  });

  it("returns undefined when no heading", () => {
    expect(extractTitle("Just some text")).toBeUndefined();
  });

  it("extracts h1 even when not first line", () => {
    expect(extractTitle("Some preamble\n\n# The Title\n\nContent")).toBe(
      "The Title",
    );
  });

  it("ignores h2 and lower", () => {
    expect(extractTitle("## Not a title\n\nContent")).toBeUndefined();
  });
});

describe("extractDescription", () => {
  it("extracts first paragraph after heading", () => {
    expect(extractDescription("# Title\n\nThis is the description.")).toBe(
      "This is the description.",
    );
  });

  it("skips headings and blockquotes", () => {
    const md = "# Title\n> Quote\n\nActual description";
    expect(extractDescription(md)).toBe("Actual description");
  });

  it("skips list items", () => {
    const md = "# Title\n- Item\n\nDescription after list";
    expect(extractDescription(md)).toBe("Description after list");
  });

  it("returns undefined for empty content", () => {
    expect(extractDescription("")).toBeUndefined();
  });

  it("returns undefined for heading-only content", () => {
    expect(extractDescription("# Just a Heading")).toBeUndefined();
  });
});
