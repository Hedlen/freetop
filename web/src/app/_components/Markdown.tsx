import ReactMarkdown, { type Options } from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "~/core/utils";

export function Markdown({
  className,
  children,
  style,
  ...props
}: Options & { className?: string; style?: React.CSSProperties }) {
  // Handle undefined or null children
  if (children == null || children === undefined) {
    return null;
  }

  // Ensure children is a string
  const content = typeof children === 'string' ? children : String(children);

  return (
    <div className={cn(className, "markdown")} style={style}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="table-container overflow-x-auto">
              <table className="table-auto w-full">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-gray-200 hover:bg-gray-50">{children}</tr>,
          th: ({ children }) => (
            <th className="px-4 py-2 text-left font-semibold text-gray-900 border border-gray-300">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-gray-700 border border-gray-300 whitespace-pre-wrap break-words">
              {children}
            </td>
          ),
        }}
        {...props}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
