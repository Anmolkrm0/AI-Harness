import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';

interface CodeBlockProps {
  language?: string;
  value: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-4 rounded-xl overflow-hidden border border-zinc-700/60 bg-[#1e1e20] text-sm">
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#28282b] text-zinc-400 text-xs font-mono border-b border-zinc-700/40">
        <span>{language || 'text'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-zinc-700 text-zinc-300 transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-zinc-100 font-mono text-xs leading-relaxed">
        <code>{value}</code>
      </pre>
    </div>
  );
};

export const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div className="prose prose-invert max-w-none text-zinc-200 text-sm leading-relaxed break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !String(children).includes('\n');
            const codeString = String(children).replace(/\n$/, '');

            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded bg-zinc-800 text-sky-300 font-mono text-xs border border-zinc-700/50"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return <CodeBlock language={match ? match[1] : undefined} value={codeString} />;
          },
          table({ children }) {
            return (
              <div className="my-4 overflow-x-auto rounded-lg border border-zinc-700/70">
                <table className="w-full text-left text-sm text-zinc-200 border-collapse">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-zinc-800/80 text-zinc-300 font-semibold border-b border-zinc-700">{children}</thead>;
          },
          th({ children }) {
            return <th className="px-4 py-2.5">{children}</th>;
          },
          td({ children }) {
            return <td className="px-4 py-2 border-t border-zinc-800/80">{children}</td>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-sky-500 pl-4 py-1 my-3 bg-sky-950/20 text-zinc-300 italic rounded-r">
                {children}
              </blockquote>
            );
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:text-sky-300 underline underline-offset-2 transition-colors"
              >
                {children}
              </a>
            );
          },
          ul({ children }) {
            return <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
