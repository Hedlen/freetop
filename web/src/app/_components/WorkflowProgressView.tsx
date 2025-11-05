import { DownOutlined, UpOutlined } from "@ant-design/icons"
import { parse } from "best-effort-json-parser"
import { useMemo, useState, useEffect } from "react"

import { Atom } from "~/core/icons"
import { cn } from "~/core/utils"
import type { WorkflowStep } from "~/types/workflow"

import { Markdown } from "./Markdown"
import { ToolCallView } from "./ToolCallView"

// 统一移除最外层 markdown 代码块围栏，例如 ```markdown ... ``` 或 ```md ... ``` 或 ``` ... ```
function unwrapMarkdownFence(text: string): string {
  if (!text) return "";
  const trimmed = text.trim();
  const startFence = /^```[a-zA-Z]*\s*\r?\n/;
  const endFence = /\r?\n```$/;
  if (startFence.test(trimmed) && endFence.test(trimmed)) {
    return trimmed.replace(/^```[a-zA-Z]*\s*\r?\n/, "").replace(/\r?\n```$/, "");
  }
  return text;
}

export function WorkflowProgressView({
  className,
  workflow,
}: {
  className?: string;
  workflow: Workflow;
}) {
  const steps = useMemo(() => {
    return workflow.steps.filter((step) => step.agentName !== "reporter");
  }, [workflow]);
  const reportStep = useMemo(() => {
    return workflow.steps.find((step) => step.agentName === "reporter");
  }, [workflow]);

  // 提取 reporter 文本内容，便于统一渲染与调试
  const reportContent = useMemo(() => {
    const content = reportStep?.tasks[0]?.type === "thinking"
      ? reportStep.tasks[0].payload.text ?? ""
      : "";
    return typeof content === "string" ? content : String(content ?? "");
  }, [reportStep]);

  // 移除最外层 markdown 代码围栏，避免整个内容被当作代码块显示
  const sanitizedReportContent = useMemo(() => unwrapMarkdownFence(reportContent), [reportContent]);

  // 调试日志，确认内容是否为 markdown 以及基本统计
  useEffect(() => {
    if (reportStep) {
      // 基本结构与类型
      console.log("[Reporter] step:", {
        id: reportStep.id,
        agentName: reportStep.agentName,
        tasksLen: reportStep.tasks.length,
        firstTaskType: reportStep.tasks[0]?.type,
      });
    }
    console.log("[Reporter] content type:", typeof reportContent, "length:", reportContent?.length ?? 0);
    console.log("[Reporter] content snippet:", reportContent ? reportContent.slice(0, 200) : "<empty>");
    if (sanitizedReportContent !== reportContent) {
      console.log("[Reporter] content was fenced, unwrapped for rendering.");
      console.log("[Reporter] sanitized snippet:", sanitizedReportContent.slice(0, 200));
    }
  }, [reportStep, reportContent, sanitizedReportContent]);

  return (
    <div className="flex flex-col gap-3 sm:gap-6">
      <div className={cn("grid grid-cols-1 lg:grid-cols-[200px_1fr] xl:grid-cols-[220px_1fr] overflow-hidden rounded-lg sm:rounded-2xl border min-h-[300px] sm:minh-[500px]", className)}>
        <aside className="flex flex-col border-r bg-[rgba(0,0,0,0.02)] sticky top-0 h-fit max-h-[200px] sm:max-h-[300px] lg:max-h-[500px]">
          <div className="flex-shrink-0 px-2 sm:px-4 py-2 sm:py-4 text-sm sm:text-base font-medium border-b bg-white/50">Flow</div>
          <ol className="flex flex-col gap-1 sm:gap-3 px-2 sm:px-4 py-2 sm:py-4 overflow-y-auto">
            {steps.map((step, index) => (
              <li
                key={step.id}
                className="flex cursor-pointer items-center gap-2 sm:gap-3 p-1 sm:p-2 rounded-lg hover:bg-white/60 transition-colors"
                onClick={() => {
                  if (typeof document !== 'undefined') {
                    const element = document.getElementById(step.id);
                    if (element) {
                      element.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }
                  }
                }}
              >
                <div className="flex h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-blue-400 flex-shrink-0"></div>
                <div className="text-xs sm:text-sm font-medium">{index + 1}. {getStepName(step)}</div>
              </li>
            ))}
          </ol>
        </aside>
        <main className="overflow-auto bg-white p-2 sm:p-4 lg:p-6">
          <div className="max-w-full lg:max-w-4xl">
            {steps.map((step, stepIndex) => (
              <StepContentView key={step.id} step={step} stepIndex={stepIndex} isLast={stepIndex === steps.length - 1} />
            ))}
          </div>
        </main>
      </div>
      {reportStep && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg sm:rounded-2xl border border-green-200 p-3 sm:p-6">
          <div className="mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2 sm:gap-3">
               <span className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-green-500 text-white text-xs sm:text-sm font-bold">
                 ✓
               </span>
               Report
             </h2>
          </div>
          <div className="bg-white rounded-lg p-3 sm:p-6 shadow-sm">
            <Markdown className="prose prose-sm max-w-none">
              {sanitizedReportContent}
            </Markdown>
          </div>
        </div>
      )}
      {reportStep && (
        <div className="flex justify-start">
          <ReportActions reportContent={sanitizedReportContent} />
        </div>
      )}
    </div>
  );
}

