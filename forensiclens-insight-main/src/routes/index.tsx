import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import {
  PageContainer,
  PageHeader,
  Card,
  Badge,
  Btn,
  DataTable,
  Th,
  Td,
  Tr,
  WarningBanner,
} from "@/components/forensic/ui";
import { Plus, FolderOpen, ScrollText } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

const cases = [
  ["FI-2026-001", "Oddity Vendor Invoice Manipulation Allegation", "Demo Client", "Evidence Review", "High", "Ravi Chauhan", "Manager Review Pending", "Today"],
  ["FI-2026-002", "Employee Expense Abuse Review", "Demo Client", "Intake", "Medium", "Analyst 1", "Not Assigned", "Yesterday"],
  ["FI-2026-003", "Vendor Conflict Review", "Demo Client", "Human Review", "Medium", "Analyst 2", "Director Review", "2 days ago"],
  ["FI-2026-004", "Procurement Override Assessment", "Demo Client", "Draft Report", "High", "Ravi Chauhan", "Partner Review", "3 days ago"],
] as const;

const metrics = [
  { label: "Active Cases", value: 4 },
  { label: "Awaiting Review", value: 2 },
  { label: "Evidence Items Processed", value: 71 },
  { label: "Draft Reports Generated", value: 1 },
  { label: "High-Risk Allegations", value: 1 },
];

function Index() {
  return (
    <PageContainer>
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary to-[oklch(0.32_0.08_280)] text-primary-foreground p-7 mb-6 shadow-sm">
        <div className="text-[11px] uppercase tracking-widest opacity-70">ForensicLens Workspace</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Structure allegations. Map evidence. Support investigator-led conclusions.
        </h1>
        <p className="mt-2 text-sm opacity-80 max-w-3xl">
          A controlled environment for forensic case intake, evidence assessment, and draft reporting. AI outputs are advisory only.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/case-setup"><Btn variant="accent"><Plus className="h-3.5 w-3.5"/>Create New Case</Btn></Link>
          <Link to="/case-overview"><Btn variant="secondary"><FolderOpen className="h-3.5 w-3.5"/>Open Case</Btn></Link>
          <Link to="/audit-trail"><Btn variant="ghost" className="text-primary-foreground hover:bg-white/10 border-white/20"><ScrollText className="h-3.5 w-3.5"/>View Audit Logs</Btn></Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-lg border border-border bg-card p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{m.label}</div>
            <div className="text-2xl font-semibold mt-1">{m.value}</div>
          </div>
        ))}
      </div>

      <PageHeader title="Active Cases" subtitle="Cases assigned to your forensic workspace" />
      <DataTable>
        <thead className="bg-muted/60">
          <tr>
            {["Case ID","Case Name","Client","Status","Risk","Investigator","Reviewer","Last Updated",""].map((h) => <Th key={h}>{h}</Th>)}
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <Tr key={c[0]}>
              <Td className="font-mono text-xs">{c[0]}</Td>
              <Td>{c[1]}</Td>
              <Td>{c[2]}</Td>
              <Td><Badge tone="info">{c[3]}</Badge></Td>
              <Td><Badge tone={c[4] === "High" ? "high" : "medium"}>{c[4]}</Badge></Td>
              <Td>{c[5]}</Td>
              <Td className="text-muted-foreground">{c[6]}</Td>
              <Td className="text-muted-foreground">{c[7]}</Td>
              <Td><Link to="/case-overview"><Btn variant="ghost">Open</Btn></Link></Td>
            </Tr>
          ))}
        </tbody>
      </DataTable>

      <div className="mt-6">
        <WarningBanner>
          AI-assisted outputs are draft only. All conclusions require investigator review and manager approval.
        </WarningBanner>
      </div>
    </PageContainer>
  );
}
