import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageContainer, PageHeader, Card, Badge, Btn, AIDraftLabel, WarningBanner, DataTable, Th, Td, Tr } from "@/components/forensic/ui";

export const Route = createFileRoute("/manager-review-pack")({ component: ManagerReviewPack });

const navSections = [
  "Case Summary",
  "Allegation Points",
  "Evidence Reviewed",
  "Issue Matrix",
  "Human Review Decisions",
  "Pre-Investigation Conclusion",
  "Evidence Gaps",
  "Recommended Next Steps",
  "Audit Trail",
];

const matrixRows: [string, string, string][] = [
  ["AP-001", "Oddity invoices inflated", "Partially Supported"],
  ["AP-002", "Isabelle Chen billed when not on-site", "Unresolved"],
  ["AP-003", "Hours manually increased", "Unresolved"],
  ["AP-004", "Rates changed to senior engineer rates", "Unresolved"],
  ["AP-005", "William approved without checks", "Partially Supported"],
  ["AP-006", "Collusion / kickback", "Unresolved"],
  ["AP-007", "£7k calculation issue", "Unresolved"],
];

const signOff = [
  "Allegation points reviewed",
  "Evidence references checked",
  "AI outputs reviewed",
  "Unsupported conclusions removed",
  "Sensitive wording checked",
  "Evidence gaps disclosed",
  "Report marked as draft",
];

const decisions = [
  { label: "Approved for draft report", variant: "primary" as const },
  { label: "Approved with comments", variant: "accent" as const },
  { label: "Return to investigator", variant: "secondary" as const },
  { label: "Escalate to partner", variant: "secondary" as const },
  { label: "Not approved", variant: "danger" as const },
];

function ManagerReviewPack() {
  const [active, setActive] = useState("Issue Matrix");
  return (
    <PageContainer>
      <PageHeader
        title="Manager Review Pack — FI-2026-001"
        subtitle="Oddity Vendor Invoice Manipulation Allegation · Submitted by Ravi Chauhan"
        actions={<Badge tone="warning">Pending Manager Review</Badge>}
      />
      <div className="grid lg:grid-cols-[220px_1fr_320px] gap-5">
        {/* LEFT: review nav */}
        <aside className="rounded-lg border border-border bg-card p-2 h-fit">
          <div className="px-2 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">Review Navigation</div>
          <nav className="space-y-0.5">
            {navSections.map((s) => (
              <button
                key={s}
                onClick={() => setActive(s)}
                className={`w-full text-left rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                  active === s ? "bg-accent/15 text-foreground border-l-2 border-accent" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {s}
              </button>
            ))}
          </nav>
        </aside>

        {/* MIDDLE: submitted content */}
        <div className="space-y-5 min-w-0">
          <Card title={active} actions={<AIDraftLabel />}>
            {active === "Issue Matrix" ? (
              <div className="space-y-3">
                <DataTable>
                  <thead className="bg-muted/60">
                    <tr>{["ID","Allegation Point","Assessment","Manager Actions"].map((h) => <Th key={h}>{h}</Th>)}</tr>
                  </thead>
                  <tbody>
                    {matrixRows.map((r) => (
                      <Tr key={r[0]}>
                        <Td className="font-mono text-xs">{r[0]}</Td>
                        <Td className="font-medium">{r[1]}</Td>
                        <Td><Badge tone={r[2] === "Partially Supported" ? "warning" : "neutral"}>{r[2]}</Badge></Td>
                        <Td>
                          <div className="flex flex-wrap gap-1">
                            <Btn variant="ghost">Approve</Btn>
                            <Btn variant="ghost">Add Comment</Btn>
                            <Btn variant="ghost">Request More Evidence</Btn>
                            <Btn variant="ghost">Flag Wording Risk</Btn>
                            <Btn variant="ghost">Escalate to Partner</Btn>
                          </div>
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </DataTable>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Submitted content for <span className="font-medium text-foreground">{active}</span> appears here.
              </div>
            )}
          </Card>

          <Card title="AI vs Investigator Edits — AP-006">
            <div className="space-y-3 text-sm">
              <div className="rounded-md border border-border bg-muted/40 p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">AI Proposed Wording</div>
                <p className="leading-relaxed">"There are strong indicators that William Taylor colluded with Oddity to inflate invoices."</p>
              </div>
              <div className="rounded-md border border-success/40 bg-success/10 p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Investigator Revised Wording</div>
                <p className="leading-relaxed">"The evidence reviewed to date indicates potential invoice manipulation and raises questions regarding William Taylor's invoice approval oversight. While collusion or kickback is alleged, direct evidence of personal benefit has not been identified in the reviewed material."</p>
              </div>
              <div className="rounded-md border border-info/30 bg-info/10 p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Manager Comment</div>
                <p className="leading-relaxed">"Agree with the revised wording. Do not refer to collusion as a finding unless direct evidence of benefit or coordination is identified. Keep AP-006 as unresolved."</p>
              </div>
            </div>
          </Card>

          <WarningBanner>
            This pack is a preliminary assessment for manager review. It does not constitute a finding of misconduct.
          </WarningBanner>
        </div>

        {/* RIGHT: comments + decisions + sign-off */}
        <aside className="space-y-5">
          <Card title="Manager Comments">
            <textarea
              rows={5}
              placeholder="Add a comment for the investigator..."
              className="w-full rounded-md border border-input bg-background p-2.5 text-sm"
            />
            <div className="mt-2 flex justify-end">
              <Btn variant="accent">Post Comment</Btn>
            </div>
          </Card>

          <Card title="Manager Decision">
            <div className="space-y-1.5">
              {decisions.map((d) => (
                <Btn key={d.label} variant={d.variant} className="w-full justify-start">
                  {d.label}
                </Btn>
              ))}
            </div>
          </Card>

          <Card title="Manager Sign-Off">
            <div className="space-y-1.5 text-sm">
              {signOff.map((c) => (
                <label key={c} className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1 accent-[oklch(0.55_0.18_280)]" />
                  <span>{c}</span>
                </label>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-border">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Final Decision</div>
              <select className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm">
                <option>Approved for draft report</option>
                <option>Approved with comments</option>
                <option>Return to investigator</option>
                <option>Escalate to partner</option>
                <option>Not approved</option>
              </select>
              <Btn variant="primary" className="w-full justify-center mt-2">Record Manager Sign-Off</Btn>
            </div>
          </Card>
        </aside>
      </div>
    </PageContainer>
  );
}