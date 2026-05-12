import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageContainer, PageHeader, Card, Btn, Badge, InfoBanner } from "@/components/forensic/ui";
import { FileText, CheckCircle2, Loader2, Upload, Search } from "lucide-react";

export const Route = createFileRoute("/allegation-intake")({ component: AllegationIntake });
const API = import.meta.env.VITE_API_URL ;
export function AllegationIntake() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "analyzing" | "completed">("idle");
  const [uploadData, setUploadData] = useState<{ filename: string; characters: number; pages: number } | null>(null);
  const [summaryData, setSummaryData] = useState<Record<string, any> | null>(null);

  const settings: [string, string][] = [
  ["Document Type", "Interview transcript"],
  ["Document Role", "Primary allegation document"],
  ["Source", "Internal escalation"],
  ["Contains personal data", "Yes"],
  ["Privilege review required", "Potentially"],
  ["Allow LLM processing", "Yes"],
];
  // 1. Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setStatus("uploading");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch(`${API}/allegation/upload`, { method: "POST", body: formData });
      const data = await response.json();
      setUploadData(data);
      
      // Automatically trigger analysis after upload
      handleAnalyze();
    } catch (error) {
      console.error("Upload failed", error);
      setStatus("idle");
    }
  };

  // 2. Handle LLM Analysis
  const handleAnalyze = async () => {
    setStatus("analyzing");
    try {
      const response = await fetch(`${API}/allegation/analyze`, { method: "POST" });
      const data = await response.json();
      
      
      const { key_parties, allegation_themes, warnings, ...filteredSummary } = data.summary || {};
      setSummaryData(filteredSummary);
      setStatus("completed");
    } catch (error) {
      console.error("Analysis failed", error);
      setStatus("uploading"); // Rollback to uploaded state
    }
  };

  // Helper to format API keys into readable labels (e.g. "main_vendor" -> "Main Vendor")
  const formatKey = (key: string) => key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  return (
    <PageContainer>
      <PageHeader 
        title="Step 1: Upload Allegation Document" 
        subtitle="Capture and process the source allegation for case FI-2026-001" 
      />

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="space-y-5">
          {/* File Upload Area */}
          <Card title="Source Document">
            {!uploadData ? (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {status === "uploading" ? (
                    <Loader2 className="h-8 w-8 animate-spin text-accent mb-2" />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  )}
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-accent">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">PDF (Max 10MB)</p>
                </div>
                <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} disabled={status !== "idle"} />
              </label>
            ) : (
              <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 p-3">
                <div className="grid h-10 w-10 place-items-center rounded-md bg-accent/15 text-accent">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{uploadData.filename}</div>
                  <div className="text-xs text-muted-foreground">
                    {uploadData.pages} Pages &middot; {file ? (file.size / (1024 * 1024)).toFixed(2) : "0.00"} MB &middot; Uploaded today by Ravi Chauhan
                  </div>
                </div>
                <Badge tone="success">Uploaded</Badge>
              </div>
            )}
          </Card>
  <Card title="Document Settings">
            <dl className="grid sm:grid-cols-2 gap-2 text-sm">
              {settings.map(([k, v]) => (
                <div key={k} className="rounded-md border border-border p-2.5">
                  <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</dt>
                  <dd className="mt-0.5">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card title="Processing Checklist">
            <ul className="space-y-1.5">
              {[
                { label: "File uploaded", done: status !== "idle" },
                { label: "Text extracted", done: !!uploadData },
                { label: "Metadata captured", done: !!uploadData },
                { label: "AI Analysis", done: status === "completed", loading: status === "analyzing" },
                { label: "Ready for investigator review", done: status === "completed" },
              ].map((c) => (
                <li key={c.label} className={`flex items-center gap-2 text-sm ${c.done ? "text-foreground" : "text-muted-foreground"}`}>
                  {c.loading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  ) : c.done ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-border" />
                  )}
                  {c.label}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Extracted Summary">
            {status === "analyzing" ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                <Search className="h-8 w-8 animate-pulse mb-3" />
                <p className="text-sm">LLM is extracting allegation points...</p>
              </div>
            ) : summaryData ? (
              <dl className="space-y-2 text-sm">
                {Object.entries(summaryData).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-border/60 pb-1.5 last:border-0">
                    <dt className="text-muted-foreground">{formatKey(k)}</dt>
                    <dd className="text-right font-medium">{typeof v === 'string' ? v : JSON.stringify(v)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="py-12 text-center text-muted-foreground text-sm italic">
                Upload a document to generate AI summary
              </div>
            )}
          </Card>

          {status === "completed" && (
            <>
              <InfoBanner>Extraction complete. Investigator review required before progression to allegation analysis.</InfoBanner>
              <div className="flex flex-wrap gap-2">
                <Link to="/allegation-review"><Btn variant="primary">Open Document Review</Btn></Link>
                <Btn onClick={() => handleAnalyze()}>Reprocess</Btn>
                <Btn variant="ghost">Exclude from Analysis</Btn>
                <Link to="/ask-llm"><Btn variant="accent">Continue to Investigation</Btn></Link>
              </div>
            </>
          )}
        </div>
      </div>
    </PageContainer>
  );
}