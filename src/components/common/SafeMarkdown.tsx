import React from 'react';

interface SafeMarkdownProps {
  content: string;
  onNavigateTab?: (tabId: string) => void;
}

/**
 * Safely decodes known HTML entities without dangerouslySetInnerHTML.
 */
function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return '';
      }
    })
    .replace(/&#([0-9]+);/g, (_, dec) => {
      try {
        return String.fromCharCode(parseInt(dec, 10));
      } catch {
        return '';
      }
    });
}

/**
 * Normalizes common AI formatting artifacts:
 * - Literal escaped hyphens: \--- or \-- -> ---
 * - Stray escaping backslashes before markdown characters: \*, \_, \[, \]
 * - Raw LaTeX math blocks like $$\text{...}$$ -> clean plain text
 */
function cleanFormula(str: string): string {
  return str
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\pm/g, '±')
    .replace(/\\approx/g, '≈')
    .replace(/\\le/g, '≤')
    .replace(/\\ge/g, '≥')
    .trim();
}

function normalizeMarkdown(raw: string): string {
  let cleaned = decodeEntities(raw);

  // Fix escaped horizontal rules & hyphens
  cleaned = cleaned.replace(/\\(---+|---)/g, '---');
  cleaned = cleaned.replace(/\\([*_[\]()~`>#+-])/g, '$1');

  // Clean raw LaTeX $$ delimiters into readable plain text
  cleaned = cleaned.replace(/\$\$([\s\S]*?)\$\$/g, (_, f) => cleanFormula(f));
  cleaned = cleaned.replace(/\$([^$\n]+)\$/g, (_, f) => cleanFormula(f));

  return cleaned;
}

export const SafeMarkdown: React.FC<SafeMarkdownProps> = ({ content, onNavigateTab }) => {
  const normalized = normalizeMarkdown(content);
  const rawLines = normalized.split('\n');

  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      i++;
      continue;
    }

    // Horizontal Rule: --- or ***
    if (/^(\-{3,}|\*{3,})$/.test(trimmed)) {
      elements.push(<hr key={`hr-${i}`} className="my-2.5 border-slate-200" />);
      i++;
      continue;
    }

    // Fenced Code Block: ```
    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < rawLines.length && !rawLines[i].trim().startsWith('```')) {
        codeLines.push(rawLines[i]);
        i++;
      }
      if (i < rawLines.length) i++; // skip closing ```
      elements.push(
        <pre
          key={`code-${i}`}
          className="my-2 p-2.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto leading-relaxed"
        >
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Markdown Table Detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && i + 1 < rawLines.length) {
      const nextLine = rawLines[i + 1]?.trim() || '';
      if (nextLine.startsWith('|') && /^\|[\s:|-]+\|$/.test(nextLine) && nextLine.includes('-')) {
        // Collect table rows
        const tableLines: string[] = [];
        while (i < rawLines.length && rawLines[i].trim().startsWith('|') && rawLines[i].trim().endsWith('|')) {
          tableLines.push(rawLines[i].trim());
          i++;
        }

        if (tableLines.length >= 2) {
          const headerCells = tableLines[0]
            .split('|')
            .slice(1, -1)
            .map(c => c.trim());
          const bodyRows = tableLines.slice(2).map(row =>
            row
              .split('|')
              .slice(1, -1)
              .map(c => c.trim())
          );

          elements.push(
            <div key={`table-${i}`} className="my-2.5 overflow-x-auto rounded-lg border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-[11px] border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-800 font-semibold">
                    {headerCells.map((h, hIdx) => (
                      <th key={hIdx} className="px-3 py-2 whitespace-nowrap">
                        {renderInline(h, onNavigateTab)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bodyRows.map((row, rIdx) => (
                    <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3 py-1.5 text-slate-700">
                          {renderInline(cell, onNavigateTab)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          continue;
        }
      }
    }

    // Headings
    if (trimmed.startsWith('#### ')) {
      elements.push(
        <h5 key={`h4-${i}`} className="font-bold text-slate-900 text-xs mt-2 mb-1">
          {renderInline(trimmed.replace('#### ', ''), onNavigateTab)}
        </h5>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${i}`} className="font-bold text-slate-900 text-[13px] mt-2.5 mb-1 text-teal-900">
          {renderInline(trimmed.replace('### ', ''), onNavigateTab)}
        </h4>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${i}`} className="font-bold text-slate-950 text-sm mt-3 mb-1.5 pb-1 border-b border-slate-200">
          {renderInline(trimmed.replace('## ', ''), onNavigateTab)}
        </h3>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={`h1-${i}`} className="font-extrabold text-slate-950 text-base mt-3 mb-1.5 pb-1 border-b border-slate-300">
          {renderInline(trimmed.replace('# ', ''), onNavigateTab)}
        </h2>
      );
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote key={`bq-${i}`} className="border-l-3 border-teal-500 pl-3 my-1.5 text-slate-600 text-[11px] italic bg-teal-50/30 py-1 rounded-r">
          {renderInline(trimmed.replace(/^>\s*/, ''), onNavigateTab)}
        </blockquote>
      );
      i++;
      continue;
    }

    // Unordered List (- or *)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const listItems: string[] = [];
      while (i < rawLines.length && (rawLines[i].trim().startsWith('- ') || rawLines[i].trim().startsWith('* '))) {
        listItems.push(rawLines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="space-y-1 my-1.5 pl-1 text-xs">
          {listItems.map((item, itemIdx) => (
            <li key={itemIdx} className="flex items-start gap-2">
              <span className="text-teal-600 font-bold shrink-0 mt-0.5">•</span>
              <span className="flex-1 leading-relaxed text-slate-700">
                {renderInline(item, onNavigateTab)}
              </span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered List (1. 2. etc)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      const listItems: { num: string; text: string }[] = [];
      while (i < rawLines.length) {
        const m = rawLines[i].trim().match(/^(\d+)\.\s+(.*)/);
        if (!m) break;
        listItems.push({ num: m[1], text: m[2] });
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="space-y-1 my-1.5 pl-1 text-xs">
          {listItems.map((item, itemIdx) => (
            <li key={itemIdx} className="flex items-start gap-2">
              <span className="text-blue-600 font-mono font-semibold text-[11px] shrink-0 mt-0.5">
                {item.num}.
              </span>
              <span className="flex-1 leading-relaxed text-slate-700">
                {renderInline(item.text, onNavigateTab)}
              </span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Standard paragraph
    elements.push(
      <p key={`p-${i}`} className="my-1 leading-relaxed text-slate-700 text-xs">
        {renderInline(trimmed, onNavigateTab)}
      </p>
    );
    i++;
  }

  return <div className="space-y-0.5 font-sans">{elements}</div>;
};

/**
 * Parses inline formatting:
 * - Bold: **text**
 * - Italic: *text* or _text_
 * - Code: `code`
 * - Action links: [Action Name](action:tab_id)
 */
function renderInline(text: string, onNavigateTab?: (tabId: string) => void): React.ReactNode {
  // Regex to split on bold, inline code, action links, and italics
  const tokenRegex = /(\[.*?\]\(action:[a-z0-9_-]+\)|\*\*.*?\*\*|`.*?`|\*[^*\s][^*]*?\*|_[^_\s][^_]*?_)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (!part) return null;

    // Action button token: [Button Text](action:tabId)
    const actionMatch = part.match(/^\[(.*?)\]\(action:([a-z0-9_-]+)\)$/);
    if (actionMatch) {
      const label = actionMatch[1];
      const tabId = actionMatch[2];
      return (
        <button
          key={idx}
          type="button"
          onClick={() => onNavigateTab && onNavigateTab(tabId)}
          className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-semibold text-[11px] transition-colors cursor-pointer align-baseline"
          title={`Navigate to ${label}`}
        >
          <span>{label}</span>
          <span className="text-[10px] text-blue-500">→</span>
        </button>
      );
    }

    // Bold: **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Inline code: `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={idx} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px] border border-slate-200/80">
          {part.slice(1, -1)}
        </code>
      );
    }

    // Italic: *text* or _text_
    if (
      ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) &&
      part.length >= 3
    ) {
      return (
        <em key={idx} className="italic text-slate-800">
          {part.slice(1, -1)}
        </em>
      );
    }

    return part;
  });
}
