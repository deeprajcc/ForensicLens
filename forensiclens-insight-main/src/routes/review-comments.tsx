import { createFileRoute } from "@tanstack/react-router";
import { PageContainer, PageHeader, DataTable, Th, Td, Tr, Badge, Btn } from "@/components/forensic/ui";

export const Route = createFileRoute("/review-comments")({ component: ReviewComments });

const rows: [string, string, string, string, "Open" | "Resolved", string][] = [
  ["C-001", "Soften wording on collusion", "AP-006", "Ravi", "Open", "Updated wording"],
  ["C-002", "Add evidence gap for COI declaration", "Evidence Gaps", "Ravi", "Open", "Added"],
  ["C-003", "Clarify £500k paid vs overcharge", "Executive Summary", "Ravi", "Resolved", "Revised"],
];

function ReviewComments() {
  return (
    <PageContainer>
      <PageHeader title="Review Comments & Resolution" subtitle="Investigator responses to manager review comments" />
      <DataTable>
        <thead className="bg-muted/60">
          <tr>{["Comment ID","Manager Comment","Linked Section","Assigned To","Status","Investigator Response","Actions"].map((h) => <Th key={h}>{h}</Th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Tr key={r[0]}>
              <Td className="font-mono text-xs">{r[0]}</Td>
              <Td className="font-medium">{r[1]}</Td>
              <Td><Badge tone="neutral">{r[2]}</Badge></Td>
              <Td>{r[3]}</Td>
              <Td><Badge tone={r[4] === "Resolved" ? "success" : "warning"}>{r[4]}</Badge></Td>
              <Td className="text-sm">{r[5]}</Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  <Btn variant="ghost">Edit Response</Btn>
                  <Btn variant="ghost">Mark Resolved</Btn>
                </div>
              </Td>
            </Tr>
          ))}
        </tbody>
      </DataTable>
    </PageContainer>
  );
}