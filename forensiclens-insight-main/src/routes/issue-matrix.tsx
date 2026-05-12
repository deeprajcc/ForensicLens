import { createFileRoute } from "@tanstack/react-router";
import { PageContainer, PageHeader, DataTable, Th, Td, Tr, Badge, Btn, AIDraftLabel, WarningBanner } from "@/components/forensic/ui";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export const Route = createFileRoute("/issue-matrix")({ component: IssueMatrix });

const statusOptions = ["Supported", "Partially Supported", "Unresolved", "Contradicted", "Insufficient Evidence", "Out of Scope", "Requires Further Investigation"];

function asTone(s: string) {
  if (s === "Partially Supported") return "warning" as const;
  if (s === "Supported") return "success" as const;
  if (s === "Contradicted") return "danger" as const;
  return "neutral" as const;
}

function IssueMatrix() {
  
  const [matrixData, setMatrixData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMatrix() {
      try {
        const res = await fetch(`${API}/issue-matrix/`);
        if (res.ok) {
          const data = await res.json();
          setMatrixData(data.matrix || []);
        }
      } catch (err) {
        console.error("Failed to fetch issue matrix", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMatrix();
  }, []);

  return (
    <PageContainer>
      <PageHeader
        title="Issue Matrix — Allegation vs Evidence Assessment"
        subtitle="Investigator-led review of allegation points against current evidence"
        actions={<AIDraftLabel />}
      />
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin mb-3 text-accent" />
            <p className="text-sm font-medium text-foreground">Loading issue matrix...</p>
          </div>
        ) : matrixData.length > 0 ? (
          <DataTable>
            <thead className="bg-muted/60">
              <tr>{["ID","Issue / Allegation Point","Evidence Reviewed","Support","Contradiction","Gap","Investigator Assessment","Review Status","Actions"].map((h) => <Th key={h}>{h}</Th>)}</tr>
            </thead>
            <tbody>
              {matrixData.map((r) => (
                <Tr key={r.id}>
                  <Td className="font-mono text-xs">{r.id}</Td>
                  <Td className="font-medium">{r.issue}</Td>
                  <Td className="text-sm text-muted-foreground">{r.support}</Td>
                  <Td className="text-sm italic">{r.assessment_rationale || "No rationale provided"}</Td>
                  <Td className="text-sm text-muted-foreground">{r.contradiction}</Td>
                  <Td className="text-sm">{r.gap}</Td>
                  <Td>
                    <select defaultValue={r.investigator_assessment} className="rounded-md border border-input bg-background px-2 py-1 text-xs">
                      {statusOptions.map((o) => <option key={o}>{o}</option>)}
                    </select>
                    <div className="mt-1"><Badge tone={asTone(r.investigator_assessment)}>{r.investigator_assessment}</Badge></div>
                  </Td>
                  <Td><Badge tone={r.review_status === "Manager Review" ? "high" : "warning"}>{r.review_status}</Badge></Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      <Btn variant="ghost">Accept</Btn>
                      <Btn variant="ghost">Edit</Btn>
                      <Btn variant="ghost">Reject</Btn>
                      <Btn variant="ghost">Request More</Btn>
                      <Btn variant="ghost">Escalate</Btn>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <div className="py-12 text-center text-muted-foreground text-sm italic border-2 border-dashed border-border rounded-lg">
            No issue matrix data available. Ensure an evidence scan has been performed.
          </div>
        )}
        <WarningBanner>
          The issue matrix reflects the position of evidence reviewed to date. It does not constitute a finding of misconduct. Manager review required for items flagged Manager Review.
        </WarningBanner>
      </div>
      
    </PageContainer>
  );
}