import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  PageContainer, PageHeader, Card, Btn, Badge, DraftReportLabel,
} from "@/components/forensic/ui";
import { FileText, Loader2, Download, Eye, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/report-builder")({ component: ReportBuilder });

const API = import.meta.env.VITE_API_URL;

const TEMPLATES = [
  "Preliminary Allegation Assessment Memo",
  "Evidence Review Summary",
  "Investigation Planning Memo",
  "Issue Matrix Export",
  "Partner Briefing Note",
  "Draft Investigation Report",
];

const SECTION_KEYS = [
  ["1_executive_summary",      "Executive Summary"],
  ["2_background",             "Background"],
  ["3_allegation_received",    "Allegation Received"],
  ["4_scope_and_limitations",  "Scope and Limitations"],
  ["5_allegation_points",      "Allegation Points"],
  ["6_evidence_reviewed",      "Evidence Reviewed"],
  ["7_evidence_assessment",    "Evidence Assessment"],
  ["8_preliminary_observations","Preliminary Observations"],
  ["9_unresolved_matters",     "Unresolved Matters"],
  ["10_recommended_next_steps","Recommended Next Steps"],
] as const;

const APPENDIX_KEYS = [
  ["A_evidence_register", "Appendix A: Evidence Register"],
  ["B_audit_trail",       "Appendix B: Audit Trail"],
] as const;

interface Controls {
  include_human_approved_only: boolean;
  include_unresolved: boolean;
  include_evidence_gaps: boolean;
  include_source_references: boolean;
  include_audit_trail: boolean;
}

interface ReportMeta {
  report_title: string;
  template: string;
  case_id: string;
  case_name: string;
  client: string;
  investigator: string;
  generated_at: string;
  version: string;
  status: string;
}

interface Report {
  meta: ReportMeta;
  sections: Record<string, any>;
  appendices: Record<string, any[]>;
  disclaimer: string;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" });
}

function renderSectionValue(value: any): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        item && typeof item === "object"
          ? "• " + Object.entries(item)
              .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
              .join(" · ")
          : "• " + String(item)
      )
      .join("\n");
  }
  if (typeof value === "object" && value !== null) {
    return Object.entries(value)
      .map(([k, v]) => `${k.replace(/_/g, " ").toUpperCase()}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join("\n");
  }
  return String(value ?? "");
}

// Render data as proper HTML for Word compatibility
function renderValueAsHTML(value: any, isRegister = false): string {
  if (typeof value === "string") {
    return value.split("\n").map(line => line.trim() ? `<p>${line}</p>` : "").join("");
  }

  if (Array.isArray(value)) {
    if (isRegister) {
      let table = `<table border="1" style="border-collapse:collapse;width:100%;font-size:9pt;">`;
      table += `<tr style="background-color:#f8fafc;"><th>ID</th><th>File</th><th>Type</th><th>Relevance</th><th>Status</th></tr>`;
      value.forEach(ev => {
        table += `<tr>
          <td>${ev.evidence_id || ""}</td>
          <td>${ev.file_name || ""}</td>
          <td>${ev.evidence_type || ""}</td>
          <td>${ev.relevance || ""}</td>
          <td>${ev.status || ""}</td>
        </tr>`;
      });
      table += `</table>`;
      return table;
    }

    let html = "<ul>";
    value.forEach((item) => {
      if (item && typeof item === "object") {
        const details = Object.entries(item).map(([k, v]) => `<b>${k.replace(/_/g, " ")}:</b> ${v}`).join(" · ");
        html += `<li>${details}</li>`;
      } else {
        html += `<li>${String(item)}</li>`;
      }
    });
    return html + "</ul>";
  }

  if (typeof value === "object" && value !== null) {
    let html = "<ul>";
    Object.entries(value).forEach(([k, v]) => {
      html += `<li><b>${k.replace(/_/g, " ").toUpperCase()}:</b> ${Array.isArray(v) ? v.join(", ") : v}</li>`;
    });
    return html + "</ul>";
  }
  return `<p>${String(value ?? "")}</p>`;
}

// Download as JSON
function downloadJSON(report: Report) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${report.meta.case_id}_report_${report.meta.version.replace(/\s/g, "_")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Download as plain text / pseudo-Word
function downloadTXT(report: Report) {
  const lines: string[] = [];
  lines.push("=".repeat(70));
  lines.push(report.meta.report_title.toUpperCase());
  lines.push("=".repeat(70));
  lines.push(`Case ID:       ${report.meta.case_id}`);
  lines.push(`Client:        ${report.meta.client}`);
  lines.push(`Investigator:  ${report.meta.investigator}`);
  lines.push(`Generated:     ${formatDate(report.meta.generated_at)}`);
  lines.push(`Version:       ${report.meta.version}`);
  lines.push(`Status:        ${report.meta.status}`);
  lines.push("");

  SECTION_KEYS.forEach(([key, label]) => {
    const val = report.sections[key];
    if (!val) return;
    lines.push("-".repeat(70));
    lines.push(label.toUpperCase());
    lines.push("-".repeat(70));
    lines.push(renderSectionValue(val));
    lines.push("");
  });

  APPENDIX_KEYS.forEach(([key, label]) => {
    const val = report.appendices[key];
    if (!val || val.length === 0) return;
    lines.push("-".repeat(70));
    lines.push(label.toUpperCase());
    lines.push("-".repeat(70));
    lines.push(renderSectionValue(val));
    lines.push("");
  });

  lines.push("=".repeat(70));
  lines.push("DISCLAIMER");
  lines.push("=".repeat(70));
  lines.push(report.disclaimer);

  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${report.meta.case_id}_report.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// Helper to generate the structured HTML used for both Word and PDF
function generateReportHTML(report: Report) {
  const header = `
    <html lang="en" xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>${report.meta.report_title}</title>
    <style>
      body { font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.5; padding: 40px; }
      h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; margin-bottom: 10px; font-size: 22pt; }
      h2 { color: #1e293b; margin-top: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; font-size: 16pt; text-transform: uppercase; }
      .meta { color: #64748b; font-size: 10pt; margin-bottom: 30px; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px; }
      .section-content { white-space: pre-wrap; margin-bottom: 20px; font-size: 11pt; color: #334155; }
      p { margin-bottom: 10px; }
      ul { margin-bottom: 20px; }
      li { margin-bottom: 5px; }
      .disclaimer { font-size: 9pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 50px; font-style: italic; }
      th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; font-size: 10pt; }
      th { bg-color: #f8fafc; font-weight: bold; }
    </style>
    </head>
    <body>
  `;
  const footer = "</body></html>";
  
  let content = `<h1>${report.meta.report_title}</h1>`;
  content += `<div class="meta">`;
  content += `<p><b>Case ID:</b> ${report.meta.case_id} | <b>Client:</b> ${report.meta.client}</p>`;
  content += `<p><b>Investigator:</b> ${report.meta.investigator} | <b>Generated:</b> ${formatDate(report.meta.generated_at)}</p>`;
  content += `<p><b>Status:</b> ${report.meta.status} | <b>Version:</b> ${report.meta.version}</p>`;
  content += `</div>`;
  
  SECTION_KEYS.forEach(([key, label]) => {
    const val = report.sections[key];
    if (val) {
      content += `<h2>${label}</h2>`;
      content += `<div class="section-content">${renderValueAsHTML(val)}</div>`;
    }
  });

  APPENDIX_KEYS.forEach(([key, label]) => {
    const val = report.appendices[key];
    if (val && val.length > 0) {
      content += `<h2>${label}</h2>`;
      content += `<div class="section-content">${renderValueAsHTML(val, key === "A_evidence_register")}</div>`;
    }
  });

  content += `<div class="disclaimer"><b>DISCLAIMER:</b> ${report.disclaimer}</div>`;

  return header + content + footer;
}

// Download as PDF by printing a clean version of the report
function downloadPDF(report: Report) {
  const html = generateReportHTML(report);
  const printWindow = window.open("", "_blank", "width=800,height=900");
  
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();

    // Ensure the new window is focused
    printWindow.focus();

    // A small delay ensures the content and styles are parsed 
    // before the print dialog blocks the UI thread.
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }
}

// Download as Word (using HTML compatibility)
function downloadDOCX(report: Report) {
  const html = generateReportHTML(report);
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${report.meta.case_id}_report.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── component ─────────────────────────────────────────────────────────────────

export default function ReportBuilder() {
  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [controls, setControls] = useState<Controls>({
    include_human_approved_only: true,
    include_unresolved: true,
    include_evidence_gaps: true,
    include_source_references: true,
    include_audit_trail: true,
  });
  const [report, setReport] = useState<Report | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  function toggleControl(key: keyof Controls) {
    setControls((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`${API}/report/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template, ...controls }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "Failed to generate report");
      }
      const data = await res.json();
      setReport(data.report);
      setActiveSection("1_executive_summary");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleLoadExisting() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/report/`);
      if (!res.ok) throw new Error("No existing report found. Click Generate Draft first.");
      const data = await res.json();
      setReport(data.report);
      setActiveSection("1_executive_summary");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const controlLabels: [keyof Controls, string][] = [
    ["include_human_approved_only", "Include only human-approved findings"],
    ["include_unresolved",          "Include unresolved points"],
    ["include_evidence_gaps",       "Include evidence gaps"],
    ["include_source_references",   "Include source references"],
    ["include_audit_trail",         "Include audit trail"],
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Report Builder"
        subtitle="Generate a structured forensic memo for investigator review"
        actions={<DraftReportLabel />}
      />

      <div className="grid lg:grid-cols-[280px_1fr] gap-5">
        {/* ── Left panel ── */}
        <div className="space-y-5">
          <Card title="Template">
            <div className="space-y-1.5">
              {TEMPLATES.map((t, i) => (
                <label
                  key={t}
                  className={`flex items-start gap-2 rounded-md border p-2.5 text-sm cursor-pointer transition-colors ${
                    template === t
                      ? "border-accent bg-accent/10"
                      : "border-border hover:border-accent/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="tpl"
                    checked={template === t}
                    onChange={() => setTemplate(t)}
                    className="mt-1 accent-[oklch(0.55_0.18_280)]"
                  />
                  <span>
                    {t}
                    {i === 0 && (
                      <span className="ml-1.5"><Badge tone="success">Recommended</Badge></span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </Card>

          <Card title="Controls">
            <div className="space-y-2 text-sm">
              {controlLabels.map(([key, label]) => (
                <label key={key} className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={controls[key]}
                    onChange={() => toggleControl(key)}
                    className="mt-1 accent-[oklch(0.55_0.18_280)]"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </Card>

          <Card title="Actions">
            <div className="space-y-2">
              <Btn variant="primary" onClick={handleGenerate} disabled={generating || loading} className="w-full justify-center">
                {generating
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</>
                  : <><RefreshCw className="h-3.5 w-3.5" /> Generate Draft</>}
              </Btn>
              <Btn onClick={handleLoadExisting} disabled={generating || loading} className="w-full justify-center">
                {loading
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</>
                  : <><Eye className="h-3.5 w-3.5" /> Load Existing</>}
              </Btn>
              {report && (
                <>
                  <div className="border-t border-border pt-2 mt-1">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Download</p>
                    <div className="space-y-1.5">
                      <Btn
                        variant="primary"
                        onClick={() => downloadDOCX(report)}
                        className="w-full justify-center"
                      >
                        <Download className="h-3.5 w-3.5" /> Download as Word (.doc)
                      </Btn>
                      <Btn
                        variant="accent"
                        onClick={() => downloadPDF(report)}
                        className="w-full justify-center"
                      >
                        <Download className="h-3.5 w-3.5" /> Export as PDF
                      </Btn>
                     
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* ── Right panel ── */}
        <div className="space-y-5">
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Report structure / nav */}
          <Card
            title="Report Structure"
            actions={
              report
                ? <Badge tone="success"><CheckCircle2 className="h-3 w-3" /> Generated</Badge>
                : <Badge tone="info">{template}</Badge>
            }
          >
            <ol className="grid sm:grid-cols-2 gap-2 text-sm">
              {SECTION_KEYS.map(([key, label]) => (
                <li key={key}>
                  <button
                    onClick={() => report && setActiveSection(key)}
                    disabled={!report}
                    className={`w-full text-left rounded-md border px-3 py-2.5 transition-colors ${
                      report
                        ? activeSection === key
                          ? "border-accent bg-accent/10 text-foreground font-medium"
                          : "border-border hover:border-accent/40 cursor-pointer"
                        : "border-border bg-muted text-muted-foreground cursor-default opacity-60"
                    }`}
                  >
                    {label}
                  </button>
                </li>
              ))}
              {APPENDIX_KEYS.map(([key, label]) => (
                <li key={key}>
                  <button
                    onClick={() => report && setActiveSection(key)}
                    disabled={!report}
                    className={`w-full text-left rounded-md border px-3 py-2.5 transition-colors ${
                      report
                        ? activeSection === key
                          ? "border-accent bg-accent/10 text-foreground font-medium"
                          : "border-border hover:border-accent/40 cursor-pointer"
                        : "border-border bg-muted text-muted-foreground cursor-default opacity-60"
                    }`}
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ol>
          </Card>

          {/* Preview */}
          <Card
            title="Preview"
            actions={
              report && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{report.meta.version}</span>
                  <span>·</span>
                  <span>{formatDate(report.meta.generated_at)}</span>
                </div>
              )
            }
          >
            {!report && !generating ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Select a template and click <strong>Generate Draft</strong> to build the report.
                </p>
              </div>
            ) : generating ? (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Building report from case data…</span>
              </div>
            ) : report ? (
              <div className="space-y-4">
                {/* Header block */}
                <div className="rounded-lg border border-border bg-muted/30 p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <FileText className="h-6 w-6 text-accent shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold">{report.meta.report_title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {report.meta.version} · {report.meta.investigator} · {formatDate(report.meta.generated_at)}
                      </div>
                    </div>
                    <div className="ml-auto shrink-0"><Badge tone="warning">Draft</Badge></div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    {[
                      ["Case ID", report.meta.case_id],
                      ["Client", report.meta.client],
                      ["Template", report.meta.template],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <div className="text-muted-foreground uppercase tracking-wider text-[10px]">{k}</div>
                        <div className="font-medium mt-0.5">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active section content */}
                {activeSection && (
                  <div className="rounded-lg border border-accent/30 bg-accent/5 p-5">
                    <div className="text-[11px] uppercase tracking-wider text-accent mb-3 font-medium">
                      {[...SECTION_KEYS, ...APPENDIX_KEYS].find(([k]) => k === activeSection)?.[1] ?? activeSection}
                    </div>

                    {/* Sections */}
                    {Object.prototype.hasOwnProperty.call(report.sections, activeSection) && (
                      <SectionRenderer value={report.sections[activeSection as keyof typeof report.sections]} />
                    )}

                    {/* Appendices */}
                    {Object.prototype.hasOwnProperty.call(report.appendices, activeSection) && (
                      <AppendixRenderer
                        value={report.appendices[activeSection as keyof typeof report.appendices]}
                        sectionKey={activeSection}
                      />
                    )}
                  </div>
                )}

                {/* Disclaimer */}
                <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs text-yellow-800 leading-relaxed">
                  <span className="font-semibold">Disclaimer: </span>
                  {report.disclaimer}
                </div>
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

// ── Sub-renderers ─────────────────────────────────────────────────────────────

function SectionRenderer({ value }: { value: any }) {
  if (typeof value === "string") {
    return <p className="text-sm leading-relaxed whitespace-pre-line">{value}</p>;
  }

  if (Array.isArray(value)) {
    return (
      <div className="space-y-2">
        {value.map((item, i) =>
          typeof item === "string" ? (
            <div key={i} className="flex gap-2 text-sm">
              <span className="text-accent font-medium shrink-0">{i + 1}.</span>
              <span>{item}</span>
            </div>
          ) : typeof item === "object" ? (
            <div key={i} className="rounded-md border border-border bg-background p-3 text-sm space-y-1">
              {Object.entries(item).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-muted-foreground text-xs uppercase tracking-wide w-28 shrink-0">{k.replace(/_/g, " ")}</span>
                  <span className="text-foreground text-xs">{String(v)}</span>
                </div>
              ))}
            </div>
          ) : null
        )}
      </div>
    );
  }

  if (typeof value === "object" && value !== null) {
    return (
      <div className="space-y-2">
        {Object.entries(value).map(([k, v]) => (
          <div key={k} className="flex gap-3 text-sm border-b border-border/40 pb-2 last:border-0">
            <span className="text-muted-foreground text-xs uppercase tracking-wide w-36 shrink-0 pt-0.5">
              {k.replace(/_/g, " ")}
            </span>
            <span className="text-foreground">
              {Array.isArray(v) ? v.join(", ") || "—" : String(v ?? "—")}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return <p className="text-sm text-muted-foreground">No content for this section.</p>;
}

function AppendixRenderer({ value, sectionKey }: { value: any[]; sectionKey: string }) {
  if (!value || value.length === 0) {
    return <p className="text-sm text-muted-foreground">No data available.</p>;
  }

  if (sectionKey === "A_evidence_register") {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-border">
              {["ID", "File", "Type", "Relevance", "Linked APs", "Status"].map((h) => (
                <th key={h} className="text-left text-muted-foreground uppercase tracking-wide py-2 pr-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {value.slice(0, 20).map((ev: any, i) => (
              <tr key={i} className="border-b border-border/40">
                <td className="py-1.5 pr-3 font-medium">{ev.evidence_id}</td>
                <td className="py-1.5 pr-3 text-muted-foreground max-w-[160px] truncate">{ev.file_name}</td>
                <td className="py-1.5 pr-3">{ev.evidence_type}</td>
                <td className="py-1.5 pr-3">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    ev.relevance === "High" ? "bg-red-100 text-red-700"
                    : ev.relevance === "Medium" ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-600"
                  }`}>{ev.relevance}</span>
                </td>
                <td className="py-1.5 pr-3">{(ev.linked_aps || []).join(", ") || "—"}</td>
                <td className="py-1.5">{ev.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {value.length > 20 && (
          <p className="text-xs text-muted-foreground mt-2">Showing 20 of {value.length} files. Download the report for full register.</p>
        )}
      </div>
    );
  }

  if (sectionKey === "B_audit_trail") {
    return (
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {value.map((entry: any, i) => (
          <div key={i} className="flex gap-3 text-xs border-b border-border/30 pb-1.5">
            <span className="text-muted-foreground shrink-0 w-36">
              {new Date(entry.timestamp).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
            </span>
            <span className="font-medium shrink-0 w-20">{entry.user}</span>
            <span>{entry.action}</span>
            {entry.details && <span className="text-muted-foreground">— {entry.details}</span>}
          </div>
        ))}
      </div>
    );
  }

  return <SectionRenderer value={value} />;
}
