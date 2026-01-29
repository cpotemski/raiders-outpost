"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocalIdentity } from "../auth/useLocalIdentity";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";

type CommunityMember = {
  id: string;
  name: string;
  joinedAt: string;
};

type Community = {
  id: string;
  name: string;
  inviteCode: string;
  members: CommunityMember[];
};

export function CommunityRoster() {
  const { identity, ready, clearIdentity } = useLocalIdentity();
  const searchParams = useSearchParams();
  const router = useRouter();
  const inviteCode = searchParams.get("invite")?.trim() ?? "";
  const [community, setCommunity] = useState<Community | null>(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [removeError, setRemoveError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmMember, setConfirmMember] = useState<CommunityMember | null>(
    null
  );
  const [origin, setOrigin] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (!ready || inviteCode) return;
    if (!identity) {
      setCommunity(null);
      return;
    }

    let active = true;
    setStatus("loading");
    fetch("/api/community", {
      headers: { "x-arc-token": identity.token },
    })
      .then((res) => {
        if (res.status === 401 || res.status === 404) {
          clearIdentity();
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((payload) => {
        if (!active) return;
        setCommunity(payload?.community ?? null);
        setStatus("idle");
      })
      .catch(() => {
        if (!active) return;
        setStatus("idle");
      });

    return () => {
      active = false;
    };
  }, [clearIdentity, identity, inviteCode, ready]);

  useEffect(() => {
    if (!inviteCode || !identity || community || !ready) return;
    let active = true;
    setStatus("joining");
    fetch("/api/community/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-arc-token": identity.token,
      },
      body: JSON.stringify({ code: inviteCode }),
    })
      .then((res) => res.json().then((payload) => ({ res, payload })))
      .then(({ res, payload }) => {
        if (!active) return;
        if (!res.ok) {
          setError("Invite link invalid");
          setStatus("idle");
          return;
        }
        setCommunity(payload?.community ?? null);
        setStatus("idle");
        router.replace("/community");
      })
      .catch(() => {
        if (!active) return;
        setError("Invite link invalid");
        setStatus("idle");
      });

    return () => {
      active = false;
    };
  }, [community, identity, inviteCode, ready, router]);

  const inviteUrl = useMemo(() => {
    if (!community || !origin) return "";
    return `${origin}/community?invite=${community.inviteCode}`;
  }, [community, origin]);

  const onCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!identity || status === "saving") return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name required");
      return;
    }
    setError("");
    setStatus("saving");
    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-arc-token": identity.token,
        },
        body: JSON.stringify({ name: trimmed }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setError("Creation failed");
        setStatus("idle");
        return;
      }
      setCommunity(payload?.community ?? null);
      setName("");
      setStatus("idle");
    } catch {
      setError("Creation failed");
      setStatus("idle");
    }
  };

  const onRemove = async (memberId: string) => {
    if (!identity || !community || removingId) return;
    setRemoveError("");
    setRemovingId(memberId);
    try {
      const res = await fetch("/api/community/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-arc-token": identity.token,
        },
        body: JSON.stringify({ memberId }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setRemoveError(payload?.error ?? "Removal failed");
        setRemovingId(null);
        return false;
      }
      setCommunity(payload?.community ?? null);
      setRemovingId(null);
      return true;
    } catch {
      setRemoveError("Removal failed");
      setRemovingId(null);
      return false;
    }
  };

  if (!ready) {
    return (
      <div className="border-t border-frame2 px-4 py-5 text-sm uppercase tracking-[0.08em] text-muted">
        Syncing uplink...
      </div>
    );
  }

  if (!identity) {
    return (
      <div className="border-t border-frame2 px-4 py-5 text-sm uppercase tracking-[0.08em] text-muted">
        No operator linked.
      </div>
    );
  }

  if (!community) {
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
          <form className="mt-4 space-y-4" onSubmit={onCreate}>
            <div>
              <label className="hud-label" htmlFor="community-name">
                Community Name
              </label>
              <Input
                id="community-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (error) setError("");
                }}
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

  return (
    <div className="border-t border-frame2 px-4 py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="hud-label">Community Name</div>
          <div className="text-lg font-semibold uppercase tracking-[0.12em]">
            {community.name}
          </div>
        </div>
        <div className="text-right">
          <div className="hud-label">Members</div>
          <div className="text-sm font-semibold uppercase tracking-[0.12em]">
            {community.members.length} LINKED
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div>
          <div className="hud-label">Invite Link</div>
          <Input
            readOnly
            value={inviteUrl}
            aria-label="Invite link"
            className="mt-2 font-mono text-[11px]"
          />
        </div>
        <div className="text-[11px] uppercase tracking-[0.08em] text-muted">
          Share the uplink to sync more operators.
        </div>
      </div>

      <div className="mt-6">
        <div className="hud-label">Members</div>
        <div className="mt-3 divide-y divide-frame2 border border-frame2">
          <div className="grid grid-cols-[minmax(0,1fr)_120px_120px] gap-2 bg-panel2 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            <span>Operator</span>
            <span className="text-right">Status</span>
            <span className="text-right">Action</span>
          </div>
          {community.members.map((member) => (
            <div
              key={member.id}
              className="grid grid-cols-[minmax(0,1fr)_120px_120px] items-center gap-2 px-3 py-2 text-xs uppercase tracking-[0.12em]"
            >
              <span>{member.name}</span>
              <span className="text-right text-accent">Synced</span>
              <div className="text-right">
                <Button
                  type="button"
                  variant="default"
                  className="px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-warn hover:border-warn/70"
                  aria-label={`Remove ${member.name}`}
                  disabled={removingId === member.id}
                  onClick={() => {
                    setRemoveError("");
                    setConfirmMember(member);
                  }}
                >
                  Unlink
                </Button>
              </div>
            </div>
          ))}
        </div>
        {removeError ? (
          <div className="mt-3 text-[11px] uppercase tracking-[0.08em] text-warn">
            {removeError}
          </div>
        ) : null}
      </div>
      {confirmMember ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
          <button
            type="button"
            aria-label="Close confirmation"
            className="absolute inset-0 cursor-default"
            onClick={() => setConfirmMember(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-sm"
          >
            <div className="arc-panel arc-corners overflow-hidden">
              <div className="arc-panel-header">
                <div>
                  <p className="hud-label">Confirm Removal</p>
                  <h3 className="text-base font-semibold uppercase tracking-[0.12em]">
                    Unlink Operator
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hud-label">Action</span>
                  <button
                    type="button"
                    onClick={() => setConfirmMember(null)}
                    className="h-6 w-6 border border-frame2 text-xs font-semibold uppercase tracking-[0.12em] text-muted"
                  >
                    X
                  </button>
                </div>
              </div>
              <div className="border-t border-frame2 bg-panel/80 px-4 py-4">
                <div className="text-[11px] uppercase tracking-[0.12em] text-muted">
                  Remove operator from crew?
                </div>
                <div className="mt-2 text-sm font-semibold uppercase tracking-[0.14em] text-text">
                  {confirmMember.name}
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
                    onClick={() => setConfirmMember(null)}
                    disabled={removingId === confirmMember.id}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    className="h-9 flex-1 border-warn/70 text-text hover:border-warn"
                    onClick={async () => {
                      const success = await onRemove(confirmMember.id);
                      if (success) setConfirmMember(null);
                    }}
                    disabled={removingId === confirmMember.id}
                  >
                    {removingId === confirmMember.id
                      ? "Unlinking"
                      : "Confirm"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
