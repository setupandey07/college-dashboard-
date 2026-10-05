import React, { useState } from 'react';
import { Copy, Check, Terminal, AlertTriangle, Lightbulb, CheckCircle2 } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Split into paragraphs / code blocks
  const parts = parseMarkdown(content);

  return (
    <div className="space-y-2.5 text-xs text-slate-800 leading-relaxed font-sans">
      {parts.map((part, idx) => {
        if (part.type === 'code') {
          return <CodeBlock key={idx} language={part.lang} code={part.text} />;
        }
        if (part.type === 'diagram') {
          return <DiagramBlock key={idx} diagram={part.text} />;
        }
        if (part.type === 'h3') {
          return (
            <div key={idx} className="pt-2 pb-0.5 border-b border-emerald-100 flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 rounded-full bg-[#1B8B67] shrink-0" />
              <h3 className="font-bold text-xs text-[#14382C] uppercase tracking-wide">
                {renderInline(part.text)}
              </h3>
            </div>
          );
        }
        if (part.type === 'h4') {
          return (
            <h4 key={idx} className="font-bold text-xs text-emerald-900 pt-1 flex items-center gap-1.5">
              <span className="w-1 h-2 rounded bg-emerald-400 shrink-0" />
              {renderInline(part.text)}
            </h4>
          );
        }
        if (part.type === 'callout_warning') {
          return (
            <div key={idx} className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-[11px] flex gap-2 items-start my-1.5 shadow-2xs">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">{renderInline(part.text)}</div>
            </div>
          );
        }
        if (part.type === 'callout_tip') {
          return (
            <div key={idx} className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 text-[11px] flex gap-2 items-start my-1.5 shadow-2xs">
              <Lightbulb className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">{renderInline(part.text)}</div>
            </div>
          );
        }
        if (part.type === 'ul') {
          return (
            <ul key={idx} className="space-y-1.5 my-1 pl-1">
              {part.items.map((item, iIdx) => (
                <li key={iIdx} className="flex items-start gap-2 text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                  <div className="flex-1">{renderInline(item)}</div>
                </li>
              ))}
            </ul>
          );
        }
        if (part.type === 'ol') {
          return (
            <ol key={idx} className="space-y-1.5 my-1 pl-1">
              {part.items.map((item, iIdx) => (
                <li key={iIdx} className="flex items-start gap-2 text-slate-700">
                  <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold shrink-0 mt-0.5">
                    {iIdx + 1}
                  </span>
                  <div className="flex-1">{renderInline(item)}</div>
                </li>
              ))}
            </ol>
          );
        }
        if (part.type === 'divider') {
          return <hr key={idx} className="border-t border-slate-200/80 my-2" />;
        }
        return (
          <p key={idx} className="text-slate-800">
            {renderInline(part.text)}
          </p>
        );
      })}
    </div>
  );
};

function CodeBlock({ language, code }: { language?: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2 rounded-xl overflow-hidden border border-slate-700/60 bg-[#0F172A] text-slate-200 font-mono text-[11px] shadow-sm">
      <div className="px-3 py-1.5 bg-[#090D16] border-b border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <Terminal className="w-3 h-3 text-emerald-400" />
          <span>{language || 'code'}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-3 overflow-x-auto leading-relaxed select-text font-mono text-[11px]">
        <pre>{code}</pre>
      </div>
    </div>
  );
}

function DiagramBlock({ diagram }: { diagram: string }) {
  return (
    <div className="my-2 p-3 rounded-xl bg-[#091512] border border-emerald-900/60 text-emerald-300 font-mono text-[10.5px] leading-snug overflow-x-auto shadow-inner select-text">
      <pre>{diagram}</pre>
    </div>
  );
}

// Inline renderer for **bold**, `inline code`, *italics*, and Math $$ blocks
function renderInline(text: string): React.ReactNode {
  if (!text) return null;

  // Split by inline code `code` or bold **bold**
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\$[^$]+\$)/g;
  const tokens = text.split(regex);

  return tokens.map((token, i) => {
    if (token.startsWith('**') && token.endsWith('**')) {
      const boldText = token.slice(2, -2);
      return (
        <strong key={i} className="font-semibold text-slate-900">
          {boldText}
        </strong>
      );
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-emerald-700 font-mono text-[10.5px]"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith('$') && token.endsWith('$')) {
      return (
        <span
          key={i}
          className="px-1 py-0.2 rounded bg-emerald-50 text-emerald-800 font-mono text-[11px] font-medium"
        >
          {token.slice(1, -1)}
        </span>
      );
    }
    return token;
  });
}

interface ParsedPart {
  type: 'p' | 'h3' | 'h4' | 'ul' | 'ol' | 'code' | 'diagram' | 'callout_warning' | 'callout_tip' | 'divider';
  text: string;
  lang?: string;
  items: string[];
}

function parseMarkdown(md: string): ParsedPart[] {
  const lines = md.split('\n');
  const parts: ParsedPart[] = [];
  let inCode = false;
  let codeLang = '';
  let codeBuffer: string[] = [];
  let currentList: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (listType && currentList.length > 0) {
      parts.push({
        type: listType,
        text: '',
        items: [...currentList]
      });
      currentList = [];
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Code block check
    if (line.startsWith('```')) {
      if (inCode) {
        // Closing block
        const codeText = codeBuffer.join('\n');
        // Check if ASCII diagram
        if (codeText.includes('+---') || codeText.includes('|  |') || codeText.includes('===>') || codeText.includes('[#]')) {
          parts.push({ type: 'diagram', text: codeText, items: [] });
        } else {
          parts.push({ type: 'code', text: codeText, lang: codeLang, items: [] });
        }
        codeBuffer = [];
        inCode = false;
      } else {
        flushList();
        inCode = true;
        codeLang = line.replace('```', '').trim();
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(rawLine);
      continue;
    }

    // Dividers
    if (line === '---' || line === '***') {
      flushList();
      parts.push({ type: 'divider', text: '', items: [] });
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      flushList();
      parts.push({ type: 'h3', text: line.replace('### ', ''), items: [] });
      continue;
    }
    if (line.startsWith('#### ')) {
      flushList();
      parts.push({ type: 'h4', text: line.replace('#### ', ''), items: [] });
      continue;
    }

    // Bullet items
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const itemText = line.substring(2);
      if (listType === 'ol') flushList();
      listType = 'ul';
      currentList.push(itemText);
      continue;
    }

    // Numbered items
    const olMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (olMatch) {
      const itemText = olMatch[2];
      if (listType === 'ul') flushList();
      listType = 'ol';
      currentList.push(itemText);
      continue;
    }

    // Callout warnings/mistakes
    if (line.includes('❌') || line.toLowerCase().includes('common mistakes') || line.toLowerCase().includes('trap:')) {
      flushList();
      parts.push({ type: 'callout_warning', text: line, items: [] });
      continue;
    }

    // Blank line
    if (!line) {
      flushList();
      continue;
    }

    // Regular paragraph
    flushList();
    parts.push({ type: 'p', text: line, items: [] });
  }

  flushList();

  if (inCode && codeBuffer.length > 0) {
    parts.push({ type: 'code', text: codeBuffer.join('\n'), lang: codeLang, items: [] });
  }

  return parts;
}
