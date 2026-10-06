import type { ReactNode } from "react";

/**
 * A tiny, safe renderer for Saarthi's answers: paragraphs, bullet and
 * numbered lists, fenced code blocks, `inline code` and **bold**. It builds
 * React elements only (no HTML injection), so model output can never run
 * script in the page.
 */
export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) code.push(lines[i++]);
      i++; // closing fence
      blocks.push(
        <pre key={blocks.length} className="my-2 overflow-x-auto rounded-md border border-line bg-sunken p-2.5 font-mono text-[12px] leading-relaxed text-fg">
          {code.join("\n")}
        </pre>,
      );
      continue;
    }
    if (/^\s*[-*] /.test(line) || /^\s*\d+[.)] /.test(line)) {
      const ordered = /^\s*\d+[.)] /.test(line);
      const items: string[] = [];
      while (i < lines.length && (ordered ? /^\s*\d+[.)] /.test(lines[i]) : /^\s*[-*] /.test(lines[i]))) {
        items.push(lines[i].replace(/^\s*(?:[-*]|\d+[.)]) /, ""));
        i++;
      }
      const List = ordered ? "ol" : "ul";
      blocks.push(
        <List key={blocks.length} className={`my-1.5 flex flex-col gap-1 pl-5 ${ordered ? "list-decimal" : "list-disc"}`}>
          {items.map((item, n) => (
            <li key={n}>{inline(item)}</li>
          ))}
        </List>,
      );
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const size = level === 1 ? "text-[1.35em]" : level === 2 ? "text-[1.18em]" : "text-[1.05em]";
      blocks.push(
        <p key={blocks.length} role="heading" aria-level={level} className={`mb-1 mt-2.5 font-semibold tracking-tight ${size}`}>
          {inline(heading[2])}
        </p>,
      );
      i++;
      continue;
    }
    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !lines[i].startsWith("```") && !/^\s*(?:[-*]|\d+[.)]) /.test(lines[i]) && !/^#{1,6}\s/.test(lines[i])) {
      paragraph.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={blocks.length} className="my-1.5">
        {inline(paragraph.join(" "))}
      </p>,
    );
  }
  return <div className="text-[13px] leading-relaxed text-fg">{blocks}</div>;
}

function inline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index! > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    parts.push(
      token.startsWith("`") ? (
        <code key={parts.length} className="rounded bg-fg/8 px-1 py-px font-mono text-[12px]">
          {token.slice(1, -1)}
        </code>
      ) : (
        <strong key={parts.length} className="font-semibold">
          {token.slice(2, -2)}
        </strong>
      ),
    );
    last = match.index! + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
