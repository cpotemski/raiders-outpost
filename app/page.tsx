import { Panel } from "../components/ui/Panel";
import { Chip } from "../components/ui/Chip";

const myNeeds = [
  "Pulse Cell",
  "Fiber Weave",
  "Signal Relay",
  "Arc Glue",
  "Field Rations",
];

const myHave = ["Carbon Slats", "Servo Coupler", "Med Patch", "Copper Coil"];

const squad = [
  {
    name: "Jule",
    needs: ["Carbon Slats", "Arc Glue"],
    have: ["Pulse Cell", "Coolant Core"],
  },
  {
    name: "Tim",
    needs: ["Signal Relay", "Med Patch"],
    have: ["Fiber Weave"],
  },
  {
    name: "Chris",
    needs: ["Copper Coil"],
    have: ["Field Rations", "Servo Coupler"],
  },
];

const squadMatches = () => {
  const matches: string[] = [];

  squad.forEach((member) => {
    member.needs.forEach((item) => {
      if (myHave.includes(item)) {
        matches.push(`${member.name} needs ${item} — you have it`);
      }
    });
    member.have.forEach((item) => {
      if (myNeeds.includes(item)) {
        matches.push(`${member.name} has ${item} — you need it`);
      }
    });
  });

  if (matches.length < 5) {
    for (let i = 0; i < squad.length; i += 1) {
      for (let j = 0; j < squad.length; j += 1) {
        if (i === j) continue;
        const seeker = squad[i];
        const helper = squad[j];
        const found = seeker.needs.find((item) => helper.have.includes(item));
        if (found) {
          matches.push(`${seeker.name} needs ${found} — ${helper.name} has it`);
          if (matches.length >= 5) break;
        }
      }
      if (matches.length >= 5) break;
    }
  }

  return matches.slice(0, 5);
};

export default function OverviewPage() {
  const matches = squadMatches();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel>
        <div className="arc-panel-header">
          <div>
            <p className="hud-label">Personal</p>
            <h2 className="text-lg font-semibold uppercase tracking-[0.08em]">
              My Needs
            </h2>
          </div>
          <Chip variant="accent">Need</Chip>
        </div>
        <div className="space-y-3 px-4 py-5">
          {myNeeds.map((item) => (
            <div
              key={item}
              className="flex items-center justify-between border-b border-frame2 pb-2 text-sm"
            >
              <span>{item}</span>
              <Chip variant="warn">Need</Chip>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <div className="arc-panel-header">
          <div>
            <p className="hud-label">Community</p>
            <h2 className="text-lg font-semibold uppercase tracking-[0.08em]">
              Squad Matches
            </h2>
          </div>
          <Chip variant="good">Live</Chip>
        </div>
        <div className="space-y-3 px-4 py-5 text-sm">
          {matches.map((line) => (
            <div key={line} className="border-b border-frame2 pb-2">
              {line}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
