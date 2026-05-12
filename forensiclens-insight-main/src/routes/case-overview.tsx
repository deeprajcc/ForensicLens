import { createFileRoute, Link } from "@tanstack/react-router";
import { PageContainer, PageHeader, Card, Badge, Btn } from "@/components/forensic/ui";
import { CheckCircle2, Circle, FileUp, MessageSquare, FolderOpen, Grid3x3, FileText, Loader2 } from "lucide-react";
const API = import.meta.env.VITE_API_URL ;
// Mocking a fetch function - replace with your actual API client call
async function fetchCaseData() {
  const res = await fetch(`${API}/case`); // Adjust URL to your FastAPI endpoint
  return res.json();
}

export const Route = createFileRoute("/case-overview")({
  loader: async () => await fetchCaseData(),
  component: CaseOverview,
});

function CaseOverview() {
  const data = Route.useLoaderData();
  const { case: caseData, status_flags: flags } = data;

  if (!caseData) {
    return (
      <PageContainer>
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">No active case found.</p>
        </div>
      </PageContainer>
    );
  }

  const meta: [string, string][] = [
    ["Case ID", caseData.case_id],
    ["Client", caseData.client],
    ["Status", caseData.status],
    ["Risk Level", caseData.risk_level],
    ["Investigator", caseData.investigator],
    ["Reviewer", caseData.reviewer],
    ["Allegation Date", caseData.allegation_date],
    ["Confidentiality", caseData.confidentiality_level],
  ];

  const workflow = [
    { label: "Allegation Intake", done: flags.allegation_uploaded },
    { label: "Allegation Analysis", done: flags.allegation_summary_generated },
    { label: "Investigation Plan", done: flags.allegation_points_generated },
    { label: "Evidence Upload", done: flags.evidence_uploaded },
    { label: "Evidence Scan", done: flags.evidence_scan_generated, current: flags.evidence_uploaded && !flags.evidence_scan_generated },
    { label: "Issue Matrix", done: flags.issue_matrix_reviewed },
    { label: "Human Review", done: flags.human_review_completed },
    { label: "Draft Report", done: flags.conclusion_generated },
  ];

  const statusItems = [
    ["Allegation Document", flags.allegation_uploaded ? "Uploaded" : "Pending", flags.allegation_uploaded ? "success" : "neutral"],
    ["Evidence Corpus", flags.evidence_uploaded ? "Uploaded" : "Pending", flags.evidence_uploaded ? "success" : "neutral"],
    ["Allegation Points", flags.allegation_points_generated ? "Generated" : "Pending", flags.allegation_points_generated ? "info" : "neutral"],
    ["Issue Matrix", flags.issue_matrix_reviewed ? "Reviewed" : "Pending Review", flags.issue_matrix_reviewed ? "success" : "warning"],
    ["Report", flags.conclusion_generated ? "Generated" : "Not Finalised", flags.conclusion_generated ? "success" : "neutral"],
    ["Audit Trail", "Active", "success"],
  ] as const;

  return (
    <PageContainer>
      <PageHeader
        title={caseData.case_name}
        subtitle={`${caseData.case_id} · ${caseData.client} · ${caseData.status}`}
        actions={<Badge tone={caseData.risk_level === "High" ? "high" : "neutral"}>{caseData.risk_level} Risk</Badge>}
      />
      
      <div className="grid lg:grid-cols-[280px_1fr] gap-5">
        <Card title="Case Metadata">
          <dl className="space-y-2 text-sm">
            {meta.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-border/60 pb-1.5 last:border-0">
                <dt className="text-muted-foreground text-xs">{k}</dt>
                <dd className="text-foreground text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Scope Notes</h4>
            <p className="text-xs leading-relaxed text-muted-foreground italic">"{caseData.scope_notes}"</p>
          </div>
        </Card>

        <div className="space-y-5">
          <Card title="Workflow Tracker">
            <ol className="flex flex-wrap gap-2">
              {workflow.map((s, i) => (
                <li key={s.label} className="flex items-center gap-2">
                  <div
                    className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs ${
                      s.current
                        ? "border-accent bg-accent/10 text-foreground font-medium animate-pulse"
                        : s.done
                        ? "border-success/40 bg-success/10 text-foreground"
                        : "border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.done ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <Circle className="h-3.5 w-3.5" />}
                    {s.label}
                  </div>
                  {i < workflow.length - 1 && <span className="text-muted-foreground">›</span>}
                </li>
              ))}
            </ol>
          </Card>

          <Card title="Status">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {statusItems.map(([k, v, tone]) => (
                <div key={k} className="rounded-md border border-border p-3">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</div>
                  <div className="mt-1.5"><Badge tone={tone}>{v}</Badge></div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Quick Actions">
            <div className="flex flex-wrap gap-2">
              <Link to="/allegation-intake"><Btn variant="primary"><FileUp className="h-3.5 w-3.5"/>Upload Allegation</Btn></Link>
              <Link to="/ask-llm"><Btn><MessageSquare className="h-3.5 w-3.5"/>Ask Investigator LLM</Btn></Link>
              <Link to="/evidence-workspace"><Btn><FolderOpen className="h-3.5 w-3.5"/>Upload Evidence</Btn></Link>
              <Link to="/issue-matrix"><Btn><Grid3x3 className="h-3.5 w-3.5"/>Generate Issue Matrix</Btn></Link>
              <Link to="/report-builder"><Btn variant="accent"><FileText className="h-3.5 w-3.5"/>Generate Report</Btn></Link>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}