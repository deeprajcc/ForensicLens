import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageContainer, PageHeader, Card, Badge, Btn, Tabs, DataTable, Th, Td, Tr, AIDraftLabel, InfoBanner, WarningBanner } from "@/components/forensic/ui";
import { Archive, CheckCircle2, User, Send, Loader2, Upload } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export const Route = createFileRoute("/evidence-workspace")({ component: EvidenceWorkspace });

const settings: [string, string][] = [
  ["Evidence type", "Mixed text/email evidence"],
  ["Link to case", "FI-2026-001"],
  ["Processing mode", "Full evidence ingestion"],
  ["Duplicate detection", "On"],
  ["Entity extraction", "On"],
  ["Link to allegation points", "On"],
  ["Privilege scan", "On"],
  ["PII scan", "On"],
];

const checklist = [
  "ZIP uploaded",
  "Files extracted",
  "Text files parsed",
  "Duplicate check completed",
  "Entities identified",
  "Evidence indexed",
  "Ready for evidence register",
];

const summary: [string, string][] = [
  ["Files extracted", "0"],
  ["Example email files", "0"],
  ["Chain files", "0"],
  ["Other email files", "0"],
  ["Potential duplicates", "None"],
  ["High relevance candidates", "None"],
  ["Requires review", "Yes"],
];

const register: [string, string, string, string, string, string, string][] = [
 
];

const filters = [
  "High relevance only",
  "Duplicates",
  "Privilege flagged",
  "PII flagged",
  "Unlinked evidence",
  "Filter by allegation point",
  "Filter by person",
  "Filter by date",
];

function relTone(r: string) {
  if (r === "High") return "high" as const;
  if (r === "Medium") return "medium" as const;
  return "neutral" as const;
}

function statusTone(s: string) {
  if (s === "Partially Supported") return "warning" as const;
  if (s.startsWith("Unresolved")) return "neutral" as const;
  return "info" as const;
}

function extractPartiesFromPreview(preview: string) {
  if (!preview) return "TBD";
  const extract = (label: string) => {
    const regex = new RegExp(`${label}:\\s*([^@\\s\\r\\n]+)`, 'i');
    const match = preview.match(regex);
    if (!match) return null;
    // Extract name before @ and replace dots with spaces
    return match[1].replace(/\./g, ' ').trim();
  };

  const from = extract("From");
  const to = extract("To");
  const cc = extract("CC");

  const names = [from, to, cc].filter(Boolean);
  return names.length > 0 ? names.join(" / ") : "Not Found";
}

