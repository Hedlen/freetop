import { DownOutlined, UpOutlined } from "@ant-design/icons";
import { parse } from "best-effort-json-parser";
import { useMemo, useState, useEffect, useRef } from "react";

import { Atom } from "~/core/icons";
import { cn } from "~/core/utils";
import { WorkflowStep, WorkflowTask } from "~/types/workflow";
import { Markdown } from "./Markdown";
import { ToolCallView } from "./ToolCallView";

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
  return (
    <div className="flex flex-col gap-3 sm:gap-6">
      <div className={cn("grid grid-cols-1 lg:grid-cols-[200px_1fr] xl:grid-cols-[220px_1fr] overflow-hidden rounded-lg sm:rounded-2xl border min-h-[300px] sm:min-h-[500px]", className)}>
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
              {reportStep.tasks[0]?.type === "thinking"
                ? reportStep.tasks[0].payload.text
                : ""}
            </Markdown>
          </div>
        </div>
      )}
      {reportStep && (
        <div className="flex justify-start">
          <ReportActions reportContent={reportStep.tasks[0]?.type === "thinking" ? reportStep.tasks[0].payload.text : ""} />
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
      const { useStore, sendMessage, setResponding } = await import('~/core/store');
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
        
        await sendMessage(userMessage, config);
          
          console.log('Retry completed successfully');
        } else {
          console.log('No valid user message found for retry');
        }
      } else {
        console.log('No workflow message found for retry');
      }
    } catch (error) {
      console.error('Error in handleReportRetry:', error);
      // 确保在出错时重置responding状态
      const { setResponding } = await import('~/core/store');
      setResponding(false);
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
    <div className="flex gap-1 mt-2">
      <button
        onClick={handleCopy}
        className="flex items-center gap-1 px-2 py-1 rounded-md transition-colors text-xs font-medium bg-blue-100 hover:bg-blue-200 text-blue-700"
        title="复制整个回复"
      >
        {copySuccess ? (
          <>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>已复制</span>
          </>
        ) : (
          <>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>复制</span>
          </>
        )}
      </button>
      
      <button
        onClick={handleReportRetry}
        className="flex items-center gap-1 px-2 py-1 rounded-md transition-colors text-xs font-medium bg-green-100 hover:bg-green-200 text-green-700"
        title="重新生成整个回复"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>重试</span>
      </button>
      
      <button
        onClick={handleDelete}
        className="flex items-center gap-1 px-2 py-1 rounded-md transition-colors text-xs font-medium bg-red-100 hover:bg-red-200 text-red-700"
        title="删除整个回复"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span>删除</span>
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
