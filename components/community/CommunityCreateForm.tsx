"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useLabels } from "@/components/locale/useLabels";

type CommunityCreateFormProps = {
  status: "idle" | "loading" | "saving" | "joining";
  error: string;
  name: string;
  onNameChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function CommunityCreateForm({
  status,
  error,
  name,
  onNameChange,
  onSubmit,
}: CommunityCreateFormProps) {
  const labels = useLabels();

  return (
    <form
      className="space-y-4"
      onSubmit={onSubmit}
      data-testid="community-create-form"
    >
      <div>
        <div className="py-3 text-[11px] uppercase tracking-[0.08em] text-muted">
          {labels.establishUplink}
        </div>
        <label className="hud-label" htmlFor="community-name">
          {labels.communityNameLabel}
        </label>
        <Input
          id="community-name"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={labels.communityNamePlaceholder}
          data-testid="community-name-input"
        />
        {error ? (
          <div className="mt-2 text-[11px] uppercase tracking-[0.08em] text-warn">
            {error}
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-3">
        <Button
          type="submit"
          variant="primary"
          className="px-5"
          disabled={status === "saving"}
          data-testid="community-create-submit"
        >
          {labels.createCommunity}
        </Button>
      </div>
    </form>
  );
}
