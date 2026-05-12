import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageContainer, PageHeader, Card, Badge, Btn, AIDraftLabel, Tabs, DataTable, Th, Td, Tr, WarningBanner } from "@/components/forensic/ui";
import { Loader2 } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export const Route = createFileRoute("/allegation-assessment")({ component: AllegationAssessment });

const NARRATIVE_KEYS: [string, string][] = [
  ["background", "Background"],
  ["alleged_conduct", "Alleged conduct"],
  ["key_persons", "Key persons"],
  ["financial_exposure", "Financial exposure"],
  ["immediate_concern", "Immediate concern"],
  ["unproven_elements", "Unproven elements"],
  ["investigation_need", "Investigation need"],
];

function AllegationAssessment() {
  const [tab, setTab] = useState("Storyteller");
  const [narrativeData, setNarrativeData] = useState<any>(null);
  const [loadingNarrative, setLoadingNarrative] = useState(false);
  const [pointsData, setPointsData] = useState<any[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [planData, setPlanData] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  useEffect(() => {
    async function fetchNarrative() {
      setLoadingNarrative(true);
      try {
        // Depending on your API routing setup, you might need to adjust this to `${API}/narrative` if it's not prefixed with `/allegation`
        const res = await fetch(`${API}/allegation/narrative`, { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          if (data.status === "success" && data.narrative) {
            setNarrativeData(data.narrative);
          }
        }
      } catch (err) {
        console.error("Failed to fetch narrative", err);
      } finally {
        setLoadingNarrative(false);
      }
    }

    async function fetchPoints() {
      setLoadingPoints(true);
      try {
        const res = await fetch(`${API}/allegation/points`);
        if (res.ok) {
          const data = await res.json();
          setPointsData(data.points || []);
        }
      } catch (err) {
        console.error("Failed to fetch points", err);
      } finally {
        setLoadingPoints(false);
      }
    }

    async function fetchPlan() {
      setLoadingPlan(true);
      try {
        const res = await fetch(`${API}/allegation/investigation-plan`);
        if (res.ok) {
          const data = await res.json();
          setPlanData(data.plan);
        }
      } catch (err) {
        console.error("Failed to fetch investigation plan", err);
      } finally {
        setLoadingPlan(false);
      }
    }

    fetchNarrative();
    fetchPoints();
    fetchPlan();
  }, []);

  return (
    <PageContainer>
      <PageHeader
        title="Allegation Assessment"
        subtitle="Case: Oddity Vendor Invoice Manipulation Allegation · Status: Allegation Analysis"
        actions={
          <div className="flex gap-2">
            <Badge tone="high">Risk: High — Pending Review</Badge>
            <Badge tone="warning">Review: Pending</Badge>
          </div>
        }
      />
      <Tabs tabs={["Storyteller", "Allegation Summary", "Investigation Plan"]} active={tab} onChange={setTab} />

      {tab === "Storyteller" && (
        <div className="space-y-5">
          {loadingNarrative ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-3 text-accent" />
              <p className="text-sm">Generating narrative...</p>
            </div>
          ) : narrativeData ? (
            <>
              <Card title="Narrative Summary" actions={<AIDraftLabel />}>
                <p className="text-sm leading-relaxed text-foreground">
                  {narrativeData.narrative_summary}
                </p>
              </Card>
              <div className="grid md:grid-cols-2 gap-3">
                {NARRATIVE_KEYS.map(([key, label]) => (
                  narrativeData[key] && (
                    <div key={key} className="rounded-lg border border-border bg-card p-4">
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
                      <p className="text-sm mt-1.5 text-foreground">{narrativeData[key]}</p>
                    </div>
                  )
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Btn variant="primary">Accept Narrative</Btn>
                <Btn>Edit Narrative</Btn>
                <Btn>Regenerate</Btn>
                <Btn variant="accent">Mark as Reviewed</Btn>
                <Btn variant="ghost">Add Reviewer Note</Btn>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-muted-foreground text-sm italic">
              Failed to load narrative or no data available.
            </div>
          )}
        </div>
      )}

      {tab === "Allegation Summary" && (
        <div className="space-y-4">
          <AIDraftLabel />
          {loadingPoints ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-3 text-accent" />
              <p className="text-sm">Extracting allegation points...</p>
            </div>
          ) : (
            <DataTable>
              <thead className="bg-muted/60">
                <tr>
                  {["ID","Allegation Point","Category","Party / Entity","Period","Evidence Needed","Initial Status","Actions"].map((h) => <Th key={h}>{h}</Th>)}
                </tr>
              </thead>
              <tbody>
                {pointsData.map((p) => (
                  <Tr key={p.id}>
                    <Td className="font-mono text-xs">{p.id}</Td>
                    <Td>{p.title}</Td>
                    <Td><Badge tone="info">{p.category}</Badge></Td>
                    <Td>{p.party}</Td>
                    <Td className="text-muted-foreground">{p.period}</Td>
                    <Td className="text-muted-foreground text-xs">
                      {Array.isArray(p.evidence_needed) ? p.evidence_needed.join(", ") : p.evidence_needed}
                    </Td>
                    <Td><Badge tone={p.initial_status === "Unproven Allegation" ? "warning" : "neutral"}>{p.initial_status}</Badge></Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        <Btn variant="ghost">Edit</Btn>
                        <Btn variant="ghost">Split</Btn>
                        <Btn variant="ghost">Confirm</Btn>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </DataTable>
          )}
          <WarningBanner>Allegation points are extracted from the allegation document and are not findings. Evidence assessment is required.</WarningBanner>
          <div className="flex flex-wrap gap-2">
            <Btn>Merge Selected</Btn>
            <Btn>Remove Selected</Btn>
            <Btn>Add Evidence Requirement</Btn>
            <Btn variant="primary">Confirm All Allegation Points</Btn>
          </div>
        </div>
      )}

      {tab === "Investigation Plan" && (
        loadingPlan ? (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-3 text-accent" />
            <p className="text-sm">Building investigation plan...</p>
          </div>
        ) : planData ? (
          <div className="grid lg:grid-cols-2 gap-5">
            <Card title="Recommended Steps (Priority Order)">
              <ol className="space-y-2 text-sm list-decimal list-inside">
                {planData.recommended_steps?.map((s: string) => <li key={s}>{s}</li>)}
              </ol>
            </Card>
            <Card title="Evidence Request List">
              <ul className="space-y-1.5 text-sm">
                {planData.evidence_request_list?.map((s: string) => <li key={s} className="flex gap-2"><span className="text-accent">•</span>{s}</li>)}
              </ul>
            </Card>
            <div className="lg:col-span-2 flex flex-wrap gap-2">
              <Btn variant="primary">Approve Plan</Btn>
              <Btn>Edit Plan</Btn>
              <Btn>Add Investigation Step</Btn>
              <Btn>Export Plan</Btn>
              <Btn variant="accent">Send to Reviewer</Btn>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground text-sm italic">
            No investigation plan data available.
          </div>
        )
      )}
    </PageContainer>
  );
}