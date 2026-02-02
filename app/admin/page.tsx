import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AdminConsole } from "@/components/admin/AdminConsole";

type AdminPageProps = {
  searchParams?: Promise<{
    password?: string | string[];
  }>;
};

const getPasswordParam = (value?: string | string[]) => {
  if (!value) return "";
  return Array.isArray(value) ? value[0] ?? "" : value;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const provided = getPasswordParam(resolvedParams?.password).trim();

  if (!provided) {
    notFound();
  }

  const expected = process.env.ADMIN_PASSWORD;
  const host = (await headers()).get("host") ?? "";
  const isLocalhost =
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("[::1]");
  const isDev = process.env.NODE_ENV !== "production";

  if (!expected && !isDev && !isLocalhost) {
    notFound();
  }

  if (expected && provided !== expected) {
    notFound();
  }

  return <AdminConsole password={provided} />;
}
