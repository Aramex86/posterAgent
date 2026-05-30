import { chromium } from "playwright";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const IMAGES_DIR = join(process.cwd(), "generated-images");

function escapeHtml(unsafe: string): string {
  return unsafe
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function highlightCode(code: string): string {
  let html = escapeHtml(code);

  // Comments
  html = html.replace(
    /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
    '<span class="comment">$1</span>',
  );

  // Strings
  html = html.replace(
    /(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g,
    '<span class="string">$1$2$1</span>',
  );

  // Keywords
  const keywords = [
    "const",
    "let",
    "var",
    "function",
    "return",
    "if",
    "else",
    "for",
    "while",
    "import",
    "export",
    "from",
    "default",
    "async",
    "await",
    "try",
    "catch",
    "class",
    "extends",
    "new",
    "this",
    "typeof",
    "instanceof",
    "null",
    "undefined",
    "true",
    "false",
    "switch",
    "case",
    "break",
    "continue",
    "throw",
    "yield",
    "interface",
    "type",
    "enum",
    "declare",
    "namespace",
    "module",
    "public",
    "private",
    "protected",
    "readonly",
    "static",
    "abstract",
    "implements",
    "constructor",
    "super",
    "void",
    "any",
    "number",
    "string",
    "boolean",
    "React",
    "useState",
    "useEffect",
    "useMemo",
    "useCallback",
    "useRef",
    "useContext",
    "useReducer",
    "useLayoutEffect",
    "useImperativeHandle",
  ];
  const keywordRegex = new RegExp(`\\b(${keywords.join("|")})\\b`, "g");
  html = html.replace(keywordRegex, '<span class="keyword">$1</span>');

  // Functions
  html = html.replace(
    /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g,
    '<span class="function">$1</span>',
  );

  // Numbers
  html = html.replace(/\b\d+\.?\d*\b/g, '<span class="number">$&</span>');

  // JSX tags
  html = html.replace(
    /(&lt;\/?)([a-zA-Z][a-zA-Z0-9]*)/g,
    '$1<span class="jsx-tag">$2</span>',
  );

  // JSX attributes
  html = html.replace(
    /\s([a-zA-Z][a-zA-Z0-9]*)(=)/g,
    ' <span class="jsx-attr">$1</span>$2',
  );

  return html;
}

function buildHtmlTemplate(code: string): string {
  const highlightedCode = highlightCode(code);
  const lines = code.split("\n");
  const lineNumbers = lines
    .map(
      (_, i) =>
        `<span class="line-num">${String(i + 1).padStart(2, " ")}</span>`,
    )
    .join("\n");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0d1117;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 80px 60px;
      font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, monospace;
    }
    .window {
      background: #161b22;
      border-radius: 12px;
      border: 1px solid #30363d;
      width: 100%;
      max-width: 900px;
      overflow: hidden;
      box-shadow:
        0 0 0 1px rgba(0, 0, 0, 0.3),
        0 20px 50px -10px rgba(0, 0, 0, 0.5),
        0 50px 100px -20px rgba(0, 0, 0, 0.4);
    }
    .chrome {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px 20px;
      background: #21262d;
      border-bottom: 1px solid #30363d;
    }
    .dots { display: flex; gap: 8px; }
    .dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    .red { background: #ff5f56; }
    .yellow { background: #ffbd2e; }
    .green { background: #27c93f; }
    .title {
      margin-left: 12px;
      color: #8b949e;
      font-size: 12px;
      font-weight: 500;
    }
    .content {
      padding: 24px 0;
      overflow-x: auto;
    }
    .code-container {
      display: flex;
    }
    .line-numbers {
      padding: 0 16px 0 24px;
      color: #484f58;
      font-size: 14px;
      line-height: 1.6;
      text-align: right;
      user-select: none;
      border-right: 1px solid #21262d;
    }
    .line-num { display: block; }
    .code-block {
      padding: 0 24px;
      flex: 1;
      overflow-x: auto;
    }
    pre {
      font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, monospace;
      font-size: 14px;
      line-height: 1.6;
      color: #c9d1d9;
      white-space: pre;
      word-wrap: normal;
    }
    .keyword { color: #ff7b72; }
    .string { color: #a5d6ff; }
    .function { color: #d2a8ff; }
    .comment { color: #8b949e; font-style: italic; }
    .number { color: #79c0ff; }
    .jsx-tag { color: #7ee787; }
    .jsx-attr { color: #79c0ff; }
    .operator { color: #ff7b72; }
    .punctuation { color: #c9d1d9; }
  </style>
</head>
<body>
  <div class="window">
    <div class="chrome">
      <div class="dots">
        <div class="dot red"></div>
        <div class="dot yellow"></div>
        <div class="dot green"></div>
      </div>
      <span class="title">App.jsx</span>
    </div>
    <div class="content">
      <div class="code-container">
        <div class="line-numbers">${lineNumbers}</div>
        <div class="code-block">
          <pre><code>${highlightedCode}</code></pre>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

const sampleCode = `import { useCallback } from "react";

export default function ProductPage({ productId, referrer })
{
  const handleSubmit = useCallback(
    (orderDetails) => {
      post("/product/" + productId + "/buy", { referrer,
orderDetails });
    },
    [productId, referrer],
  );

  return <ShippingForm onSubmit={handleSubmit} />;
}`;

async function main() {
  if (!existsSync(IMAGES_DIR)) {
    mkdirSync(IMAGES_DIR, { recursive: true });
  }

  const outputPath = join(IMAGES_DIR, "test_ray_so_style.png");
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    const html = buildHtmlTemplate(sampleCode);

    await page.setViewportSize({ width: 1000, height: 800 });
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const windowElement = page.locator(".window");
    await windowElement.screenshot({
      path: outputPath,
      type: "png",
    });

    console.log(`✅ Test image generated: ${outputPath}`);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
