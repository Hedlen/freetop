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
    <div className="flex flex-col gap-4">
      <div className={cn("flex overflow-hidden rounded-2xl border", className)}>
        <aside className="flex w-[220px] flex-shrink-0 flex-col border-r bg-[rgba(0,0,0,0.02)]">
          <div className="flex-shrink-0 px-4 py-4 font-medium">Flow</div>
          <ol className="flex flex-grow list-disc flex-col gap-4 px-4 py-2">
            {steps.map((step) => (
              <li
                key={step.id}
                className="flex cursor-pointer items-center gap-2"
                onClick={() => {
                  if (typeof document !== 'undefined') {
                    const element = document.getElementById(step.id);
                    if (element) {
                      element.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                    }
                  }
                }}
              >
                <div className="flex h-2 w-2 rounded-full bg-gray-400"></div>
                <div>{getStepName(step)}</div>
              </li>
            ))}
          </ol>
        </aside>
        <main className="flex-grow overflow-auto bg-white p-4">
          <ul className="flex flex-col gap-4">
            {steps.map((step, stepIndex) => (
              <li key={step.id} className="flex flex-col gap-2">
                <h3 id={step.id} className="ml-[-4px] text-lg font-bold">
                  📍 Step {stepIndex + 1}: {getStepName(step)}
                </h3>
                <ul className="flex flex-col gap-2">
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
                        <li key={task.id} className="flex">
                          {task.type === "thinking" ? (
                            <Markdown
                              className="pl-6 opacity-70"
                              style={{
                                fontSize: "smaller",
                              }}
                            >
                              {task.payload.text}
                            </Markdown>
                          ) : (
                            <ToolCallView task={task} />
                          )}
                        </li>
                      ),
                    )}
                </ul>
                {stepIndex < steps.length - 1 && <hr className="mb-4 mt-8" />}
              </li>
            ))}
          </ul>
        </main>
      </div>
      {reportStep && (
        <div className="flex flex-col gap-4 p-4">
          <Markdown>
            {reportStep.tasks[0]?.type === "thinking"
              ? reportStep.tasks[0].payload.text
              : ""}
          </Markdown>
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
  const [showReason, setShowReason] = useState(true);
  const reason = task.payload.reason;
  const markdown = `## ${plan.title ?? ""}\n\n${plan.steps?.map((step) => `- **${step.title ?? ""}**\n\n${step.description ?? ""}`).join("\n\n") ?? ""}`;
  return (
    <li key={task.id} className="flex flex-col">
      {reason && (
        <div>
          <div>
            <button
              className="mb-1 flex h-8 items-center gap-2 rounded-2xl border bg-button px-4 text-sm text-button hover:bg-button-hover hover:text-button-hover"
              onClick={() => setShowReason(!showReason)}
            >
              <Atom className="h-4 w-4" />
              <span>Deep Thought</span>
              {showReason ? (
                <UpOutlined className="text-xs" />
              ) : (
                <DownOutlined className="text-xs" />
              )}
            </button>
          </div>
          <div className={cn(showReason ? "block" : "hidden")}>
            <Markdown className="border-l-2 pl-6 text-sm opacity-70">
              {reason}
            </Markdown>
          </div>
        </div>
      )}
      <div>
        <Markdown className="pl-6">{markdown ?? ""}</Markdown>
      </div>
    </li>
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
