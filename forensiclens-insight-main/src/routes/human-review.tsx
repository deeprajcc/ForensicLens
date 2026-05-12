import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  PageContainer, PageHeader, Card, Btn, Badge, AIDraftLabel, WarningBanner,
} from "@/components/forensic/ui";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/human-review")({ component: HumanReview });

const API = import.meta.env.VITE_API_URL;

interface MatrixRow {
  id: string;
  issue: string;
  category: string;
  party: string;
  assessment_rationale: string;
  caution: string;
  investigator_assessment: string;
  review_status: string;
  ai_draft_accepted: boolean;
  revised_finding?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_action?: string;
  investigator_comments?: string;
  supporting_evidence?: string[];
  evidence_reviewed?: string[];
}

const STATUS_TONE: Record<string, "success" | "warning" | "high" | "info" | "neutral"> = {
  "Accepted": "success",
  "Edited and Approved": "success",
  "Final — Ready for Report": "success",
  "Rejected": "high",
  "Manager Review": "warning",
  "Evidence Requested": "warning",
  "Pending Review": "neutral",
};

const CAUTION_KEYWORDS = ["collud", "kickback", "fraud", "collu", "proven", "confirmed"];
function hasCaution(text: string) {
  return CAUTION_KEYWORDS.some((k) => text.toLowerCase().includes(k));
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function HumanReview() {
  const [items, setItems] = useState<MatrixRow[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [revisedText, setRevisedText] = useState("");
  const [comments, setComments] = useState("");

  // Load all items
  useEffect(() => {
    fetch(`${API}/human-review/`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load review items. Run evidence scan first.");
        return r.json();
      })
      .then((data) => {
        setItems(data.items);
        const firstPending = data.items.findIndex(
          (i: MatrixRow) => !i.review_status || i.review_status === "Pending Review"
        );
        setCurrentIdx(firstPending >= 0 ? firstPending : 0);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Sync revised text when switching rows
  useEffect(() => {
    if (!items[currentIdx]) return;
    const row = items[currentIdx];
    setRevisedText(row.revised_finding || row.assessment_rationale || "");
    setComments(row.investigator_comments || "");
    setActionError(null);
  }, [currentIdx, items]);

  async function submitAction(action: string) {
    const row = items[currentIdx];
    setActionError(null);
    setSaving(true);
    try {
      const body: Record<string, string> = { action };
      if (action === "edit_approve") body.revised_finding = revisedText;
      if (action === "reject") body.reject_reason = comments;
      if (comments) body.comments = comments;

      const res = await fetch(`${API}/human-review/${row.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "Action failed");
      }
      const data = await res.json();
      // Update local state
      setItems((prev) => prev.map((item) => item.id === row.id ? data.item : item));
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center gap-2 text-muted-foreground py-20 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading review items…</span>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <PageHeader title="Human Review & Challenge" subtitle="Investigator override panel for AI-proposed findings" />
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      </PageContainer>
    );
  }

  const row = items[currentIdx];
  const showCaution = hasCaution(row.assessment_rationale || "");
  const isReviewed = row.review_status && row.review_status !== "Pending Review";
  const reviewedTone = STATUS_TONE[row.review_status] ?? "neutral";
  const pending = items.filter((i) => !i.review_status || i.review_status === "Pending Review").length;

  const logEntries: [string, string][] = [
    ["Allegation Point", row.id],
    ["Proposed by",      "AI (Gemini)"],
    ["Reviewed by",      row.reviewed_by || "—"],
    ["Action",           row.review_action || "Pending"],
    ["Status",           row.review_status || "Pending Review"],
    ["Reviewed at",      formatDate(row.reviewed_at)],
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Human Review & Challenge"
        subtitle="Investigator override panel for AI-proposed findings"
        actions={
          <Badge tone={pending > 0 ? "warning" : "success"}>
            {pending > 0 ? `${pending} pending` : "All reviewed"}
          </Badge>
        }
      />

      {/* AP Navigator */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        {items.map((item, i) => {
          const t = STATUS_TONE[item.review_status] ?? "neutral";
          return (
            <button
              key={item.id}
              onClick={() => setCurrentIdx(i)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
                i === currentIdx
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border bg-muted text-muted-foreground hover:border-accent/50"
              }`}
            >
              {item.id}
              {item.review_status && item.review_status !== "Pending Review" && (
                <span className="ml-1.5 text-[10px] opacity-70">✓</span>
              )}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))}
            disabled={currentIdx === 0}
            className="rounded border border-border p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-muted-foreground px-1">{currentIdx + 1} / {items.length}</span>
          <button
            onClick={() => setCurrentIdx((p) => Math.min(items.length - 1, p + 1))}
            disabled={currentIdx === items.length - 1}
            className="rounded border border-border p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* AI Proposed Finding */}
        <Card
          title={`${row.id} — ${row.issue}`}
          actions={<AIDraftLabel />}
        >
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge tone="neutral">{row.category}</Badge>
            <Badge tone="neutral">{row.party}</Badge>
          </div>

          <div className="rounded-md border border-border bg-muted/40 p-4 text-sm leading-relaxed mb-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
              AI Assessment Rationale
            </p>
            {row.assessment_rationale || "No AI assessment available."}
          </div>

          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm mb-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
              Proposed Status
            </p>
            <Badge tone="info">{row.investigator_assessment}</Badge>
          </div>

          {row.caution && (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <span className="font-medium">Caution: </span>{row.caution}
            </div>
          )}

          {showCaution && !row.caution && (
            <WarningBanner>
              This AI assessment may overstate the evidence. Current material indicates suspicion
              and contextual indicators only — direct evidence of kickback or collusion has not been confirmed.
            </WarningBanner>
          )}
        </Card>

        {/* Investigator Revised Finding */}
        <Card
          title="Investigator Revised Finding"
          actions={
            isReviewed
              ? <Badge tone={reviewedTone}>{row.review_status}</Badge>
              : <Badge tone="neutral">Pending Review</Badge>
          }
        >
          <div className="mb-3">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Revised Finding
            </label>
            <textarea
              rows={6}
              value={revisedText}
              onChange={(e) => setRevisedText(e.target.value)}
              placeholder="Enter your revised finding here, or accept the AI draft as-is…"
              className="mt-1 w-full rounded-md border border-input bg-background p-3 text-sm leading-relaxed"
            />
          </div>

          <div className="mb-4">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Comments / Reason
            </label>
            <textarea
              rows={2}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Optional — reason for edit, rejection, or escalation…"
              className="mt-1 w-full rounded-md border border-input bg-background p-3 text-sm"
            />
          </div>

          {actionError && (
            <div className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
              {actionError}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Btn variant="primary" onClick={() => submitAction("accept")} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Accept AI Draft
            </Btn>
            <Btn variant="accent" onClick={() => submitAction("edit_approve")} disabled={saving}>
              Edit and Approve
            </Btn>
            <Btn variant="danger" onClick={() => submitAction("reject")} disabled={saving}>
              Reject AI Draft
            </Btn>
            <Btn onClick={() => submitAction("request_evidence")} disabled={saving}>
              Request More Evidence
            </Btn>
            <Btn onClick={() => submitAction("escalate")} disabled={saving}>
              Escalate to Review
            </Btn>
            <Btn variant="primary" onClick={() => submitAction("mark_final")} disabled={saving}>
              Mark as Final for Report
            </Btn>
          </div>
        </Card>

        {/* Review Log */}
        <Card title="Review Log" className="lg:col-span-2">
          <dl className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
            {logEntries.map(([k, v]) => (
              <div key={k} className="rounded-md border border-border p-3">
                <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</dt>
                <dd className="mt-1 font-medium text-sm break-words">{v}</dd>
              </div>
            ))}
          </dl>

          {items.some((i) => i.review_status && i.review_status !== "Pending Review") && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">All AP Review Statuses</p>
              <div className="flex flex-wrap gap-2">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-1.5 text-xs">
                    <span className="font-medium">{item.id}</span>
                    <Badge tone={STATUS_TONE[item.review_status] ?? "neutral"}>
                      {item.review_status || "Pending"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}
