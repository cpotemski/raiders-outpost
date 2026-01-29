import { Panel } from "../components/ui/Panel";

export default function StartPage() {
  return (
    <Panel>
      <div className="arc-panel-header">
        <div>
          <p className="hud-label">System</p>
          <h2 className="text-lg font-semibold uppercase tracking-[0.08em]">
            Start
          </h2>
        </div>
        <span className="hud-label">Idle</span>
      </div>
      <div className="px-4 py-6 text-sm text-muted">SCANNING CACHE...</div>
    </Panel>
  );
}
