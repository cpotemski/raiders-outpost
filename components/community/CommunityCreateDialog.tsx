"use client";

import { CommunityCreateForm } from "@/components/community/CommunityCreateForm";
import { useLabels } from "@/components/locale/useLabels";

type CommunityCreateDialogProps = {
  status: "idle" | "loading" | "saving" | "joining";
  error: string;
  name: string;
  onNameChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
};

export function CommunityCreateDialog({
  status,
  error,
  name,
  onNameChange,
  onSubmit,
  onClose,
}: CommunityCreateDialogProps) {
  const labels = useLabels();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
      <button
        type="button"
        aria-label={labels.closeOverlay}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-md">
        <div className="arc-panel arc-corners overflow-hidden" data-testid="community-create-dialog">
          <div className="arc-panel-header">
            <div>
              <p className="hud-label">{labels.communityLabel}</p>
              <h3 className="text-base font-semibold uppercase tracking-[0.12em]">
                {labels.createCommunity}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-6 w-6 border border-frame2 text-xs font-semibold uppercase tracking-[0.12em] text-muted"
            >
              X
            </button>
          </div>
          <div className="border-t border-frame2 bg-panel/80 px-3 py-4">
            <CommunityCreateForm
              status={status}
              error={error}
              name={name}
              onNameChange={onNameChange}
              onSubmit={onSubmit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
