export type BlueprintItem = {
  name: string;
  rarity: string;
  itemType: string;
  imageFile: string;
};

export type BlueprintCommunityMember = {
  id: string;
  name: string;
};

export type BlueprintCommunity = {
  id: string;
  name: string;
  members: BlueprintCommunityMember[];
};

export type BlueprintOwnershipPayload = {
  ownedBlueprints: string[];
  viewerId: string | null;
  community?: BlueprintCommunity;
  ownershipByItem?: Record<string, string[]>;
};
