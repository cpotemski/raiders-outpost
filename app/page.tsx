import { Panel } from "@/components/ui/Panel";
import { ProjectDashboard } from "@/components/projects/ProjectDashboard";

export default function StartPage() {
  return (
    <Panel className="overflow-hidden">
      <ProjectDashboard />
    </Panel>
  );
}
