UPDATE "User"
SET "completedExpeditionSlugs" = CASE
  WHEN "activeExpeditionSlug" = 'expedition_project' THEN ARRAY['expedition_project_s1']::TEXT[]
  WHEN "activeExpeditionSlug" = 'expedition_project_s3' THEN ARRAY['expedition_project_s1','expedition_project']::TEXT[]
  ELSE ARRAY[]::TEXT[]
END
WHERE
  COALESCE(array_length("completedExpeditionSlugs", 1), 0) = 0
  AND "activeExpeditionSlug" IS NOT NULL;
