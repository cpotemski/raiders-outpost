export type CommunityMember = {
  id: string;
  name: string;
  joinedAt: string;
  activeExpeditionSlug?: string | null;
};

export type Community = {
  id: string;
  name: string;
  inviteCode: string;
  members: CommunityMember[];
};

export type CommunityNeedsMember = {
  id: string;
  name: string;
  joinedAt: string;
  activeExpeditionSlug?: string | null;
};

export type CommunityNeedsItem = {
  itemId: string;
  displayName: string;
  itemType: string;
  rarity: string;
  totalNeeded: number;
  memberNeeds: Array<{
    memberId: string;
    memberName: string;
    needed: number;
  }>;
};

export type CommunityNeedsPayload = {
  members: CommunityNeedsMember[];
  items: CommunityNeedsItem[];
};
