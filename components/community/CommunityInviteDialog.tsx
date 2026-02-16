"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useLabels } from "@/components/locale/useLabels";
import { copyTextToClipboard } from "@/lib/clipboard";

type CommunityInviteDialogProps = {
  communityName: string;
  inviteUrl: string;
  onClose: () => void;
};

export function CommunityInviteDialog({
  communityName,
  inviteUrl,
  onClose,
}: CommunityInviteDialogProps) {
  const labels = useLabels();
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    const success = await copyTextToClipboard(inviteUrl);
    if (!success) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
      <button
        type="button"
        aria-label={labels.closeOverlay}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-md">
        <div className="arc-panel arc-corners overflow-hidden" data-testid="community-invite-dialog">
          <div className="arc-panel-header">
            <div>
              <p className="hud-label">{labels.communityLabel}</p>
              <h3 className="text-base font-semibold uppercase tracking-[0.12em]">
                {labels.inviteAction}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              data-testid="community-invite-close"
              className="h-6 w-6 border border-frame2 text-xs font-semibold uppercase tracking-[0.12em] text-muted"
            >
              X
            </button>
          </div>
          <div className="border-t border-frame2 bg-panel/80 px-3 py-4">
            <div className="text-[11px] uppercase tracking-[0.12em] text-muted">
              {labels.communityInviteIntroTitle}
            </div>
            <div className="mt-2 text-[11px] uppercase tracking-[0.08em] text-muted">
              {labels.communityInviteIntroBody}
            </div>
            <div className="mt-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-text">
              {communityName}
            </div>
            <div className="mt-3">
              <Input
                readOnly
                value={inviteUrl}
                aria-label={labels.inviteLinkAria}
                className="font-mono text-[11px]"
                data-testid="community-invite-link-input"
              />
            </div>
            <div className="mt-2 text-[10px] uppercase tracking-[0.16em] text-muted">
              {labels.inviteHelp}
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                variant="default"
                className="h-8 px-3 text-[10px]"
                onClick={onCopy}
              >
                {copied ? labels.copied : labels.copy}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
