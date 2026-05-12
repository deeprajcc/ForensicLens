import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  PageContainer, 
  PageHeader, 
  Card, 
  Badge, 
  Btn, 
  DataTable, 
  Th, 
  Td, 
  Tr, 
  WarningBanner 
} from "@/components/forensic/ui";
import { FileText, ChevronLeft, ChevronRight } from "lucide-react";

const API = import.meta.env.VITE_API_URL ;
// API Fetcher
async function fetchSummary() {
  const res = await fetch(`${API}/allegation/summary`);
  if (!res.ok) throw new Error("Failed to fetch summary");
  return res.json();
}

export const Route = createFileRoute("/allegation-review")({
  loader: async () => await fetchSummary(),
  component: AllegationReview,
});

function AllegationReview() {
  const { summary } = Route.useLoaderData();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);

  useEffect(() => {
    let url: string;
    async function loadPdf() {
      try {
        const res = await fetch(`${API}/allegation/file`);
        if (!res.ok) throw new Error("Failed to load PDF");
        
        const data = await res.json();

        if (data.page_count) setTotalPages(data.page_count);
        if (data.filename) setPdfName(data.filename);

        // Convert base64 to Blob
        const byteCharacters = atob(data.file_base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: data.content_type || "application/pdf" });

        url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (err) {
        console.error(err);
      }
    }
    loadPdf();
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, []);

  const handleNext = () => setCurrentPage((p) => Math.min(p + 1, totalPages));
  const handlePrev = () => setCurrentPage((p) => Math.max(p - 1, 1));

  return (
    <PageContainer>
      <PageHeader 
        title="Allegation Review" 
        subtitle={`Document: ${pdfName}`} 
      />

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Document Viewer Section */}
        <Card title="Document Viewer" className="lg:sticky lg:top-4 self-start">
          <div className="flex flex-col gap-4">
            <div className="aspect-[3/4] w-full rounded-md border border-border bg-white shadow-inner flex flex-col overflow-hidden relative">
              {/* PDF Content Area */}
              <div className="flex-1 bg-muted/10 relative">
                {pdfUrl ? (
                  <iframe 
                    src={`${pdfUrl}#page=${currentPage}&toolbar=0&navpanes=0`} 
                    className="absolute inset-0 w-full h-full border-0" 
                    title="Allegation PDF Viewer"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Loading PDF...
                  </div>
                )}
              </div>

              {/* Viewer Controls */}
              <div className="border-t border-border bg-muted/30 p-2 flex items-center justify-between">
                <div className="flex gap-1">
                  <Btn variant="ghost" onClick={handlePrev} disabled={currentPage === 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </Btn>
                  <div className="flex items-center px-3 text-xs font-medium">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Btn variant="ghost" onClick={handleNext} disabled={currentPage === totalPages}>
                    <ChevronRight className="h-4 w-4" />
                  </Btn>
                </div>
                <Btn variant="ghost">
                  <FileText className="h-3.5 w-3.5 mr-1.5" /> Fullscreen
                </Btn>
              </div>
            </div>
            
            <div className="flex gap-2 justify-end">
              <Badge tone="info">OCR Active</Badge>
              <Badge tone="success">Verified</Badge>
            </div>
          </div>
        </Card>

        {/* Data Analysis Section */}
        <div className="space-y-5">
          <Card title="Extracted Parties">
            <DataTable>
              <thead className="bg-muted/60">
                <tr>
                  <Th>Name</Th>
                  <Th>Role</Th>
                  <Th>Relevance</Th>
                </tr>
              </thead>
              <tbody>
                {summary.key_parties.map((p: any) => (
                  <Tr key={p.Name}>
                    <Td className="font-medium">{p.Name}</Td>
                    <Td>{p.Role}</Td>
                    <Td className="text-muted-foreground text-xs">{p.Relevance}</Td>
                  </Tr>
                ))}
              </tbody>
            </DataTable>
          </Card>

          <Card title="Allegation Themes">
            <div className="flex flex-wrap gap-2">
              {summary.allegation_themes.map((t: string) => (
                <Badge key={t} tone="info">{t}</Badge>
              ))}
            </div>
          </Card>

          <Card title="Extraction Warnings & Risks">
            <div className="space-y-2">
              {summary.warnings.map((w: string, i: number) => (
                <WarningBanner key={i}>{w}</WarningBanner>
              ))}
            </div>
          </Card>

          <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 mb-5">
            <h4 className="text-sm font-bold text-accent mb-2">Financial Summary</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Est. Overcharge</p>
                <p className="text-lg font-bold text-foreground">{summary.estimated_overcharge}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Already Paid</p>
                <p className="text-lg font-bold text-foreground">{summary.already_paid}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-4">
            <Btn variant="primary">Confirm Extracted Facts</Btn>
            <Btn variant="ghost">Edit Facts</Btn>
            <Link to="/ask-llm">
              <Btn variant="accent">Proceed to Investigation LLM</Btn>
            </Link>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}