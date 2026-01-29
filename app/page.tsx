import { Panel } from "../components/ui/Panel";
import { BlueprintGrid } from "../components/blueprints/BlueprintGrid";
import { loadArcItems } from "../lib/arc-items";

export default async function StartPage() {
  const payload = await loadArcItems();
  const blueprints = payload.items.filter(
    (item) => item.itemType === "Blueprint"
  );

  return (
    <Panel className="overflow-hidden">
      <BlueprintGrid items={blueprints} />
    </Panel>
  );
}
