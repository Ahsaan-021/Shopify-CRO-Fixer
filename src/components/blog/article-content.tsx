import Link from "next/link";
import type { ReactNode } from "react";

type Block =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "callout"; text: string };

function slugifyHeading(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function startsSpecialBlock(line: string) {
  return (
    line.startsWith("## ") ||
    line.startsWith("### ") ||
    /^[-*]\s+/.test(line) ||
    /^\d+\.\s+/.test(line) ||
    line.startsWith("> ")
  );
}

function parseBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, "\n").trim().split("\n");
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();

    if (!line) {
      index += 1;
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push({ type: "heading", level: 3, text: line.slice(4) });
      index += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push({ type: "heading", level: 2, text: line.slice(3) });
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length) {
        const itemLine = lines[index].trim();
        const match = /^[-*]\s+(.*)$/.exec(itemLine);
        if (!match) break;
        items.push(match[1]);
        index += 1;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length) {
        const itemLine = lines[index].trim();
        const match = /^\d+\.\s+(.*)$/.exec(itemLine);
        if (!match) break;
        items.push(match[1]);
        index += 1;
      }
      blocks.push({ type: "list", ordered: true, items });
      continue;
    }

    if (line.startsWith("> ")) {
      const parts: string[] = [];
      while (index < lines.length) {
        const quoteLine = lines[index].trim();
        if (!quoteLine.startsWith("> ")) break;
        parts.push(quoteLine.slice(2));
        index += 1;
      }
      blocks.push({ type: "callout", text: parts.join(" ") });
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length) {
      const paragraphLine = lines[index].trim();
      if (!paragraphLine || startsSpecialBlock(paragraphLine)) break;
      paragraph.push(paragraphLine);
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}

function renderInline(text: string): ReactNode[] {
  const tokenPattern = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(tokenPattern).filter((part) => part !== "");
  let key = 0;

  return parts.map((part) => {
    const strongMatch = /^\*\*([^*]+)\*\*$/.exec(part);
    if (strongMatch) {
      const strongKey = `strong-${key++}`;
      return (
        <strong key={strongKey} className="font-semibold text-ink">
          {strongMatch[1]}
        </strong>
      );
    }

    const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (linkMatch) {
      const linkKey = `link-${key++}`;
      const label = linkMatch[1];
      const href = linkMatch[2];
      const isInternal = href.startsWith("/") && !href.startsWith("//");
      const isExternal = /^https:\/\//i.test(href);
      const linkClass =
        "font-medium text-accent-dark underline decoration-accent/35 underline-offset-4 hover:decoration-accent";

      if (isInternal) {
        return (
          <Link key={linkKey} href={href} className={linkClass}>
            {label}
          </Link>
        );
      }

      if (isExternal) {
        return (
          <a
            key={linkKey}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            {label}
          </a>
        );
      }

      return <span key={linkKey}>{label}</span>;
    }

    return <span key={`text-${key++}`}>{part}</span>;
  });
}

export function getArticleHeadings(content: string) {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("## "))
    .map((line) => {
      const text = line.slice(3);
      return { text, id: slugifyHeading(text) };
    });
}

export function ArticleContent({ content }: { content: string }) {
  const blocks = parseBlocks(content);

  return (
    <div className="article-copy">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const id = slugifyHeading(block.text);
          if (block.level === 2) {
            return (
              <h2
                key={`${id}-${index}`}
                id={id}
                className="text-2xl font-bold tracking-tight text-ink sm:text-[1.75rem]"
              >
                {renderInline(block.text)}
              </h2>
            );
          }
          return (
            <h3
              key={`${id}-${index}`}
              id={id}
              className="text-xl font-semibold tracking-tight text-ink"
            >
              {renderInline(block.text)}
            </h3>
          );
        }

        if (block.type === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          return (
            <ListTag
              key={`list-${index}`}
              className={`space-y-2 pl-6 text-[1.02rem] leading-8 text-ink-soft ${
                block.ordered ? "list-decimal" : "list-disc"
              } marker:text-accent`}
            >
              {block.items.map((item, itemIndex) => (
                <li key={`item-${index}-${itemIndex}`} className="pl-1">
                  {renderInline(item)}
                </li>
              ))}
            </ListTag>
          );
        }

        if (block.type === "callout") {
          return (
            <aside
              key={`callout-${index}`}
              className="rounded-xl border border-accent/20 bg-accent-soft px-5 py-4 text-[0.95rem] leading-7 text-ink-soft"
            >
              <p>{renderInline(block.text)}</p>
            </aside>
          );
        }

        return (
          <p
            key={`paragraph-${index}`}
            className="text-[1.02rem] leading-8 text-ink-soft"
          >
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}
