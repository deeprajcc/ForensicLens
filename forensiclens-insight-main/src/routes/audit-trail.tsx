import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageContainer, PageHeader, Card, DataTable, Th, Td, Tr, Badge, Btn } from "@/components/forensic/ui";

const API = import.meta.env.VITE_API_URL;
export const Route = createFileRoute("/audit-trail")({ component: AuditTrail });

const detail: [string, string][] = [
  ["Case ID", "FI-2026-001"],
  ["Prompt", "What is the potential type of fraud?"],
  ["Input document hash", "sha256:8f2a…d41c"],
  ["Model version", "investigator-llm-v1.4"],
  ["Output", "Potential Classification: Procurement / Vendor Fraud (draft)"],
  ["Timestamp", "09:09 — Today"],
  ["User ID", "ravi.chauhan@demo"],
  ["Human action", "Edited"],
];

function AuditTrail() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    async function fetchLogs() {
      try {
        // Assuming the audit router is mounted at /audit
        const res = await fetch(`${API}/audit-log`);
        if (res.ok) {
          const data = await res.json();
          // Sort descending to show newest activity at the top
          const sorted = (data.log || []).sort((a: any, b: any) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          setLogs(sorted);
        }
      } catch (err) {
        console.error("Failed to fetch audit logs", err);
      }
    }
    fetchLogs();
  }, []);

  const formatTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return "--:--";
    }
  };

  const handleExportLog = () => {
    const header = "Timestamp\tUser\tAction\tObject\tDetails\n";
    const rows = logs.map(r => 
      `${new Date(r.timestamp).toLocaleString()}\t${r.user}\t${r.action}\t${r.object}\t${r.details}`
    ).join('\n');

    const content = header + rows;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_log_FI-2026-001_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <PageContainer>
      <PageHeader 
        title="Audit Trail & Lineage" 
        subtitle="Immutable activity log for case FI-2026-001" 
        actions={<Btn onClick={handleExportLog}>Export Log</Btn>} />
      <div className="grid lg:grid-cols-[1fr_320px] gap-5">
        <DataTable>
          <thead className="bg-muted/60">
            <tr>{["Timestamp","User","Action","Object","Details"].map((h) => <Th key={h}>{h}</Th>)}</tr>
          </thead>
          <tbody>
            {logs.map((r, i) => (
              <Tr key={i}>
                <Td className="font-mono text-xs text-muted-foreground">{formatTime(r.timestamp)}</Td>
                <Td><Badge tone={r.user === "System" ? "info" : "neutral"}>{r.user}</Badge></Td>
                <Td className="font-medium">{r.action}</Td>
                <Td className="font-mono text-xs">{r.object}</Td>
                <Td className="text-sm text-muted-foreground">{r.details}</Td>
              </Tr>
            ))}
          </tbody>
        </DataTable>
        <Card title="LLM Output Lineage">
          <dl className="space-y-2 text-sm">
            {detail.map(([k, v]) => (
              <div key={k} className="border-b border-border/60 pb-1.5 last:border-0">
                <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</dt>
                <dd className="mt-0.5 break-words">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex gap-2">
            <Btn variant="ghost">Accept</Btn>
            <Btn variant="ghost">Edit</Btn>
            <Btn variant="ghost">Reject</Btn>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}