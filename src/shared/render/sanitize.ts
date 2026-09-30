import sanitizeHtml from "sanitize-html";

export function cleanHtml(html: string) {
  return sanitizeHtml(html ?? "", {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "a", "ul", "ol", "li", "h2", "h3", "h4", "blockquote", "span", "mark", "hr", "code"],
    allowedAttributes: { a: ["href", "target", "rel"], span: ["style"], p: ["style"], h2: ["style"], h3: ["style"], h4: ["style"], mark: ["style"] },
    allowedStyles: {
      "*": {
        color: [/^#[0-9a-f]{3,8}$/i, /^rgb\([\d\s,.%]+\)$/i, /^var\(--fp-[a-z]+\)$/],
        "text-align": [/^(left|right|center|justify)$/],
        "font-size": [/^\d+(px|em|rem|%)$/],
      },
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }) },
  });
}