function PlanTaskView({ task }: { task: ThinkingTask }) {
  const plan = useMemo<{
    title?: string;
    steps?: { title?: string; description?: string }[];
  }>(() => {
    if (task.payload.text) {
      // 清理 markdown 代码块格式，提取纯 JSON 内容
      let cleanText = task.payload.text;
      
      // 移除开头的 ```json 和结尾的 ```
      cleanText = cleanText.replace(/^```json\s*\n?/, '');
      cleanText = cleanText.replace(/\n?```\s*$/, '');
      
      // 移除可能存在的其他 markdown 格式
      cleanText = cleanText.trim();
      
      return parse(cleanText);
    }
    return {};
  }, [task]);
  const [showReason, setShowReason] = useState(false);
  const reason = task.payload.reason;
  const markdown = `## ${plan.title ?? ""}\n\n${plan.steps?.map((step) => `- **${step.title ?? ""}**\n\n${step.description ?? ""}`).join("\n\n") ?? ""}`;
  return (
    <div className="space-y-4">
      {reason && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 w-full">
          <button
            className="mb-3 flex items-center gap-2 rounded-lg bg-blue-500 hover:bg-blue-600 px-3 py-1.5 text-xs text-white font-medium transition-colors flex-wrap"
             onClick={() => setShowReason(!showReason)}
          >
            <Atom className="h-3 w-3 flex-shrink-0" />
            <span>Deep Thought</span>
            {showReason ? (
              <UpOutlined className="text-xs flex-shrink-0" />
            ) : (
              <DownOutlined className="text-xs flex-shrink-0" />
            )}
          </button>
          {showReason && (
            <div className="bg-white rounded-md p-3 border-l-4 border-blue-400">
              <Markdown className="text-gray-600 text-xs leading-relaxed prose-xs break-words whitespace-pre-wrap">
                {reason}
              </Markdown>
            </div>
          )}
        </div>
      )}
      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
        <Markdown className="prose prose-sm max-w-none">{markdown ?? ""}</Markdown>
      </div>
    </div>
  );
}

