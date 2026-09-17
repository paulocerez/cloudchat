import type { ReactNode } from 'react';

// Pocket returns its summary as markdown with two custom block tags mixed in:
//
//   <pocket:timeline title="…">      rows of `when | where | what`
//   <pocket:decision-tree title="…"> `start::question`, `- label => key`,
//                                    then `key::heading` + description lines
//
// Rendering them raw dumps XML into the page, and a stock markdown renderer
// would too, so the summary is parsed here instead of pulling in a dependency.

type Block =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'timeline'; title: string; rows: string[][] }
  | { kind: 'tree'; title: string; question: string; branches: Branch[] };

interface Branch {
  label: string; // the option the user picks
  heading: string; // the archetype/outcome name
  body: string;
}

const CUSTOM = /<pocket:(timeline|decision-tree)\s+title="([^"]*)"\s*>([\s\S]*?)<\/pocket:\1>/g;
const BULLET = /^[-*]\s+/;

export function parsePocketSummary(markdown: string): Block[] {
  const blocks: Block[] = [];
  let cursor = 0;

  for (const match of markdown.matchAll(CUSTOM)) {
    const start = match.index ?? 0;
    blocks.push(...parseMarkdown(markdown.slice(cursor, start)));
    const [, tag, title, inner] = match;
    blocks.push(tag === 'timeline' ? parseTimeline(title, inner) : parseTree(title, inner));
    cursor = start + match[0].length;
  }
  blocks.push(...parseMarkdown(markdown.slice(cursor)));

  return blocks.filter(
    (b) =>
      (b.kind !== 'paragraph' || b.text.length > 0) && (b.kind !== 'bullets' || b.items.length > 0)
  );
}

// Line-driven, not paragraph-driven: Pocket puts a heading, an intro line and
// its bullets in one run with no blank lines between them.
function parseMarkdown(md: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let bullets: string[] = [];

  const flush = () => {
    if (para.length) blocks.push({ kind: 'paragraph', text: para.join(' ') });
    if (bullets.length) blocks.push({ kind: 'bullets', items: bullets });
    para = [];
    bullets = [];
  };

  for (const raw of md.split('\n')) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      flush();
      blocks.push({ kind: 'heading', text: heading[1].trim() });
    } else if (BULLET.test(line)) {
      if (para.length) {
        blocks.push({ kind: 'paragraph', text: para.join(' ') });
        para = [];
      }
      bullets.push(line.replace(BULLET, ''));
    } else {
      if (bullets.length) {
        blocks.push({ kind: 'bullets', items: bullets });
        bullets = [];
      }
      para.push(line);
    }
  }
  flush();
  return blocks;
}

function parseTimeline(title: string, inner: string): Block {
  const rows = inner
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split('|').map((c) => c.trim()));
  return { kind: 'timeline', title, rows };
}

function parseTree(title: string, inner: string): Block {
  let question = '';
  const options = new Map<string, string>(); // key -> label
  const details = new Map<string, { heading: string; body: string[] }>();
  let current: string | null = null;

  for (const raw of inner.split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    const start = line.match(/^start::(.*)$/);
    if (start) {
      question = start[1].trim();
      current = null;
      continue;
    }
    const option = line.match(/^[-*]\s+(.*?)\s*=>\s*(\S+)$/);
    if (option) {
      options.set(option[2], option[1]);
      continue;
    }
    const detail = line.match(/^(\w+)::(.*)$/);
    if (detail) {
      current = detail[1];
      details.set(current, { heading: detail[2].trim(), body: [] });
      continue;
    }
    if (current) details.get(current)?.body.push(line);
  }

  const keys = options.size > 0 ? [...options.keys()] : [...details.keys()];
  const branches: Branch[] = keys.map((key) => ({
    label: options.get(key) ?? details.get(key)?.heading ?? key,
    heading: details.get(key)?.heading ?? '',
    body: (details.get(key)?.body ?? []).join(' '),
  }));

  return { kind: 'tree', title, question, branches };
}

// Renders **bold** without a markdown dependency.
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(/\*\*(.+?)\*\*/g)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    out.push(
      <strong key={k++} className="font-medium text-gray-900">
        {m[1]}
      </strong>
    );
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function PocketSummary({ markdown }: { markdown: string }) {
  const blocks = parsePocketSummary(markdown);
  if (blocks.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {blocks.map((block, i) => {
        if (block.kind === 'heading')
          return (
            <h4
              key={i}
              className="text-xs font-medium tracking-wide uppercase text-gray-400 pt-1.5 first:pt-0"
            >
              {block.text}
            </h4>
          );

        if (block.kind === 'paragraph')
          return (
            <p key={i} className="text-sm text-gray-600 leading-relaxed">
              {inline(block.text)}
            </p>
          );

        if (block.kind === 'bullets')
          return (
            <ul key={i} className="space-y-1.5">
              {block.items.map((item, j) => (
                <li key={j} className="flex gap-2 text-sm text-gray-600 leading-relaxed">
                  <span className="text-gray-300 select-none">•</span>
                  <span>{inline(item)}</span>
                </li>
              ))}
            </ul>
          );

        if (block.kind === 'timeline')
          return (
            <div key={i} className="pt-1.5">
              <p className="text-xs font-medium tracking-wide uppercase text-gray-400 mb-2">
                {block.title}
              </p>
              <ol className="border-l border-gray-200 space-y-2.5 pl-3.5">
                {block.rows.map((cells, j) => (
                  <li key={j} className="relative">
                    <span className="absolute -left-[18px] top-[7px] w-1.5 h-1.5 rounded-full bg-gray-300" />
                    <span className="text-sm text-gray-900">{cells[0]}</span>
                    {cells[1] && <span className="text-sm text-gray-500"> · {cells[1]}</span>}
                    {cells[2] && (
                      <span className="block text-xs text-gray-400 leading-relaxed mt-0.5">
                        {cells[2]}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          );

        return (
          <div key={i} className="pt-1.5">
            <p className="text-xs font-medium tracking-wide uppercase text-gray-400 mb-2">
              {block.title}
            </p>
            {block.question && (
              <p className="text-sm text-gray-600 leading-relaxed mb-2">{block.question}</p>
            )}
            <div className="space-y-2">
              {block.branches.map((b, j) => (
                <div key={j} className="rounded-lg bg-gray-50 px-3 py-2">
                  <p className="text-sm text-gray-900">
                    {b.label}
                    {b.heading && <span className="text-gray-400 font-normal"> — {b.heading}</span>}
                  </p>
                  {b.body && (
                    <p className="text-xs text-gray-400 leading-relaxed mt-0.5">{b.body}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
