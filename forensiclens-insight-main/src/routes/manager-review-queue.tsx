import { createFileRoute, Link } from "@tanstack/react-router";
import { PageContainer, PageHeader, DataTable, Th, Td, Tr, Badge, Btn } from "@/components/forensic/ui";

export const Route = createFileRoute("/manager-review-queue")({ component: ManagerReviewQueue });

const rows: [string, string, string, string, "high" | "medium" | "low", string, string][] = [
  ["FI-2026-001", "Oddity Vendor Invoice Manipulation Allegation", "Ravi Chauhan", "Issue Matrix + Pre-Investigation Conclusion", "high", "Pending Manager Review", "Today"],
];

function ManagerReviewQueue() {
  return (
    <PageContainer>
      <PageHeader title="Manager Review Queue" subtitle="Cases awaiting manager review and sign-off" />
      <DataTable>
        <thead className="bg-muted/60">
          <tr>{["Case ID","Case Name","Submitted By","Submission Type","Risk","Status","Submitted On","Action"].map((h) => <Th key={h}>{h}</Th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Tr key={r[0]}>
              <Td className="font-mono text-xs">{r[0]}</Td>
              <Td className="font-medium">{r[1]}</Td>
              <Td>{r[2]}</Td>
              <Td className="text-sm text-muted-foreground">{r[3]}</Td>
              <Td><Badge tone={r[4]}>{r[4].charAt(0).toUpperCase() + r[4].slice(1)}</Badge></Td>
              <Td><Badge tone="warning">{r[5]}</Badge></Td>
              <Td className="text-sm text-muted-foreground">{r[6]}</Td>
              <Td>
                <Link to="/manager-review-pack">
                  <Btn variant="primary">Open Review</Btn>
                </Link>
              </Td>
            </Tr>
          ))}
        </tbody>
      </DataTable>
    </PageContainer>
  );
}