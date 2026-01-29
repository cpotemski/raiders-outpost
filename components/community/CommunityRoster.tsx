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
          <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-2 bg-panel2 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            <span>Operator</span>
            <span className="text-right">Status</span>
          </div>
          {community.members.map((member) => (
            <div
              key={member.id}
              className="grid grid-cols-[minmax(0,1fr)_120px] items-center gap-2 px-3 py-2 text-xs uppercase tracking-[0.12em]"
            >
              <span>{member.name}</span>
              <span className="text-right text-accent">Synced</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
