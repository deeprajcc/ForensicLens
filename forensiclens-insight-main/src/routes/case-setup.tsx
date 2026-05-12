import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageContainer, PageHeader, Card, Btn, WarningBanner } from "@/components/forensic/ui";
export const Route = createFileRoute("/case-setup")({ component: CaseSetup });

const API = import.meta.env.VITE_API_URL ;

const FIELD_KEYS = [
  "case_name",
  "client",
  "jurisdiction",
  "allegation_source",
  "allegation_date",
  "confidentiality_level",
  "legal_privilege_flag",
  "investigator",
  "reviewer",
] as const;

const FIELD_LABELS: Record<typeof FIELD_KEYS[number], string> = {
  case_name: "Case Title",
  client: "Client / Entity",
  jurisdiction: "Jurisdiction",
  allegation_source: "Allegation Source",
  allegation_date: "Allegation Date",
  confidentiality_level: "Confidentiality Level",
  legal_privilege_flag: "Legal Privilege Flag",
  investigator: "Investigator",
  reviewer: "Reviewer",
};

const DEFAULTS: Record<typeof FIELD_KEYS[number], string> = {
  case_name: "Oddity Vendor Invoice Manipulation Allegation",
  client: "Demo Client",
  jurisdiction: "United Kingdom / Demo",
  allegation_source: "Internal escalation / whistleblower interview",
  allegation_date: "09 June 2025",
  confidentiality_level: "Confidential",
  legal_privilege_flag: "To be assessed",
  investigator: "Ravi Chauhan",
  reviewer: "Review Pending",
};

const checks = [
  "Evidence may contain personal data",
  "Matter may involve legal privilege",
  "AI outputs are drafts and require human review",
  "Investigator remains responsible for final assessment",
];

function CaseSetup() {
  const navigate = useNavigate();
  const [fields, setFields] = useState(DEFAULTS);
  const [scopeNotes, setScopeNotes] = useState(
    "Preliminary review of alleged contractor invoice manipulation involving Oddity and internal approval controls."
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(key: typeof FIELD_KEYS[number], value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreateCase() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/case/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, scope_notes: scopeNotes }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "Failed to create case");
      }
      await res.json();
      navigate({ to: "/case-overview" });
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Create New Investigation Case"
        subtitle="Establish case scope, parties, and governance flags"
      />

      <div className="mb-5">
        <WarningBanner>
          AI-assisted outputs are not final findings. All outputs must be reviewed and approved by an investigator.
        </WarningBanner>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card title="Case Details">
            <div className="grid sm:grid-cols-2 gap-4">
              {FIELD_KEYS.map((key) => (
                <div key={key}>
                  <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {FIELD_LABELS[key]}
                  </label>
                  <input
                    value={fields[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Scope Notes
                </label>
                <textarea
                  rows={3}
                  value={scopeNotes}
                  onChange={(e) => setScopeNotes(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          </Card>

          <Card title="Acknowledgements">
            <div className="space-y-2">
              {checks.map((c) => (
                <label key={c} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="mt-1 accent-[oklch(0.55_0.18_280)]"
                  />
                  <span>{c}</span>
                </label>
              ))}
            </div>
          </Card>

          <div className="flex gap-2">
            <Btn variant="primary" onClick={handleCreateCase} disabled={loading}>
              {loading ? "Creating…" : "Create Case"}
            </Btn>
            <Btn variant="ghost" disabled={loading}>Save Draft</Btn>
            <Link to="/"><Btn variant="ghost" disabled={loading}>Cancel</Btn></Link>
          </div>
        </div>

        <Card title="Workflow Preview">
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>Allegation Intake</li>
            <li>Allegation Analysis</li>
            <li>Investigation Plan</li>
            <li>Evidence Upload</li>
            <li>Evidence Scan</li>
            <li>Issue Matrix</li>
            <li>Human Review</li>
            <li>Draft Report</li>
          </ol>
        </Card>
      </div>
    </PageContainer>
  );
}
