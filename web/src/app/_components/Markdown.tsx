import ReactMarkdown, { type Options } from "react-markdown";

import { cn } from "~/core/utils";

export function Markdown({
  className,
  children,
  style,
  ...props
}: Options & { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={cn(className, "markdown")} style={style}>
      <ReactMarkdown
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="table-container">
              <table>{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead>{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => <th>{children}</th>,
          td: ({ children }) => <td>{children}</td>,
        }}
        {...props}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
