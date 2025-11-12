import { DownOutlined, UpOutlined } from "@ant-design/icons"
import { parse } from "best-effort-json-parser"
import { useMemo, useState, useEffect } from "react"

import { Atom } from "~/core/icons"
import { cn } from "~/core/utils"
import type { WorkflowStep } from "~/types/workflow"

import { Markdown } from "./Markdown"
import { ToolCallView } from "./ToolCallView"
import { getInputConfigSync } from "~/core/utils/config"

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
      {/* 改为纯纵向内容区域，移除左侧Flow列表，符合图2风格 */}
      <div className={cn("rounded-lg sm:rounded-xl border border-transparent bg-transparent", className)}>
        <main className="overflow-auto p-1 sm:p-2 lg:p-3">
          <div className="max-w-full lg:max-w-3xl xl:max-w-2xl">
            {steps.map((step, stepIndex) => (
              <StepContentView key={step.id} step={step} stepIndex={stepIndex} isLast={stepIndex === steps.length - 1} />
            ))}
          </div>
        </main>
      </div>
      {reportStep && (
        <div className="agent-reply-card">
          <div className="agent-reply-content">
            <Markdown className="agent-prose break-words text-sm">
              {sanitizedReportContent}
            </Markdown>
          </div>
          <div className="agent-reply-toolbar justify-start">
            <ReportActions reportContent={sanitizedReportContent} />
          </div>
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
  const markdown = `${plan.title ? `## ${plan.title}\n\n` : ""}${(plan.steps && plan.steps.length)
    ? plan.steps.map((step) => {
        const t = step.title ?? "";
        const d = step.description ?? "";
        if (!t && !d) return "";
        return `- **${t}**\n\n${d}`;
      }).filter(Boolean).join("\n\n")
    : ""}`;
  return (
    <div className="space-y-4">
      {reason && (
        <div className="rounded-md p-2 border border-transparent bg-transparent w-full">
          <button
            className="mb-2 flex items-center gap-2 rounded-md border px-2 py-1 text-[11px] text-gray-700 bg-transparent hover:bg-gray-100 transition-colors"
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
            <div
              className="rounded-md p-2 border border-gray-200 bg-transparent"
              style={{ contentVisibility: 'auto' as any, containIntrinsicSize: '200px 600px', willChange: 'opacity' }}
            >
              <Markdown className="text-gray-600 text-xs leading-relaxed prose-xs break-words whitespace-pre-wrap">
                {reason}
              </Markdown>
            </div>
          )}
        </div>
      )}
      {markdown && markdown.trim() && (
        <div className="rounded-md p-2 border border-transparent bg-transparent">
          <Markdown className="prose prose-sm max-w-none">{markdown}</Markdown>
        </div>
      )}
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
        
        const retryMessage = {
          id: '',
          role: 'user',
          type: 'text',
          content: userMessage.content ?? '',
        };
        await sendMessage(retryMessage as any, {
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
    <div className="flex gap-2">
      <button
        className="flex items-center gap-1 px-2 py-1 rounded-md transition-colors text-[11px] sm:text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-600"
        onClick={handleCopy}
      >
        <span>复制</span>
        {copySuccess && <span className="text-green-600 ml-1">✓ 已复制</span>}
      </button>
      <button
        className="flex items-center gap-1 px-2 py-1 rounded-md transition-colors text-[11px] sm:text-xs font-medium bg-blue-100 hover:bg-blue-200 text-blue-700"
        onClick={handleReportRetry}
      >
        <span>重新生成</span>
      </button>
      <button
        className="flex items-center gap-1 px-2 py-1 rounded-md transition-colors text-[11px] sm:text-xs font-medium bg-red-100 hover:bg-red-200 text-red-700"
        onClick={handleDelete}
      >
        <span>删除</span>
      </button>
    </div>
  );
}

function StepContentView({ step, stepIndex, isLast }: { step: WorkflowStep; stepIndex: number; isLast: boolean }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const getStepDesc = (agent: string) => {
    const key = (agent ?? '').toLowerCase();
    if (key.includes('planner')) return '规划任务';
    if (key.includes('research')) return '信息检索';
    if (key.includes('browser')) return '浏览器执行';
    if (key.includes('coordinator')) return '协调执行';
    if (key.includes('supervisor')) return '策略决策';
    if (key.includes('writer')) return '结果撰写';
    if (key.includes('report')) return '结果汇总';
    return '任务执行';
  };
  
  const { searchBeforePlanning } = getInputConfigSync();
  const filteredTasks = step.tasks.filter((task) => {
    if (
      step.agentName === "researcher" &&
      !searchBeforePlanning
    ) {
      return false;
    }
    return !(
      task.type === "thinking" &&
      !task.payload.text &&
      !task.payload.reason
    );
  });

  return (
    <div className="mb-3 sm:mb-4">
      <div id={step.id} className="mb-2 sm:mb-3">
        <button
          className="text-[11px] sm:text-xs font-semibold text-gray-700 mb-1 sm:mb-2 flex items-center gap-2 sm:gap-3 hover:text-blue-600 transition-colors w-full text-left"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-blue-500 text-white text-[10px] font-bold">
            {stepIndex + 1}
          </span>
          <span className="flex-1 truncate">{getStepName(step)}</span>
          {isExpanded ? (
            <UpOutlined className="text-xs flex-shrink-0" />
          ) : (
            <DownOutlined className="text-xs flex-shrink-0" />
          )}
        </button>
        <div className="pl-7 sm:pl-9 text-[10px] sm:text-xs text-gray-500">{getStepDesc(step.agentName ?? '')}</div>
      </div>
      {isExpanded && (
        <div className="ml-4 sm:ml-8 space-y-1 sm:space-y-2 max-w-full overflow-hidden">
          {filteredTasks.map((task, taskIndex) =>
            task.type === "thinking" &&
              step.agentName === "planner" ? (
              <PlanTaskView key={`${step.id}-${task.id}-${taskIndex}`} task={task} />
            ) : (
              <div key={`${step.id}-${task.id}-${taskIndex}`} className="">
                {task.type === "thinking" ? (
                  <div
                    className="rounded-md p-2 sm:p-3 border border-gray-200 bg-white"
                    style={{ contentVisibility: 'auto' as any, containIntrinsicSize: '160px 480px', willChange: 'opacity' }}
                  >
                    <Markdown
                      className="text-gray-700 text-[11px] sm:text-xs"
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
        <div className="mt-4 mb-4">
          <hr className="border-gray-200/60" />
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
