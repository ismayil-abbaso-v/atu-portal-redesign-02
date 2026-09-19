import katex from "katex";
import "katex/dist/katex.min.css";
import { Fragment, type CSSProperties, type ReactNode } from "react";

import { isSafeExamImageSrc } from "@/lib/exam-answer-utils";

function decodeHtml(value: string): string {
  return value
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

function renderFormula(latex: string, key: string): ReactNode {
  const source = decodeHtml(latex).trim();
  if (!source) return null;

  try {
    return (
      <span
        key={key}
        className="inline-block align-middle [&_.katex]:text-[1em]"
        dangerouslySetInnerHTML={{
          __html: katex.renderToString(source, {
            throwOnError: false,
            strict: "ignore",
            output: "html",
          }),
        }}
      />
    );
  } catch {
    return <span key={key}>{source}</span>;
  }
}

function renderTextNode(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const formulaPattern = /\$([^$\n]+)\$/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = formulaPattern.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(<Fragment key={`${keyPrefix}-text-${key++}`}>{text.slice(last, match.index)}</Fragment>);
    }
    parts.push(renderFormula(match[1] ?? "", `${keyPrefix}-formula-${key++}`));
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push(<Fragment key={`${keyPrefix}-text-${key++}`}>{text.slice(last)}</Fragment>);
  }

  return parts.length > 0 ? parts : [<Fragment key={`${keyPrefix}-text`}>{text}</Fragment>];
}

function imageStyle(element: HTMLImageElement): CSSProperties {
  const style: CSSProperties = {
    maxWidth: "100%",
    height: "auto",
    verticalAlign: "middle",
  };

  const width = element.style.width;
  const maxHeight = element.style.maxHeight;
  const display = element.style.display;
  const margin = element.style.margin;
  const verticalAlign = element.style.verticalAlign;

  if (width && /^(auto|\d+(?:\.\d+)?(?:px|%|em|rem|vw|vh))$/i.test(width)) style.width = width;
  if (maxHeight && /^(none|\d+(?:\.\d+)?(?:px|%|em|rem|vw|vh))$/i.test(maxHeight)) style.maxHeight = maxHeight;
  if (display && /^(inline|inline-block|block)$/i.test(display)) style.display = display;
  if (margin && /^[\d.]+(?:px|%|em|rem)(?:\s+[\d.]+(?:px|%|em|rem)){0,3}$/.test(margin)) style.margin = margin;
  if (verticalAlign && /^(baseline|middle|top|bottom|text-top|text-bottom)$/i.test(verticalAlign)) style.verticalAlign = verticalAlign;

  return style;
}

function renderHtmlNode(node: Node, key: string): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return <Fragment key={key}>{renderTextNode(node.textContent ?? "", key)}</Fragment>;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();

  if (tag === "br") return <br key={key} />;

  if (tag === "img") {
    const img = element as HTMLImageElement;
    const src = img.getAttribute("src");
    if (!isSafeExamImageSrc(src)) return null;

    return (
      <img
        key={key}
        src={src}
        alt={img.getAttribute("alt") || ""}
        className="inline-block max-w-full rounded border border-border/50 bg-white object-contain"
        style={imageStyle(img)}
      />
    );
  }

  // Only render harmless formatting containers. Scripts, links, iframes and
  // event-handler attributes are deliberately ignored.
  const allowedTags = new Set(["p", "div", "span", "strong", "b", "em", "i", "u", "s", "sub", "sup"]);
  if (!allowedTags.has(tag)) {
    return <Fragment key={key}>{Array.from(element.childNodes).map((child, index) => renderHtmlNode(child, `${key}-${index}`))}</Fragment>;
  }

  const children = Array.from(element.childNodes).map((child, index) => renderHtmlNode(child, `${key}-${index}`));
  const textAlign = element.style.textAlign;
  const style: CSSProperties = /^(left|center|right|justify)$/i.test(textAlign) ? { textAlign: textAlign as CSSProperties["textAlign"] } : {};

  switch (tag) {
    case "p":
      return <p key={key} style={style}>{children}</p>;
    case "div":
      return <div key={key} style={style}>{children}</div>;
    case "strong":
    case "b":
      return <strong key={key}>{children}</strong>;
    case "em":
    case "i":
      return <em key={key}>{children}</em>;
    case "u":
      return <u key={key}>{children}</u>;
    case "s":
      return <s key={key}>{children}</s>;
    case "sub":
      return <sub key={key}>{children}</sub>;
    case "sup":
      return <sup key={key}>{children}</sup>;
    default:
      return <span key={key}>{children}</span>;
  }
}

/**
 * Renders formats stored by the original exam portal:
 * - KaTeX spans with data-latex
 * - $...$ inline LaTeX
 * - <br> line breaks
 * - legacy rich HTML such as <img src="data:image/..."> inside question text
 *
 * HTML is parsed and rendered through a strict allow-list. In particular,
 * image sources are accepted only when they pass isSafeExamImageSrc(), so the
 * legacy embedded base64 images work without turning arbitrary HTML into a
 * raw dangerouslySetInnerHTML surface.
 */
export function ExamMathText({ text, className }: { text: string | null | undefined; className?: string }) {
  const source = String(text ?? "");

  if (!source) return <span className={className}>{source}</span>;

  // Parse the legacy HTML directly. The old exam portal stores DOCX images as
  // real <img src="data:image/..."> tags inside question.text. The previous
  // renderer treated those tags as ordinary text, which is why students saw
  // the entire img markup instead of the image.
  if (/<(?:img|br|p|div|span)\b/i.test(source)) {
    const doc = new DOMParser().parseFromString(source, "text/html");
    const nodes = Array.from(doc.body.childNodes).map((node, index) => renderHtmlNode(node, `html-${index}`));
    return <span className={className}>{nodes}</span>;
  }

  return <span className={className}>{renderTextNode(source, "plain")}</span>;
}
