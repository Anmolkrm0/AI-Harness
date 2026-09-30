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
    <div className="relative my-3 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-750 bg-slate-50 dark:bg-[#18181b] text-sm shadow-2xs">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-100 dark:bg-[#232327] text-slate-600 dark:text-zinc-400 text-xs font-mono border-b border-slate-200 dark:border-zinc-750">
        <span className="font-semibold">{language || 'text'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              <span className="text-emerald-500 dark:text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-slate-800 dark:text-zinc-100 font-mono text-xs leading-relaxed">
        <code>{value}</code>
      </pre>
    </div>
  );
};

export const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div className="prose max-w-none text-slate-800 dark:text-zinc-100 dark:prose-invert text-xs sm:text-sm leading-relaxed break-words">
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
                  className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-300 font-mono text-xs border border-slate-200 dark:border-zinc-700/60 font-medium"
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
              <div className="my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-700">
                <table className="w-full text-left text-xs sm:text-sm text-slate-800 dark:text-zinc-200 border-collapse">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-slate-100 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 font-semibold border-b border-slate-200 dark:border-zinc-700">{children}</thead>;
          },
          th({ children }) {
            return <th className="px-3.5 py-2">{children}</th>;
          },
          td({ children }) {
            return <td className="px-3.5 py-2 border-t border-slate-200 dark:border-zinc-800">{children}</td>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-indigo-500 pl-3.5 py-1 my-2 bg-indigo-50/70 dark:bg-indigo-950/20 text-slate-700 dark:text-zinc-300 italic rounded-r">
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
                className="text-indigo-600 dark:text-sky-400 hover:underline underline-offset-2 transition-colors font-medium inline-flex items-center gap-1"
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
