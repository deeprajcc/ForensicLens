import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageContainer, PageHeader, Card, Btn, Badge, AIDraftLabel, DataTable, Th, Td, Tr } from "@/components/forensic/ui";
import { User, Send, Loader2 } from "lucide-react";

const API = import.meta.env.VITE_API_URL;
export const Route = createFileRoute("/ask-llm")({ component: AskLLM });

const chips = [
  "What is the potential fraud type?",
  "Who are the key parties?",
  "What is directly alleged?",
  "What is inferred but not proven?",
  "What evidence should be requested?",
  "What should not be concluded yet?",
];

function confTone(c: string) {
  if (!c) return "info" as const;
  if (c.startsWith("High")) return "success" as const;
  if (c.startsWith("Low")) return "warning" as const;
  return "info" as const;
}

function AskLLM() {
  const [input, setInput] = useState("");
  const [currentQ, setCurrentQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    async function fetchNotes() {
      try {
        const res = await fetch(`${API}/allegation/asknotes`);
        if (res.ok) {
          const data = await res.json();
          if (data.notes) {
            const parsedNotes = data.notes.map((n: any) => {
              let parsedAns = n.answer;
              if (typeof parsedAns === 'string') {
                try { parsedAns = JSON.parse(parsedAns); } catch(e) {}
              }
              return { ...n, answer: parsedAns };
            });
            // Sort descending so the newest items stay at the top
            parsedNotes.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setHistory(parsedNotes);
          }
        }
      } catch (e) {
        console.error("Failed to fetch notes", e);
      }
    }
    fetchNotes();
  }, []);

  const askQuestion = async (qText: string) => {
    if (!qText.trim()) return;
    setCurrentQ(qText);
    setLoading(true);
    
    try {
      const res = await fetch(`${API}/allegation/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: qText, save_to_notes: true }),
      });
      
      if (!res.ok) throw new Error("Failed to fetch answer");
      const data = await res.json();
      console.log("Received answer data:", data);

      let parsed = data.answer;
      try {
        if (typeof data.answer === 'string') parsed = JSON.parse(data.answer);
      } catch (e) {
        parsed = data.answer;
      }
      
      setHistory(prev => [
        { question: qText, answer: parsed, timestamp: new Date().toISOString() },
        ...prev
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setInput("");
      setCurrentQ("");
    }
  };

  return (
    <PageContainer>
      <PageHeader title="Ask Investigator LLM" subtitle="Allegation Document — scoped Q&A" />
      <div className="grid lg:grid-cols-[1fr_280px] gap-5">
        <div className="space-y-4">
          <Card title="Scope">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">Current scope: Allegation Document Only</Badge>
              <span className="text-xs text-muted-foreground">Switch scope to broaden to full evidence corpus.</span>
            </div>
          </Card>

          <div className="space-y-6">
            {loading && currentQ && (
               <div className="space-y-3">
                 <div className="flex items-start gap-3">
                   <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground"><User className="h-4 w-4" /></div>
                   <div className="flex-1 rounded-lg border border-border bg-card p-3 text-sm">
                     {currentQ}
                   </div>
                 </div>
                 <div className="flex items-start gap-3">
                   <div className="grid h-8 w-8 place-items-center rounded-full bg-accent text-accent-foreground text-xs font-semibold">AI</div>
                   <div className="flex-1 flex items-center justify-center rounded-lg border border-accent/30 bg-card p-8 text-sm text-muted-foreground">
                     <Loader2 className="h-6 w-6 animate-spin text-accent mr-2" /> Analyzing document...
                   </div>
                 </div>
               </div>
            )}
  
            {history.map((item, idx) => (
              <div key={idx} className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground"><User className="h-4 w-4" /></div>
                  <div className="flex-1 rounded-lg border border-border bg-card p-3 text-sm">
                    {item.question}
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-accent text-accent-foreground text-xs font-semibold">AI</div>
                  <div className="flex-1 rounded-lg border border-accent/30 bg-card p-4 space-y-3">
                    <AIDraftLabel />
                    <div className="text-sm leading-relaxed text-foreground">
                      {typeof item.answer === 'string' ? item.answer : item.answer?.potential_classification}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Btn variant="primary">Save to Case Notes</Btn>
                      <Btn>Convert to Allegation Point</Btn>
                      <Btn>Ask Follow-up</Btn>
                      <Btn variant="danger">Reject Answer</Btn>
                      <Btn variant="ghost">Add Investigator Comment</Btn>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && askQuestion(input)}
                placeholder="Ask a scoped question about the allegation document..."
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <Btn variant="primary" onClick={() => askQuestion(input)} disabled={loading || !input.trim()}>
                <Send className="h-3.5 w-3.5"/>Send
              </Btn>
            </div>
          </div>
        </div>

        <Card title="Suggested Prompts">
          <div className="flex flex-col gap-1.5">
            {chips.map((c) => (
              <button 
                key={c} 
                onClick={() => askQuestion(c)}
                disabled={loading}
                className="text-left text-xs rounded-md border border-border px-2.5 py-2 hover:bg-muted transition-colors disabled:opacity-50"
              >
                {c}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}