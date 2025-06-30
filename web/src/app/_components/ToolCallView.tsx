import {
  BashOutlined,
  DownOutlined,
  GlobalOutlined,
  PythonOutlined,
  SearchOutlined,
  UnorderedListOutlined,
  UpOutlined,
} from "@ant-design/icons";
import { LRUCache } from "lru-cache";
import { useMemo, useState, useEffect } from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import docco from "react-syntax-highlighter/dist/styles/docco";

import { cn } from "~/core/utils";
import { type ToolCallTask } from "~/core/workflow";
import { EnhancedSearchResults } from "./EnhancedSearchResults";
import { EnhancedBrowserView } from "./EnhancedBrowserView";

// 全局事件管理器
interface SidePanelEvent {
  type: 'open';
  task: ToolCallTask;
}

class SidePanelEventManager {
  private listeners: ((event: SidePanelEvent) => void)[] = [];

  subscribe(listener: (event: SidePanelEvent) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  emit(event: SidePanelEvent) {
    this.listeners.forEach(listener => listener(event));
  }
}

export const sidePanelEventManager = new SidePanelEventManager();

export function ToolCallView({ task }: { task: ToolCallTask }) {
  const handleDetailView = () => {
    sidePanelEventManager.emit({ type: 'open', task });
  };

  // 当浏览器工具被调用时，触发浏览器工具事件
  useEffect(() => {
    if (task.payload.toolName === 'browser' || task.payload.toolName === 'smart_browser') {
      console.log('ToolCallView: 检测到浏览器工具', {
        taskId: task.id,
        toolName: task.payload.toolName,
        state: task.state,
        hasOutput: !!task.payload.output
      });
      
      // 触发浏览器工具调用事件
      const browserToolCallEvent = new CustomEvent('browser-tool-call', {
        detail: {
          toolCallId: task.id,
          toolName: task.payload.toolName,
          toolInput: task.payload.input,
          params: task.payload.input
        }
      });
      console.log('ToolCallView: 触发 browser-tool-call 事件', browserToolCallEvent.detail);
      window.dispatchEvent(browserToolCallEvent);

      // 如果任务已完成，触发结果事件
      if (task.state === 'completed' && task.payload.output) {
        const browserToolResultEvent = new CustomEvent('browser-tool-result', {
          detail: {
            toolCallId: task.id,
            toolResult: task.payload.output,
            result: task.payload.output
          }
        });
        console.log('ToolCallView: 触发 browser-tool-result 事件', browserToolResultEvent.detail);
        window.dispatchEvent(browserToolResultEvent);
      }
    }
  }, [task.id, task.payload.toolName, task.state, task.payload.output]);

  const renderToolView = () => {
    if (task.payload.toolName === "tavily_search") {
      return <TravilySearchToolCallView task={task as ToolCallTask<any>} />;
    } else if (task.payload.toolName === "crawl_tool") {
      return <CrawlToolCallView task={task as ToolCallTask<any>} />;
    } else if (task.payload.toolName === "browser") {
      return <BrowserToolCallView task={task as ToolCallTask<any>} />;
    } else if (task.payload.toolName === "python_repl_tool") {
      return <PythonReplToolCallView task={task as ToolCallTask<any>} />;
    } else if (task.payload.toolName === "bash_tool") {
      return <BashToolCallView task={task as ToolCallTask<any>} />;
    }
    return <div>{task.payload.toolName}</div>;
  };

  return (
    <div className="relative group">
      {renderToolView()}
      {/* 详细查看按钮 */}
      <button
        onClick={handleDetailView}
        className={cn(
          "absolute top-2 right-2 opacity-0 group-hover:opacity-100",
          "bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-full text-xs",
          "transition-all duration-200 shadow-lg hover:shadow-xl",
          "flex items-center gap-1"
        )}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        详细
      </button>
    </div>
  );
}

function BrowserToolCallView({
  task,
}: {
  task: ToolCallTask<{ instruction: string; url?: string }>;
}) {
  // 如果有URL和输出结果，使用增强的浏览器视图
  if (task.payload.input.url && task.payload.output) {
    return (
      <EnhancedBrowserView
        url={task.payload.input.url}
        instruction={task.payload.input.instruction}
        result={task.payload.output}
        className="max-w-[640px]"
      />
    );
  }
  
  // 否则使用原来的简单视图
  return (
    <div>
      <div className="flex items-center gap-2">
        <div>
          <GlobalOutlined className="h-4 w-4 text-sm" />
        </div>
        <div>
          <span className="text-sm">{task.payload.input.instruction}</span>
        </div>
      </div>
    </div>
  );
}

const pageCache = new LRUCache<string, string>({ max: 100 });
function CrawlToolCallView({ task }: { task: ToolCallTask<{ url: string }> }) {
  const results = useMemo(() => {
    try {
      return JSON.parse(task.payload.output ?? "") ?? null;
    } catch (error) {
      return null;
    }
  }, [task.payload.output]);
  const title = useMemo(() => {
    return pageCache.get(task.payload.input.url);
  }, [task.payload.input.url]);
  
  // 如果有输出结果，使用增强的浏览器视图
  if (task.payload.output && task.state !== "pending") {
    return (
      <EnhancedBrowserView
        url={task.payload.input.url}
        instruction={`Reading "${title ?? task.payload.input.url}"`}
        result={task.payload.output}
        className="max-w-[640px]"
      />
    );
  }
  
  // 否则显示加载状态
  return (
    <div>
      <div className="flex items-center gap-2">
        <div>
          <GlobalOutlined className="h-4 w-4 text-sm" />
        </div>
        <div>
          <span>Reading</span>{" "}
          <a
            className="text-sm font-bold"
            href={task.payload.input.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            &quot;{title ?? task.payload.input.url}&quot;
          </a>
        </div>
      </div>
    </div>
  );
}

function TravilySearchToolCallView({
  task,
}: {
  task: ToolCallTask<{ query: string }>;
}) {
  const results = useMemo(() => {
    try {
      const results = JSON.parse(task.payload.output ?? "") ?? [];
      results.forEach((result: { url: string; title: string }) => {
        pageCache.set(result.url, result.title);
      });
      return results;
    } catch (error) {
      return [];
    }
  }, [task.payload.output]);
  
  return (
    <div>
      <div className="flex items-center gap-2">
        <div>
          <SearchOutlined className="h-4 w-4 text-sm" />
        </div>
        <div>
          Searching for{" "}
          <span className="font-bold">
            &quot;{task.payload.input.query}&quot;
          </span>
        </div>
      </div>
      {task.state === "pending" && !task.payload.output && (
        <div className="flex items-center gap-2 text-gray-500 text-sm mt-2">
          <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>搜索中...</span>
        </div>
      )}
      {task.state !== "pending" && (
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center gap-2">
            <div>
              <UnorderedListOutlined className="h-4 w-4 text-sm" />
            </div>
            <div>
              <span className="text-sm text-gray-500">
                {results.length} results found
              </span>
            </div>
          </div>
          
          {/* 使用增强的搜索结果组件 */}
          <div className="mt-4">
            <EnhancedSearchResults
              results={results.map((result: { url: string; title: string; content?: string }) => ({
                url: result.url,
                title: result.title,
                snippet: result.content || "点击查看完整内容",
              }))}
              query={task.payload.input.query}
              className="max-w-[640px]"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PythonReplToolCallView({
  task,
}: {
  task: ToolCallTask<{ code: string }>;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <div>
          <PythonOutlined className="h-4 w-4 text-sm" />
        </div>
        <div>
          <span>Writing and executing Python Code</span>
        </div>
      </div>
      {task.payload.input.code && (
        <div className="min-w[640px] mx-4 mt-2 max-h-[420px] max-w-[640px] overflow-auto rounded-lg border bg-gray-50 p-2">
          <SyntaxHighlighter language="python" style={docco}>
            {task.payload.input.code}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  );
}

function BashToolCallView({ task }: { task: ToolCallTask<{ cmd: string }> }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <div>
          <PythonOutlined className="h-4 w-4 text-sm" />
        </div>
        <div>
          <span>
            Executing <a className="font-medium">Bash Command</a>
          </span>
        </div>
      </div>
      {task.payload.input.cmd && (
        <div
          className="min-w[640px] mx-4 mt-2 max-h-[420px] max-w-[640px] overflow-auto rounded-lg border bg-gray-50 p-2"
          style={{ fontSize: "smaller" }}
        >
          <SyntaxHighlighter language="bash" style={docco}>
            {task.payload.input.cmd}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  );
}
