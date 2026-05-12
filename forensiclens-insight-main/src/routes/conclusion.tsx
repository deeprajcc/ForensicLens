import { createFileRoute, Link } from "@tanstack/react-router";
import { PageContainer, PageHeader, Card, Badge, Btn, AIDraftLabel, DataTable, Th, Td, Tr, InfoBanner } from "@/components/forensic/ui";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export const Route = createFileRoute("/conclusion")({ component: Conclusion });

function findingTone(s: string) {
  if (s === "Partially Supported") return "warning" as const;
  if (s === "Not Identified") return "neutral" as const;
  if (s === "Requires Further Investigation") return "high" as const;
  return "info" as const;
}

function Conclusion() {
  const [conclusionData, setConclusionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function fetchConclusion() {
      try {
        const res = await fetch(`${API}/conclusion/`);
        if (res.ok) {
          const data = await res.json();
          setConclusionData(data.conclusion);
        }
      } catch (err) {
        console.error("Failed to fetch conclusion", err);
      } finally {
        setLoading(false);
      }
    }
    fetchConclusion();
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch(`${API}/conclusion/generate`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setConclusionData(data.conclusion);
      }
    } catch (err) {
      console.error("Failed to generate conclusion", err);
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <PageContainer><div className="py-20 flex justify-center"><Loader2 className="animate-spin text-accent" /></div></PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Step 3: Pre-Investigation Conclusion"
        subtitle="Draft preliminary assessment for case FI-2026-001"
        actions={<AIDraftLabel />}
      />
      
      {generating && (
        <div className="mb-6 py-12 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-lg bg-muted/20">
          <Loader2 className="h-8 w-8 animate-spin mb-3 text-accent" />
          <p className="text-sm font-medium text-foreground">Synthesizing findings and building draft conclusion...</p>
        </div>
      )}

      {!conclusionData && !generating ? (
        <div className="py-12 text-center text-muted-foreground text-sm italic border-2 border-dashed border-border rounded-lg mb-6">
          No conclusion draft available. Click "Generate Conclusion" to process the issue matrix.
        </div>
      ) : conclusionData && (
        <div className="space-y-5">
          {conclusionData.disclaimer && (
            <InfoBanner>{conclusionData.disclaimer}</InfoBanner>
          )}
          
          <Card title="Executive Summary">
            <p className="text-sm leading-relaxed text-foreground font-medium">
              {conclusionData.executive_summary}
            </p>
          </Card>
          
          <Card title="Allegation Overview">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {conclusionData.allegation_overview}
            </p>
          </Card>

          <div className="grid lg:grid-cols-2 gap-5">
            <Card title="Evidence Referenced">
              <DataTable>
                <thead className="bg-muted/60"><tr><Th>Evidence ID</Th><Th>Status</Th></tr></thead>
                <tbody>
                  {conclusionData.evidence_reviewed?.map((id: string) => (
                    <Tr key={id}>
                      <Td className="font-mono text-xs">{id}</Td>
                      <Td><Badge tone="success">Reviewed</Badge></Td>
                    </Tr>
                  ))}
                </tbody>
              </DataTable>
            </Card>

            <Card title="Preliminary Findings">
              <DataTable>
                <thead className="bg-muted/60"><tr><Th>AP</Th><Th>AI Assessment</Th><Th>Position</Th></tr></thead>
                <tbody>
                  {conclusionData.preliminary_findings?.map((f: any) => (
                    <Tr key={f.allegation_point}>
                      <Td className="font-mono text-xs">{f.allegation_point}</Td>
                      <Td className="text-sm leading-snug py-2">
                        <span className="line-clamp-3 hover:line-clamp-none transition-all">{f.finding}</span>
                      </Td>
                      <Td><Badge tone={findingTone(f.status)}>{f.status}</Badge></Td>
                    </Tr>
                  ))}
                </tbody>
              </DataTable>
            </Card>

            <Card title="Evidence Gaps">
              <ul className="space-y-1.5 text-sm">
                {conclusionData.evidence_gaps?.map((g: string) => (
                  <li key={g} className="flex gap-2"><span className="text-warning font-bold">•</span>{g}</li>
                ))}
              </ul>
            </Card>

            <Card title="Recommended Next Steps">
              <ol className="space-y-1.5 text-sm list-decimal list-inside">
                {conclusionData.recommended_next_steps?.map((n: string) => (
                  <li key={n} className="text-foreground">{n}</li>
                ))}
              </ol>
            </Card>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-border">
        <Btn variant="primary" onClick={handleGenerate} disabled={generating}>{generating ? "Generating..." : "Generate Conclusion"}</Btn>
        <Btn disabled={!conclusionData}>Edit Conclusion</Btn>
        <Btn disabled={!conclusionData}>Save as Draft</Btn>
        <Btn variant="accent" disabled={!conclusionData}>Send for Review</Btn>
        <Link to="/report-builder"><Btn variant="primary" disabled={!conclusionData}>Export to Report Builder</Btn></Link>
      </div>
    </PageContainer>
  );
}