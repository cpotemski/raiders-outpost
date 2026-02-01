"use client";

import { Button } from "@/components/ui/Button";
import type { CommunityMember } from "@/types/community";
import { useLabels } from "@/components/locale/useLabels";

type CommunityRemoveDialogProps = {
  member: CommunityMember;
  removeError: string;
  removingId: string | null;
  onClose: () => void;
  onConfirm: (memberId: string) => Promise<boolean>;
};

export function CommunityRemoveDialog({
  member,
  removeError,
  removingId,
  onClose,
  onConfirm,
}: CommunityRemoveDialogProps) {
  const labels = useLabels();
  const isRemoving = removingId === member.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
      <button
        type="button"
        aria-label={labels.closeOverlay}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-sm">
        <div className="arc-panel arc-corners overflow-hidden">
          <div className="arc-panel-header">
            <div>
              <p className="hud-label">{labels.confirmRemoval}</p>
              <h3 className="text-base font-semibold uppercase tracking-[0.12em]">
                {labels.severUplink}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="hud-label">{labels.actionLabel}</span>
              <button
                type="button"
                onClick={onClose}
                className="h-6 w-6 border border-frame2 text-xs font-semibold uppercase tracking-[0.12em] text-muted"
              >
                X
              </button>
            </div>
          </div>
          <div className="border-t border-frame2 bg-panel/80 px-4 py-4">
            <div className="text-[11px] uppercase tracking-[0.12em] text-muted">
              {labels.removeRaiderPrompt}
            </div>
            <div className="mt-2 text-sm font-semibold uppercase tracking-[0.14em] text-text">
              {member.name}
            </div>
            {removeError ? (
              <div className="mt-3 text-[11px] uppercase tracking-[0.08em] text-warn">
                {removeError}
              </div>
            ) : null}
            <div className="mt-5 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="default"
                className="h-9 flex-1 border-frame2 text-muted hover:border-accent/60"
                onClick={onClose}
                disabled={isRemoving}
              >
                {labels.cancel}
              </Button>
              <Button
                type="button"
                variant="primary"
                className="h-9 flex-1 border-warn/70 text-text hover:border-warn"
                onClick={async () => {
                  const success = await onConfirm(member.id);
                  if (success) onClose();
                }}
                disabled={isRemoving}
              >
                {isRemoving ? labels.severing : labels.confirm}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
