import { AlertTriangle, Info, Bot, FileWarning } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="p-6 max-w-[1400px] mx-auto w-full">{children}</div>;
}

type Tone = "neutral" | "high" | "medium" | "low" | "info" | "warning" | "success" | "danger";

const toneClass: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  high: "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-warning/15 text-foreground border-warning/40",
  low: "bg-success/15 text-foreground border-success/40",
  info: "bg-info/10 text-foreground border-info/30",
  warning: "bg-warning/15 text-foreground border-warning/40",
  success: "bg-success/15 text-foreground border-success/40",
  danger: "bg-destructive/10 text-destructive border-destructive/30",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${toneClass[tone]}`}
    >
      {children}
    </span>
  );
}

export function Card({
  title,
  children,
  actions,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-border bg-card shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
          {actions}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

export function AIDraftLabel({ className = "" }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-2 py-1 text-[11px] font-medium text-foreground ${className}`}
    >
      <Bot className="h-3 w-3 text-accent" />
      AI-assisted draft — requires investigator review
    </div>
  );
}

export function WarningBanner({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
      <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function InfoBanner({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-info/30 bg-info/10 px-3 py-2 text-sm text-foreground">
      <Info className="h-4 w-4 text-info mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function DraftReportLabel() {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-2 py-1 text-[11px] font-medium text-foreground">
      <FileWarning className="h-3 w-3 text-warning" />
      Draft generated for investigator review. Not a final forensic finding.
    </div>
  );
}

export function Btn({
  children,
  variant = "secondary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "accent";
}) {
  const v = {
    primary:
      "bg-primary text-primary-foreground hover:bg-primary/90 border border-primary",
    accent: "bg-accent text-accent-foreground hover:bg-accent/90 border border-accent",
    secondary:
      "bg-card text-foreground hover:bg-muted border border-border",
    ghost: "bg-transparent text-foreground hover:bg-muted border border-transparent",
    danger:
      "bg-destructive text-destructive-foreground hover:bg-destructive/90 border border-destructive",
  }[variant];
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${v} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <th className={`text-left font-medium text-muted-foreground px-3 py-2 text-[11px] uppercase tracking-wider ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-3 py-3 align-top text-foreground ${className}`}>{children}</td>;
}

export function DataTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Tr({ children }: { children: ReactNode }) {
  return <tr className="border-t border-border hover:bg-muted/40">{children}</tr>;
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: string[];
  active: string;
  onChange: (t: string) => void;
}) {
  return (
    <div className="border-b border-border mb-5">
      <div className="flex flex-wrap gap-1">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => onChange(t)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
              active === t
                ? "border-accent text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}