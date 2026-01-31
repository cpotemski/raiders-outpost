export type ProjectItemProgress = {
  projectItemId: string;
  projectSlug: string;
  isExpedition: boolean;
  itemId: string;
  displayName: string;
  quantityRequired: number;
  quantityOwned: number;
  imageFile: string | null;
  rarity: string;
  itemType: string;
};

export type ProjectStageProgress = {
  stageKey: string;
  name: string;
  sortOrder: number;
  items: ProjectItemProgress[];
};

export type ProjectProgress = {
  slug: string;
  name: string;
  kind: "workshop" | "project" | "blueprints";
  repeatable: boolean;
  timeLimitedUntil: string | null;
  stages: ProjectStageProgress[];
};

export type ProjectProgressPayload = {
  projects: ProjectProgress[];
  memberCount: number;
  expeditionMemberCountsBySlug: Record<string, number>;
  communityCountsByItemId: Record<string, number>;
  activeExpeditionSlug: string | null;
};
