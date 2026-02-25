import type { Prisma } from "@prisma/client";

export type ProjectWithStages = Prisma.ProjectGetPayload<{
  include: { stages: { include: { items: true } } };
}>;

export type CommunityNeedsItem = {
  itemId: string;
  displayName: string;
  imageFile?: string | null;
  totalNeeded: number;
  memberNeeds: Array<{
    memberId: string;
    memberName: string;
    needed: number;
  }>;
};

export type PublicProfileNeedsPayload = {
  name: string;
  members: Array<{
    id: string;
    name: string;
    joinedAt: string;
    activeExpeditionSlug: string | null;
  }>;
  items: CommunityNeedsItem[];
};
