"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { copyTextToClipboard } from "@/lib/clipboard";

export type ScriptEndpoint = {
  path: string;
  description: string;
  output: string;
  command: string;
};

type ScriptsEndpointListProps = {
  endpoints: ScriptEndpoint[];
};

export function ScriptsEndpointList({ endpoints }: ScriptsEndpointListProps) {
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const onCopy = async (command: string) => {
    const copied = await copyTextToClipboard(command);
    if (!copied) return;

    setCopiedCommand(command);
    window.setTimeout(() => {
      setCopiedCommand((current) => (current === command ? null : current));
    }, 1400);
  };

  return (
    <div className="my-4 space-y-3">
      {endpoints.map((endpoint) => (
        <article
          key={endpoint.path}
          className="border border-[color:var(--frame2)] bg-[color:var(--panel2)]/50 p-3"
        >
          <p className="font-mono text-sm text-[color:var(--accent)]">
            {endpoint.path}
          </p>
          <p className="mt-2 text-sm leading-6">{endpoint.description}</p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
            {endpoint.output}
          </p>
          <div className="mt-3 flex flex-wrap items-start gap-2">
            <pre className="min-w-0 flex-1 overflow-x-auto border border-[color:var(--frame2)] bg-[color:var(--panel2)]/60 p-3 text-xs text-[color:var(--text)]">
              {endpoint.command}
            </pre>
            <Button
              type="button"
              variant="default"
              className="px-2 py-1 text-[10px]"
              onClick={() => onCopy(endpoint.command)}
              data-testid={`copy-command-${endpoint.path.replaceAll("/", "-")}`}
            >
              {copiedCommand === endpoint.command ? "Copied" : "Copy"}
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
