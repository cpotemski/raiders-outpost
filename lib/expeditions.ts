export const isExpeditionProjectSlug = (slug: string) =>
  slug.startsWith("expedition_project");

const EXPEDITION_SEQUENCE = [
  "expedition_project_s1",
  "expedition_project",
  "expedition_project_s3",
  "expedition_project_s4",
  "expedition_project_s5",
] as const;

const getExpeditionSortKey = (slug: string) => {
  const index = EXPEDITION_SEQUENCE.indexOf(
    slug as (typeof EXPEDITION_SEQUENCE)[number]
  );
  if (index >= 0) return index;
  return EXPEDITION_SEQUENCE.length + 1000;
};

export const orderExpeditionSlugs = (slugs: string[]) => {
  return [...new Set(slugs)]
    .filter((slug) => isExpeditionProjectSlug(slug))
    .sort((a, b) => {
      const keyDiff = getExpeditionSortKey(a) - getExpeditionSortKey(b);
      if (keyDiff !== 0) return keyDiff;
      return a.localeCompare(b);
    });
};

export const orderExpeditionProjects = <T extends { slug: string }>(
  projects: T[]
) => {
  return [...projects].sort((a, b) => {
    const keyDiff =
      getExpeditionSortKey(a.slug) - getExpeditionSortKey(b.slug);
    if (keyDiff !== 0) return keyDiff;
    return a.slug.localeCompare(b.slug);
  });
};

export const sanitizeCompletedExpeditionSlugs = (
  completedSlugs: string[],
  availableSlugs: string[]
) => {
  const ordered = orderExpeditionSlugs(availableSlugs);
  const completedSet = new Set(
    completedSlugs.filter((slug) => ordered.includes(slug))
  );
  const sanitized: string[] = [];

  for (const slug of ordered) {
    if (!completedSet.has(slug)) {
      break;
    }
    sanitized.push(slug);
  }

  return sanitized;
};

export const getAvailableExpeditionSlug = (
  completedSlugs: string[],
  availableSlugs: string[]
) => {
  const ordered = orderExpeditionSlugs(availableSlugs);
  const completed = new Set(
    sanitizeCompletedExpeditionSlugs(completedSlugs, availableSlugs)
  );
  return ordered.find((slug) => !completed.has(slug)) ?? null;
};

export const getNextExpeditionSlug = (
  currentSlug: string | null,
  availableSlugs: string[]
) => {
  const ordered = orderExpeditionSlugs(availableSlugs);
  if (!ordered.length) return null;
  if (!currentSlug) return ordered[0];
  const index = ordered.indexOf(currentSlug);
  if (index < 0) return ordered[0];
  return ordered[index + 1] ?? null;
};