function EvidenceWorkspace() {
  const [tab, setTab] = useState("Evidence Upload");
  const [status, setStatus] = useState<"idle" | "uploading" | "completed">("idle");
  const [evidenceData, setEvidenceData] = useState<any>(null);
  const [scanData, setScanData] = useState<any>(null);
  const [loadingScan, setLoadingScan] = useState(false);
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [fileViewerContent, setFileViewerContent] = useState("");
  const [fileViewerTitle, setFileViewerTitle] = useState("");

  useEffect(() => {
    if (tab === "Evidence Scan" && !scanData) {
      const fetchExistingScan = async () => {
        try {
          const res = await fetch(`${API}/evidence/scan`);
          if (res.ok) {
            const data = await res.json();
            setScanData(data.scan);
          }
        } catch (e) {
          console.error("Failed to fetch existing scan results", e);
        }
      };
      fetchExistingScan();
    }
  }, [tab, scanData]);

  const handleRunScan = async () => {
    setLoadingScan(true);
    try {
      const res = await fetch(`${API}/evidence/scan`, { 
        method: "POST" 
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Scan failed");
      }

      const data = await res.json();
      setScanData(data.scan);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingScan(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setStatus("uploading");
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch(`${API}/evidence/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setEvidenceData(data);
      setStatus("completed");
    } catch (err) {
      console.error(err);
      setStatus("idle");
    }
  };

  const handleOpenFile = async (evidenceId: string, fileName: string) => {
    setFileViewerTitle(fileName);
    setFileViewerContent("Loading file content..."); // Placeholder
    setShowFileViewer(true);

    try {
      const res = await fetch(`${API}/evidence/file/${evidenceId}`); // Assuming this endpoint exists
      if (!res.ok) {
        throw new Error("Failed to fetch file content");
      }
      const data = await res.text();
      
      // If the text contains literal "\n" strings, convert them to actual newlines
      // and remove any surrounding quotes that might come from raw JSON responses
      const formatted = data.replace(/\\n/g, '\n').replace(/^"|"$/g, '');
      
      setFileViewerContent(formatted);
    } catch (err: any) {
      console.error("Error fetching file content:", err);
      setFileViewerContent(`Error: ${err.message}`);
    }
  };


  const displaySummary = evidenceData?.upload_summary || summary;
  const displayRegister = evidenceData?.evidence_index || register;

  return (
    <PageContainer>
      <PageHeader title="Evidence Workspace" subtitle="Ingest, index, and assess case evidence" />
      <Tabs tabs={["Evidence Upload", "Evidence Register", "Evidence Scan", "Evidence Q&A"]} active={tab} onChange={setTab} />

      {tab === "Evidence Upload" && (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="space-y-5">
            <Card title="Step 2: Upload Evidence Corpus">
              {status === "idle" ? (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-accent">Click to upload</span> or drag and drop ZIP
                    </p>
                  </div>
                  <input type="file" className="hidden" accept=".zip" onChange={handleFileUpload} />
                </label>
              ) : (
                <div className="flex items-center gap-3 rounded-md border border-dashed border-border bg-muted/40 p-4">
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-accent/15 text-accent">
                    {status === "uploading" ? <Loader2 className="h-5 w-5 animate-spin"/> : <Archive className="h-5 w-5"/>}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{evidenceData?.filename || "Processing Archive..."}</div>
                    <div className="text-xs text-muted-foreground">{evidenceData?.files_extracted || 0} files extracted · {status === "uploading" ? "indexing" : "indexed"}</div>
                  </div>
                  <Badge tone={status === "uploading" ? "info" : "success"}>{status === "uploading" ? "Uploading" : "Ingested"}</Badge>
                </div>
              )}
            </Card>
            <Card title="Upload Settings">
              <dl className="grid sm:grid-cols-2 gap-2 text-sm">
                {settings.map(([k, v]) => (
                  <div key={k} className="rounded-md border border-border p-2.5">
                    <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</dt>
                    <dd className="mt-0.5">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </div>
          <div className="space-y-5">
            <Card title="Processing Checklist">
              <ul className="space-y-1.5">
                {checklist.map((c) => (
                  <li key={c} className={`flex items-center gap-2 text-sm ${status === "completed" ? "text-foreground" : "text-muted-foreground"}`}>
                    {status === "completed" ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : status === "uploading" ? (
                      <Loader2 className="h-4 w-4 animate-spin text-accent" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-border" />
                    )}
                    {c}
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Upload Summary">
              <dl className="space-y-2 text-sm">
                {displaySummary.map(([k, v]: [string, string]) => (
                  <div key={k} className="flex justify-between border-b border-border/60 pb-1.5 last:border-0">
                    <dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            <InfoBanner>Evidence indexed for review. Relevance and interpretation require investigator confirmation.</InfoBanner>
          </div>
        </div>
      )}

      {tab === "Evidence Register" && (
        <div className="space-y-4">
          <Card title="Filters">
            <div className="flex flex-wrap gap-2">
              {filters.map((f) => <button key={f} className="rounded-md border border-border bg-background px-2.5 py-1 text-xs hover:bg-muted">{f}</button>)}
            </div>
          </Card>
          <DataTable>
            <thead className="bg-muted/60">
              <tr>{["Evidence ID","File Name","Type","Key Parties","Relevance","Linked AP","Status","Actions"].map((h) => <Th key={h}>{h}</Th>)}</tr>
            </thead>
            <tbody>
              {displayRegister.map((r: any, idx: number) => {
                const isArray = Array.isArray(r);
                const id = isArray ? r[0] : r.evidence_id;
                const fileName = isArray ? r[1] : r.file_name;
                const type = isArray ? r[2] : r.evidence_type;
                const parties = isArray ? r[3] : extractPartiesFromPreview(r.content_preview);
                const relevance = isArray ? r[4] : r.relevance_label;
                const linkedAp = isArray ? r[5] : (r.linked_allegation_points?.join(", ") || "None");
                const rowStatus = isArray ? r[6] : r.status;

                return (
                  <Tr key={id || idx}>
                    <Td className="font-mono text-xs">{id}</Td>
                    <Td className="font-medium">{fileName}</Td>
                    <Td>{type}</Td>
                    <Td>{parties}</Td>
                    <Td><Badge tone={relTone(relevance)}>{relevance}</Badge></Td>
                    <Td className="font-mono text-xs">{linkedAp}</Td>
                    <Td><Badge tone={rowStatus === "Duplicate Review" ? "warning" : "neutral"}>{rowStatus}</Badge></Td>
                    <Td>
                      <div className="flex flex-wrap gap-1"> 
                      <Btn variant="ghost" onClick={() => handleOpenFile(id, fileName)}>Open</Btn>
                      <Btn variant="ghost">Link</Btn>
                      <Btn variant="ghost">Mark Relevant</Btn>
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </DataTable>
          <div className="flex flex-wrap gap-2">
            <Btn variant="primary">Export Register</Btn>
            <Btn>Bulk Exclude</Btn>
            <Btn>Add Investigator Note</Btn>
          </div>
        </div>
      )}

      {tab === "Evidence Scan" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <AIDraftLabel />
            <Btn variant="primary" onClick={handleRunScan} disabled={loadingScan}>
              {loadingScan ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2"/>Scanning Corpus...</> : "Run AI Evidence Scan"}
            </Btn>
          </div>
          
          {loadingScan ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin mb-3 text-accent" />
              <p className="text-sm font-medium text-foreground">Mapping evidence to allegation points</p>
              <p className="text-xs mt-1">This may take a moment depending on the corpus size...</p>
            </div>
          ) : scanData ? (
            <DataTable>
              <thead className="bg-muted/60">
                <tr>{["Allegation Point","Supporting Evidence","Contradictory Evidence","Evidence Gaps","AI Proposed Status"].map((h) => <Th key={h}>{h}</Th>)}</tr>
              </thead>
              <tbody>
                {Object.entries(scanData).map(([id, r]: [string, any]) => (
                  <Tr key={id}>
                    <Td className="font-medium">
                      <span className="font-mono text-xs text-muted-foreground mr-2 uppercase">{r.allegation_point_id}</span>
                      
                    </Td>
                    <Td className="text-sm">
                      <div className="flex flex-wrap gap-1">
                        {r.supporting_evidence?.map((evId: string) => <Badge key={evId} tone="info">{evId}</Badge>) || <span className="text-muted-foreground">None</span>}
                      </div>
                    </Td>
                    <Td className="text-sm text-muted-foreground">
                      <div className="flex flex-wrap gap-1">
                        {r.contradictory_evidence?.map((evId: string) => <Badge key={evId} tone="danger">{evId}</Badge>) || "None"}
                      </div>
                    </Td>
                    <Td className="text-sm text-muted-foreground italic">{r.evidence_gaps?.join(", ") || "None identified"}</Td>
                    <Td><Badge tone={statusTone(r.proposed_status)}>{r.proposed_status}</Badge></Td>
                  </Tr>
                ))}
              </tbody>
            </DataTable>
          ) : (
            <div className="py-12 text-center text-muted-foreground text-sm italic border-2 border-dashed border-border rounded-lg">
              No evidence scan data available. Click "Run AI Evidence Scan" to process the corpus.
            </div>
          )}

          <Card title="Evidence Confidence Legend">
            <div className="flex flex-wrap gap-2">
              {["Direct support","Consistent indicator","Context only","Contradiction","Gap","Not assessed"].map((l) => (
                <Badge key={l} tone="info">{l}</Badge>
              ))}
            </div>
          </Card>
          <WarningBanner>Evidence scan identifies indicators and gaps. It does not determine misconduct.</WarningBanner>
        </div>
      )}

      {tab === "Evidence Q&A" && (
        <div className="grid lg:grid-cols-[1fr_280px] gap-5">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground"><User className="h-4 w-4"/></div>
              <div className="flex-1 rounded-lg border border-border bg-card p-3 text-sm">Is there direct evidence of a kickback?</div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-accent text-accent-foreground text-xs font-semibold">AI</div>
              <div className="flex-1 rounded-lg border border-accent/30 bg-card p-4 space-y-3">
                <AIDraftLabel />
                <p className="text-sm">
                  No direct evidence of a kickback was identified in the reviewed evidence corpus. The allegation raises suspicion of possible collusion, and some communications may justify further review, but the current evidence does not establish payment, personal benefit, or quid pro quo.
                </p>
                <Card title="Source References">
                  <ul className="space-y-1.5 text-xs">
                    <li className="flex justify-between"><span>EV-001 · Example_Email_1a.txt</span><Badge tone="info">Context only</Badge></li>
                    <li className="flex justify-between"><span>EV-006 · chain1.txt</span><Badge tone="info">Context only</Badge></li>
                  </ul>
                </Card>
                <div className="flex flex-wrap gap-2">
                  <Btn variant="primary">Save Answer</Btn>
                  <Btn>Link to Issue Matrix</Btn>
                  <Btn>Request Additional Evidence</Btn>
                  <Btn variant="ghost">Add Human Comment</Btn>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex gap-2">
                <input placeholder="Ask a question scoped to selected evidence..." className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"/>
                <Btn variant="primary"><Send className="h-3.5 w-3.5"/>Send</Btn>
              </div>
            </div>
          </div>
          <Card title="Filters">
            <div className="space-y-3 text-xs">
              <div>
                <div className="text-muted-foreground mb-1">Evidence scope</div>
                <select className="w-full rounded-md border border-input bg-background px-2 py-1.5"><option>All evidence</option><option>High relevance</option><option>Selected files</option></select>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Allegation point</div>
                <select className="w-full rounded-md border border-input bg-background px-2 py-1.5">{["AP-001","AP-002","AP-003","AP-004","AP-005","AP-006","AP-007"].map(o=><option key={o}>{o}</option>)}</select>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Evidence type</div>
                <select className="w-full rounded-md border border-input bg-background px-2 py-1.5"><option>Email</option><option>Chain</option><option>Attachment</option><option>Other</option></select>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Date range</div>
                <select className="w-full rounded-md border border-input bg-background px-2 py-1.5"><option>All</option><option>Before allegation</option><option>After allegation</option></select>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Person</div>
                <select className="w-full rounded-md border border-input bg-background px-2 py-1.5">{["Sarah","Robin","William","Michael","Oddity"].map(o=><option key={o}>{o}</option>)}</select>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Status</div>
                <select className="w-full rounded-md border border-input bg-background px-2 py-1.5"><option>Reviewed</option><option>Unreviewed</option><option>Excluded</option></select>
              </div>
            </div>
          </Card>
        </div>
      )}

      {showFileViewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-card rounded-lg shadow-lg w-full max-w-3xl h-3/4 flex flex-col">
            <div className="flex justify-between items-center border-b border-border p-4">
              <h3 className="text-lg font-semibold">{fileViewerTitle}</h3>
              <Btn variant="ghost" onClick={() => setShowFileViewer(false)}>Close</Btn>
            </div>
            <div className="flex-1 p-4 overflow-auto text-sm text-muted-foreground">
              {fileViewerContent === "Loading file content..." ? (
                <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
              ) : (
                <pre className="whitespace-pre-wrap">{fileViewerContent}</pre>
              )}
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}