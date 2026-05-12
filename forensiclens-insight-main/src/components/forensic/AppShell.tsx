import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FilePlus2,
  FolderKanban,
  FileUp,
  FileSearch,
  MessageSquare,
  ListChecks,
  FolderOpen,
  Grid3x3,
  UserCheck,
  ClipboardCheck,
  FileText,
  ScrollText,
  ShieldCheck,
  Lock,
  Scan,
  Inbox,
  BookOpenCheck,
  MessagesSquare,
} from "lucide-react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/case-setup", label: "Case Setup", icon: FilePlus2 },
  { to: "/case-overview", label: "Case Overview", icon: FolderKanban },
  { to: "/allegation-intake", label: "Allegation Intake", icon: FileUp },
  { to: "/allegation-review", label: "Allegation Review", icon: FileSearch },
  { to: "/ask-llm", label: "Ask Investigator LLM", icon: MessageSquare },
  { to: "/allegation-assessment", label: "Allegation Assessment", icon: ListChecks },
  { to: "/evidence-workspace", label: "Evidence Workspace", icon: FolderOpen },
  { to: "/issue-matrix", label: "Issue Matrix", icon: Grid3x3 },
  { to: "/human-review", label: "Human Review", icon: UserCheck },
  { to: "/conclusion", label: "Conclusion", icon: ClipboardCheck },
  { to: "/report-builder", label: "Report Builder", icon: FileText },
  { to: "/audit-trail", label: "Audit Trail", icon: ScrollText },
] as const;

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <Scan className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">ForensicLens</div>
              <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
                Case Workspace
              </div>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {nav.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-sidebar-primary"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t border-sidebar-border text-[11px] text-sidebar-foreground/60">
          <div className="flex items-center gap-1.5"><Lock className="h-3 w-3" />Controlled forensic workspace</div>
          <div className="mt-1">v0.1 — Demo</div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6">
          <div>
            <div className="text-sm font-semibold tracking-tight text-foreground">ForensicLens</div>
            <div className="text-[11px] text-muted-foreground -mt-0.5">
              AI-assisted forensic case assessment workspace
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md border border-warning/40 bg-warning/10 px-2 py-1 text-[11px] font-medium text-foreground">
              <ShieldCheck className="h-3 w-3" /> Internal Demo Environment
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground">
              <Lock className="h-3 w-3" /> Controlled workspace
            </span>
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground text-[11px] font-semibold">
                RC
              </div>
              <div className="hidden sm:block text-xs">
                <div className="font-medium text-foreground leading-tight">Ravi Chauhan</div>
                <div className="text-muted-foreground leading-tight">Investigator</div>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}