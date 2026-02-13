"use client";

import { usePathname } from "next/navigation";
import { BackLinkBar } from "@/components/layout/BackLinkBar";
import { TopNav } from "@/components/layout/TopNav";
import { AuthGate } from "@/components/auth/AuthGate";
import { IdentitySync } from "@/components/auth/IdentitySync";
import { ExpeditionResetNotice } from "@/components/expeditions/ExpeditionResetNotice";

export function RouteChrome() {
  const pathname = usePathname();
  const isAdmin = pathname === "/admin";

  if (isAdmin) {
    return null;
  }

  return (
    <>
      <IdentitySync />
      <AuthGate />
      <TopNav />
      <ExpeditionResetNotice />
      <BackLinkBar />
    </>
  );
}
