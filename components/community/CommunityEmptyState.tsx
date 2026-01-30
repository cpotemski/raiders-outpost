import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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
  return (
    <div className="border-t border-frame2 px-4 py-5">
      <div className="text-sm font-semibold uppercase tracking-[0.1em] text-text">
        No signal.
      </div>
      <div className="mt-2 text-[11px] uppercase tracking-[0.08em] text-muted">
        Establish an uplink to create a crew.
      </div>
      {inviteCode ? (
        <div className="mt-4 text-[11px] uppercase tracking-[0.08em] text-warn">
          {status === "joining" ? "Joining uplink..." : error || ""}
        </div>
      ) : (
        <form className="mt-4 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="hud-label" htmlFor="community-name">
              Community Name
            </label>
            <Input
              id="community-name"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Enter community name"
            />
            {error ? (
              <div className="mt-2 text-[11px] uppercase tracking-[0.08em] text-warn">
                {error}
              </div>
            ) : (
              <div className="mt-2 text-[11px] uppercase tracking-[0.08em] text-muted">
                Field gear, no ranks. One crew.
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            <Button
              type="submit"
              variant="primary"
              className="px-5"
              disabled={status === "saving"}
            >
              Create Community
            </Button>
            <span className="hud-label">SCANNING CACHE...</span>
          </div>
        </form>
      )}
    </div>
  );
}
