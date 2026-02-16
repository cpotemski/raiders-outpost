import { PublicProfileView } from "@/components/public/PublicProfileView";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-4">
      <PublicProfileView slug={slug} />
    </div>
  );
}