function ReportActions({ reportContent }: { reportContent: string }) {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportContent);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleReportRetry = async () => {
    console.log('Report retry button clicked');
    try {
      const { useStore, sendMessage } = await import('~/core/store');
      const messages = useStore.getState().messages;
      
      console.log('Current messages:', messages.length);
      console.log('Messages:', messages.map(m => ({ type: m.type, role: m.role, id: m.id })));
      
      // 找到最后一个工作流消息对应的用户消息
      let currentWorkflowIndex = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].type === "workflow") {
          currentWorkflowIndex = i;
          break;
        }
      }
      
      console.log('Found workflow at index:', currentWorkflowIndex);
      
      if (currentWorkflowIndex > 0) {
        let userMessage = null;
        // 向上查找直到找到第一个用户消息
        for (let i = currentWorkflowIndex - 1; i >= 0; i--) {
          if (messages[i].role === "user" && messages[i].content) {
            userMessage = messages[i];
            break;
          }
        }
        console.log('User message found:', userMessage);
        if (userMessage) {
          console.log('Starting retry process...');
          // 删除当前工作流回复及之后的所有消息
          const newMessages = messages.slice(0, currentWorkflowIndex);
          console.log('Updating messages, new length:', newMessages.length);
          useStore.setState({ messages: newMessages });
        
          // 使用sendMessage重新生成回复，这样可以确保状态管理的一致性
          console.log('Sending message for retry...');
        
        // 从localStorage读取当前的深度思考模式配置
        const { getInputConfigSync } = await import('~/core/utils/config');
        const config = getInputConfigSync();
        
        const inputMessages = [{ content: userMessage.content ?? '', role: 'user' }];
        await sendMessage(inputMessages, {
          deepThinkingMode: config.deepThinkingMode ?? false,
          searchBeforePlanning: config.searchBeforePlanning ?? false,
        });
        }
      }
    } catch (error) {
      console.error('Report retry failed:', error);
    }
  };

  const handleDelete = async () => {
    const { useStore } = await import('~/core/store');
    const messages = useStore.getState().messages;
    
    // 删除当前工作流回复
    const newMessages = messages.filter(m => m.type !== "workflow");
    useStore.setState({ messages: newMessages });
  };

  return (
    <div className="flex gap-2 sm:gap-3">
      <button
        className="flex items-center gap-1 sm:gap-2 rounded-lg bg-gray-100 hover:bg-gray-200 px-2 sm:px-3 py-1.5 text-xs text-gray-700 transition-colors"
        onClick={handleCopy}
      >
        <span>复制报告</span>
        {copySuccess && <span className="text-green-600 ml-1">✓ 已复制</span>}
      </button>
      <button
        className="flex items-center gap-1 sm:gap-2 rounded-lg bg-blue-100 hover:bg-blue-200 px-2 sm:px-3 py-1.5 text-xs text-blue-700 transition-colors"
        onClick={handleReportRetry}
      >
        <span>重新生成</span>
      </button>
      <button
        className="flex items-center gap-1 sm:gap-2 rounded-lg bg-red-100 hover:bg-red-200 px-2 sm:px-3 py-1.5 text-xs text-red-700 transition-colors"
        onClick={handleDelete}
      >
        <span>删除报告</span>
      </button>
    </div>
  );
}

function StepContentView({ step, stepIndex, isLast }: { step: WorkflowStep; stepIndex: number; isLast: boolean }) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const filteredTasks = step.tasks.filter(
    (task) =>
      !(
        task.type === "thinking" &&
        !task.payload.text &&
        !task.payload.reason
      ),
  );

  return (
    <div className="mb-4 sm:mb-8">
      <div id={step.id} className="mb-3 sm:mb-6">
        <button
          className="text-sm sm:text-base font-semibold text-gray-800 mb-2 sm:mb-4 flex items-center gap-2 sm:gap-3 hover:text-blue-600 transition-colors w-full text-left"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-blue-500 text-white text-xs font-bold">
            {stepIndex + 1}
          </span>
          <span className="flex-1 truncate">{getStepName(step)}</span>
          {isExpanded ? (
            <UpOutlined className="text-xs flex-shrink-0" />
          ) : (
            <DownOutlined className="text-xs flex-shrink-0" />
          )}
        </button>
      </div>
      {isExpanded && (
        <div className="ml-6 sm:ml-11 space-y-2 sm:space-y-4 max-w-full overflow-hidden">
          {filteredTasks.map((task, taskIndex) =>
            task.type === "thinking" &&
            step.agentName === "planner" ? (
              <PlanTaskView key={`${step.id}-${task.id}-${taskIndex}`} task={task} />
            ) : (
              <div key={`${step.id}-${task.id}-${taskIndex}`} className="">
                {task.type === "thinking" ? (
                  <div className="bg-gray-50 rounded-lg p-2 sm:p-4 border-l-2 sm:border-l-4 border-gray-300">
                    <Markdown
                      className="text-gray-600 text-xs sm:text-sm"
                    >
                      {task.payload.text}
                    </Markdown>
                  </div>
                ) : (
                  <ToolCallView task={task} />
                )}
              </div>
            ),
          )}
        </div>
      )}
      {!isLast && (
        <div className="mt-8 mb-8">
          <hr className="border-gray-200" />
        </div>
      )}
    </div>
  );
}

function getStepName(step: WorkflowStep): string {
  switch (step.agentName) {
    case "planner":
      return "Planning";
    case "researcher":
      return "Research";
    case "writer":
      return "Writing";
    default:
      return step.agentName;
  }
}
