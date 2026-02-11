"use client";

import { useLabels } from "@/components/locale/useLabels";
import { EmptyState } from "@/components/ui/EmptyState";
import { CommunityCreateForm } from "@/components/community/CommunityCreateForm";

type CommunityEmptyStateProps = {
  inviteCode: string;
  status: "idle" | "loading" | "saving" | "joining";
  error: string;
  name: string;
  onNameChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function CommunityEmptyState({
  inviteCode,
  status,
  error,
  name,
  onNameChange,
  onSubmit,
}: CommunityEmptyStateProps) {
  const labels = useLabels();
  return (
    <div>
      <div className="text-sm font-semibold uppercase tracking-[0.1em] text-text">
        {labels.noSignal}
      </div>
      <div className="mt-2 text-[11px] uppercase tracking-[0.08em] text-muted">
        {labels.establishUplink}
      </div>
      {inviteCode ? (
        <EmptyState className="mt-4 border-warn/40 text-warn">
          {status === "joining" ? labels.joiningUplink : error || ""}
        </EmptyState>
      ) : (
        <div className="mt-4">
          <CommunityCreateForm
            status={status}
            error={error}
            name={name}
            onNameChange={onNameChange}
            onSubmit={onSubmit}
          />
        </div>
      )}
    </div>
  );
}
