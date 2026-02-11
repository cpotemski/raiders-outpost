-- Production-safe: relax single-community constraint so one user can join multiple communities.
DROP INDEX IF EXISTS "CommunityMember_userId_key";

-- Keep lookups by user performant after removing the unique index.
CREATE INDEX IF NOT EXISTS "CommunityMember_userId_idx" ON "CommunityMember"("userId");
