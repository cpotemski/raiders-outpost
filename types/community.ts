export type CommunityMember = {
  id: string;
  name: string;
  joinedAt: string;
};

export type Community = {
  id: string;
  name: string;
  inviteCode: string;
  members: CommunityMember[];
};
