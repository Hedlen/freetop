import { DownOutlined, UpOutlined } from "@ant-design/icons";
import { parse } from "best-effort-json-parser";
import { useMemo, useState } from "react";

import { Atom } from "~/core/icons";
import { cn } from "~/core/utils";
import {
  type WorkflowStep,
  type Workflow,
  type ThinkingTask,
} from "~/core/workflow";

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
    <div className="flex flex-col gap-6">
      <div className={cn("grid grid-cols-[220px_1fr] overflow-hidden rounded-2xl border min-h-[500px]", className)}>
        <aside className="flex flex-col border-r bg-[rgba(0,0,0,0.02)] sticky top-0 h-fit max-h-[500px]">
          <div className="flex-shrink-0 px-4 py-4 font-medium border-b bg-white/50">Flow</div>
          <ol className="flex flex-col gap-3 px-4 py-4 overflow-y-auto">
            {steps.map((step, index) => (
              <li
                key={step.id}
                className="flex cursor-pointer items-center gap-3 p-2 rounded-lg hover:bg-white/60 transition-colors"
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
                <div className="flex h-3 w-3 rounded-full bg-blue-400 flex-shrink-0"></div>
                <div className="text-sm font-medium">{index + 1}. {getStepName(step)}</div>
              </li>
            ))}
          </ol>
        </aside>
        <main className="overflow-auto bg-white p-6">
          <div className="max-w-4xl">
            {steps.map((step, stepIndex) => (
              <div key={step.id} className="mb-8">
                <div id={step.id} className="mb-6">
                  <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-white text-xs font-bold">
                      {stepIndex + 1}
                    </span>
                    {getStepName(step)}
                  </h3>
                </div>
                <div className="ml-11 space-y-4">
                  {step.tasks
                    .filter(
                      (task) =>
                        !(
                          task.type === "thinking" &&
                          !task.payload.text &&
                          !task.payload.reason
                        ),
                    )
                    .map((task) =>
                      task.type === "thinking" &&
                      step.agentName === "planner" ? (
                        <PlanTaskView key={task.id} task={task} />
                      ) : (
                        <div key={task.id} className="">
                          {task.type === "thinking" ? (
                            <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-300">
                              <Markdown
                                className="text-gray-600 text-sm"
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
                {stepIndex < steps.length - 1 && (
                  <div className="mt-8 mb-8">
                    <hr className="border-gray-200" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>
      {reportStep && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl border border-green-200 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-3">
               <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-white text-sm font-bold">
                 ✓
               </span>
               Report
             </h2>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <Markdown className="prose prose-sm max-w-none">
              {reportStep.tasks[0]?.type === "thinking"
                ? reportStep.tasks[0].payload.text
                : ""}
            </Markdown>
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
  const markdown = `## ${plan.title ?? ""}\n\n${plan.steps?.map((step) => `- **${step.title ?? ""}**\n\n${step.description ?? ""}`).join("\n\n") ?? ""}`;
  return (
    <div key={task.id} className="space-y-4">
      {reason && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <button
            className="mb-3 flex items-center gap-2 rounded-lg bg-blue-500 hover:bg-blue-600 px-3 py-1.5 text-xs text-white font-medium transition-colors"
            onClick={() => setShowReason(!showReason)}
          >
            <Atom className="h-3 w-3" />
            <span>Deep Thought</span>
            {showReason ? (
              <UpOutlined className="text-xs" />
            ) : (
              <DownOutlined className="text-xs" />
            )}
          </button>
          {showReason && (
            <div className="bg-white rounded-md p-3 border-l-4 border-blue-400">
              <Markdown className="text-gray-600 text-xs leading-relaxed prose-xs">
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

function getStepName(step: WorkflowStep) {
  switch (step.agentName) {
    case "browser":
      return "Browsing Web";
    case "coder":
      return "Coding";
    case "file_manager":
      return "File Management";
    case "planner":
      return "Planning";
    case "researcher":
      return "Researching";
    case "supervisor":
      return "Thinking";
    default:
      return step.agentName;
  }
}
