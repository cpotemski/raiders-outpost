import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

type StageStep = {
  stageKey: string;
  name: string;
};

type ProjectStageStepperProps = {
  stages: StageStep[];
  completionStatus: Record<string, boolean>;
  onToggleStageCompletion?: (stageKey: string) => void;
  disableToggleStatus?: Record<string, boolean>;
  className?: string;
};

type ProjectStageStepMarkerProps = {
  stageKey: string;
  completed: boolean;
  onClick?: (stageKey: string) => void;
  disabled?: boolean;
  className?: string;
};

export function ProjectStageStepMarker({
  stageKey,
  completed,
  onClick,
  disabled = false,
  className,
}: ProjectStageStepMarkerProps) {
  const markerClassName = cn(
    "relative z-10 inline-flex h-5 w-5 items-center justify-center rounded-full border bg-panel shadow-[0_0_0_3px_var(--panel)] transition-colors",
    completed
      ? "border-accent/80 text-accent"
      : "border-frame2 text-muted",
    onClick && !disabled ? "cursor-pointer hover:border-accent/70 hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/60" : "",
    disabled ? "cursor-not-allowed opacity-60" : "",
    className
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={() => onClick(stageKey)}
        disabled={disabled}
        className={markerClassName}
        data-testid={`project-stage-step-${stageKey}`}
        data-stage-step-completed={completed ? "true" : "false"}
        data-stage-step-toggle={disabled ? "false" : "true"}
        aria-label={completed ? "Mark stage as uncompleted" : "Mark stage as completed"}
      >
        {completed ? <Check className="h-3 w-3" aria-hidden="true" /> : null}
      </button>
    );
  }

  return (
    <span
      className={cn(
        markerClassName
      )}
      data-testid={`project-stage-step-${stageKey}`}
      data-stage-step-completed={completed ? "true" : "false"}
      aria-hidden="true"
    >
      {completed ? <Check className="h-3 w-3" aria-hidden="true" /> : null}
    </span>
  );
}

export function ProjectStageStepper({
  stages,
  completionStatus,
  onToggleStageCompletion,
  disableToggleStatus,
  className,
}: ProjectStageStepperProps) {
  if (!stages.length) {
    return null;
  }

  return (
    <div
      className={cn("px-3 pt-2 pb-4", className)}
      data-testid="project-stage-stepper"
    >
      <ol className="flex flex-wrap items-start gap-0">
        {stages.map((stage, index) => {
          const completed = Boolean(completionStatus[stage.stageKey]);
          const previousCompleted =
            index > 0 ? Boolean(completionStatus[stages[index - 1]?.stageKey]) : false;
          return (
            <li key={stage.stageKey} className="relative min-w-[220px] flex-1 px-2">
              {index > 0 ? (
                <span
                  className={cn(
                    "pointer-events-none absolute top-2.5 left-0 right-1/2 -mr-2.5 h-px",
                    previousCompleted ? "bg-accent/60" : "bg-frame2/80"
                  )}
                  aria-hidden="true"
                  data-testid="project-stage-step-line"
                />
              ) : null}
              {index < stages.length - 1 ? (
                <span
                  className={cn(
                    "pointer-events-none absolute top-2.5 left-1/2 -ml-2.5 right-0 h-px",
                    completed ? "bg-accent/60" : "bg-frame2/80"
                  )}
                  aria-hidden="true"
                  data-testid="project-stage-step-line"
                />
              ) : null}
              <div className="relative z-10 flex flex-col items-center gap-1 text-center">
                <ProjectStageStepMarker
                  stageKey={stage.stageKey}
                  completed={completed}
                  onClick={onToggleStageCompletion}
                  disabled={Boolean(disableToggleStatus?.[stage.stageKey])}
                />
                <span className="block max-w-full text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                  {stage.name}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
