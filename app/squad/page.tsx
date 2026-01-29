import { Panel } from "../../components/ui/Panel";
import { Chip } from "../../components/ui/Chip";

const myNeeds = ["Pulse Cell", "Fiber Weave", "Signal Relay", "Arc Glue"];

const squad = [
  {
    name: "Jule",
    role: "Scout",
    needs: ["Carbon Slats", "Arc Glue"],
    have: ["Pulse Cell", "Coolant Core"],
  },
  {
    name: "Tim",
    role: "Builder",
    needs: ["Signal Relay", "Med Patch"],
    have: ["Fiber Weave", "Tracking Chip"],
  },
  {
    name: "Chris",
    role: "Support",
    needs: ["Copper Coil"],
    have: ["Field Rations", "Servo Coupler"],
  },
  {
    name: "Lena",
    role: "Engineer",
    needs: ["Flux Lens"],
    have: ["Arc Glue", "Armor Plate"],
  },
];

const helpLines = () => {
  const lines: string[] = [];
  squad.forEach((member) => {
    const match = member.have.find((item) => myNeeds.includes(item));
    if (match) {
      lines.push(`${member.name} has ${match} I need`);
    }
  });
  return lines.slice(0, 5);
};

export default function SquadPage() {
  const help = helpLines();

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Panel>
        <div className="arc-panel-header">
          <div>
            <p className="hud-label">Community</p>
            <h2 className="text-lg font-semibold uppercase tracking-[0.08em]">
              Squad Members
            </h2>
          </div>
          <Chip variant="accent">Online 4</Chip>
        </div>
        <div className="space-y-4 px-4 py-5">
          {squad.map((member) => (
            <div
              key={member.name}
              className="rounded-[10px] border border-frame2 bg-panel2/60 p-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.08em]">
                    {member.name}
                  </div>
                  <div className="hud-label">{member.role}</div>
                </div>
                <Chip variant="neutral">Active</Chip>
              </div>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <div className="hud-label">Needs</div>
                  <ul className="mt-2 space-y-1">
                    {member.needs.map((item) => (
                      <li key={item} className="border-b border-frame2 pb-1">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="hud-label">Have</div>
                  <ul className="mt-2 space-y-1">
                    {member.have.map((item) => (
                      <li key={item} className="border-b border-frame2 pb-1">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <div className="arc-panel-header">
          <div>
            <p className="hud-label">Assist</p>
            <h2 className="text-lg font-semibold uppercase tracking-[0.08em]">
              Who Can Help Me
            </h2>
          </div>
          <Chip variant="good">Ready</Chip>
        </div>
        <div className="space-y-3 px-4 py-5 text-sm">
          {help.map((line) => (
            <div key={line} className="border-b border-frame2 pb-2">
              {line}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
