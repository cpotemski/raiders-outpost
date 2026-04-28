# Arc Overrides

Custom data and assets for the Arc database now live under `data/arc-overrides`. The loaders for items, projects, and the image API first read the base data from `node_modules/arcraiders-data` and then apply partial JSON patches from this directory. That means you can tweak or add entries without copying every file; only the fields you care about need to appear in the patch file.

## Supported override paths

- `data/arc-overrides/items/<id>.json`
  - Won’t need to mirror the full entry—only the properties you want to change (name, rarity, type, etc.). Newly created files are treated as new items.
  - Files are merged by filename, so keep the same `<id>.json` you see in the upstream dataset.
- `data/arc-overrides/images/items/`
  - Drop PNG/JPG/WebP assets here and they automatically become available to the item loader and the `/api/arc-items/image` route.
  - Overrides take precedence over upstream files with the same name.
- `data/arc-overrides/projects.json`
  - Supply a partial array that patches existing projects by `id`. You can update names, stages, requirements, etc., without copying the whole file.
- `data/arc-overrides/bots.json`
  - Supply a partial array that patches ARC entries by `id`. This is useful for adding missing bots or overriding names without copying the full upstream dataset.
- `data/arc-overrides/hideout/<id>.json`
  - Hideout entries are merged by filename with the builtin hideout data. Add new levels or tweak requirements simply by dropping a partial JSON file that includes the fields you want to change.

## Merge behavior

- Objects are deep-merged; missing fields fall back to the upstream value.
- Arrays of objects that include one of the keys `id`, `slug`, `stageKey`, `itemId`, or `level` are merged entry-by-entry using that key. Override objects with matching keys replace only the fields they define while preserving the rest of the upstream object. Entries without a matching key are appended to the result.
- Simple arrays (non-object entries) are replaced entirely by the override array.
- If an override file exists and the base file does not, it’s treated as a new entry (e.g., adding a brand-new item or hideout level).

## Best practices

1. Keep overrides lean—only include the fields you intend to change.
2. When editing arrays (like stages or requirement lists), include the `itemId`, `stageKey`, or `level` so the loader can apply a partial merge instead of recreating the entire array.
3. Add images to `data/arc-overrides/images/items/` before referencing them from your JSON patches so the loader can resolve them by filename.

The override system is opt-in: if `data/arc-overrides` does not exist or does not contain a matching file, the loader simply falls back to the vanilla data.
