import { htmlToMarkdown } from "./convert";

describe("htmlToMarkdown", () => {
  it("extracts content from <main> element", () => {
    const html = `
      <html>
        <body>
          <nav>Navigation</nav>
          <main><h1>Hello</h1><p>World</p></main>
          <footer>Footer</footer>
        </body>
      </html>
    `;
    const md = htmlToMarkdown(html);
    expect(md).toContain("# Hello");
    expect(md).toContain("World");
    expect(md).not.toContain("Navigation");
    expect(md).not.toContain("Footer");
  });

  it("falls back to <article> when no <main>", () => {
    const html = `
      <html>
        <body>
          <nav>Nav</nav>
          <article><h2>Article Title</h2><p>Content</p></article>
        </body>
      </html>
    `;
    const md = htmlToMarkdown(html);
    expect(md).toContain("## Article Title");
    expect(md).toContain("Content");
    expect(md).not.toContain("Nav");
  });

  it("falls back to <body> when no <main> or <article>", () => {
    const html = `
      <html>
        <body>
          <h1>Title</h1>
          <p>Body content</p>
        </body>
      </html>
    `;
    const md = htmlToMarkdown(html);
    expect(md).toContain("# Title");
    expect(md).toContain("Body content");
  });

  it("strips script and style elements", () => {
    const html = `
      <html>
        <body>
          <main>
            <script>alert('xss')</script>
            <style>.foo { color: red }</style>
            <p>Clean content</p>
          </main>
        </body>
      </html>
    `;
    const md = htmlToMarkdown(html);
    expect(md).toContain("Clean content");
    expect(md).not.toContain("alert");
    expect(md).not.toContain(".foo");
  });

  it("prepends title as h1 when no h1 exists", () => {
    const html = `
      <html>
        <head><title>My Page Title</title></head>
        <body>
          <main><p>Just a paragraph.</p></main>
        </body>
      </html>
    `;
    const md = htmlToMarkdown(html);
    expect(md).toMatch(/^# My Page Title/);
    expect(md).toContain("Just a paragraph.");
  });

  it("does not prepend title when h1 already exists", () => {
    const html = `
      <html>
        <head><title>Page Title</title></head>
        <body>
          <main><h1>Existing Heading</h1><p>Content</p></main>
        </body>
      </html>
    `;
    const md = htmlToMarkdown(html);
    expect(md).toContain("# Existing Heading");
    // Should not have title as a separate heading
    const h1Count = (md.match(/^# /gm) || []).length;
    expect(h1Count).toBe(1);
  });

  it("cleans up excessive whitespace", () => {
    const html = `
      <html>
        <body>
          <main>
            <p>First</p>



            <p>Second</p>
          </main>
        </body>
      </html>
    `;
    const md = htmlToMarkdown(html);
    // Should not have more than 2 consecutive newlines
    expect(md).not.toMatch(/\n{3,}/);
  });

  it("preserves links, lists, and code blocks", () => {
    const html = `
      <html>
        <body>
          <main>
            <h1>Test</h1>
            <a href="/docs">Docs Link</a>
            <ul><li>Item 1</li><li>Item 2</li></ul>
            <pre><code>const x = 1;</code></pre>
          </main>
        </body>
      </html>
    `;
    const md = htmlToMarkdown(html);
    expect(md).toContain("[Docs Link](/docs)");
    expect(md).toContain("Item 1");
    expect(md).toContain("Item 2");
    expect(md).toContain("const x = 1;");
  });
});
