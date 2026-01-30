import { cn } from "@/lib/cn";
import { getInitials } from "@/lib/format";
import type {
  BlueprintCommunityMember,
  BlueprintItem,
} from "@/types/blueprints";

type BlueprintDetailDialogProps = {
  item: BlueprintItem;
  owned: boolean;
  communityMembers: BlueprintCommunityMember[];
  ownershipByItem: Record<string, string[]>;
  viewerId: string | null;
  onClose: () => void;
  onToggleOwned: (id: string) => void;
};

export function BlueprintDetailDialog({
  item,
  owned,
  communityMembers,
  ownershipByItem,
  viewerId,
  onClose,
  onToggleOwned,
}: BlueprintDetailDialogProps) {
  const label = item.name.replace(/\s*Blueprint\s*$/i, "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
      <button
        type="button"
        aria-label="Close overlay"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-sm">
        <div className="arc-panel arc-corners overflow-hidden">
          <div className="arc-panel-header">
            <div>
              <p className="hud-label">Blueprint</p>
              <h3 className="text-base font-semibold uppercase tracking-[0.12em]">
                {label}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="hud-label">{owned ? "Owned" : "Needed"}</span>
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
            {communityMembers.length ? (
              <div>
                <div className="hud-label">Needs Item</div>
                <div className="mt-2 space-y-2">
                  {(() => {
                    const ownedIds = new Set(ownershipByItem[item.id] ?? []);
                    const members = communityMembers.filter((member) => {
                      if (viewerId && member.id === viewerId) return false;
                      return !ownedIds.has(member.id);
                    });
                    if (!members.length) {
                      return (
                        <div className="border border-frame2/70 bg-panel2/40 px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-muted">
                          All synced
                        </div>
                      );
                    }
                    return members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 rounded-[6px] border border-frame2 bg-panel2/60 px-3 py-2"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-frame2/80 bg-panel text-[10px] font-semibold uppercase tracking-[0.14em] text-text">
                          {getInitials(member.name)}
                        </span>
                        <div className="leading-tight">
                          <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-text">
                            {member.name}
                          </div>
                          <div className="text-[10px] uppercase tracking-[0.18em] text-muted">
                            Needs
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            ) : (
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted">
                No crew link. Join a community to sync ownership.
              </div>
            )}
            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  onToggleOwned(item.id);
                  onClose();
                }}
                className={cn(
                  "h-9 flex-1 border px-3 text-xs font-semibold uppercase tracking-[0.12em] transition",
                  owned
                    ? "border-frame2 text-muted hover:border-accent/60"
                    : "border-accent/70 text-text hover:border-accent"
                )}
              >
                {owned ? "Need" : "Found"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
