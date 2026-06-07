'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { useState } from 'react';
import 'highlight.js/styles/github-dark.css';

interface MarkdownRendererProps {
  content: string;
  isUser?: boolean;
  isDark?: boolean;
}

export function MarkdownRenderer({ content, isUser = false, isDark = true }: MarkdownRendererProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (isUser) {
    return <span className="whitespace-pre-wrap">{content}</span>;
  }

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity"
        title={copied ? 'Copied!' : 'Copy to clipboard'}
      >
        {copied ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>

      <div className={`prose prose-sm max-w-none prose-p:my-2 ${
        isDark
          ? 'prose-invert prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700 prose-code:text-indigo-300 prose-code:bg-gray-900 prose-strong:text-white prose-a:text-indigo-400 prose-a:hover:text-indigo-300'
          : 'prose-pre:bg-gray-100 prose-pre:border prose-pre:border-gray-300 prose-code:text-indigo-600 prose-code:bg-gray-100 prose-strong:text-gray-900 prose-a:text-indigo-600 prose-a:hover:text-indigo-700'
      } prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-h1:mt-4 prose-h2:mt-3 prose-h3:mt-2 prose-li:my-1 prose-ul:my-2 prose-ol:my-2`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            pre: ({ node, ...props }) => (
              <pre className="overflow-x-auto rounded my-3" {...props} />
            ),
            code: ({ node, className, children, ...props }: any) => {
              const isInline = !className;
              return isInline ? (
                <code className={`px-1.5 py-0.5 rounded text-xs ${isDark ? 'bg-gray-900 text-indigo-300' : 'bg-gray-100 text-indigo-600'}`} {...props}>
                  {children}
                </code>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
