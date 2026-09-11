"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  GitBranch,
  Settings,
  Code2,
} from "lucide-react";
import { createClient } from "../../lib/supabase/client";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/dashboard/projects", icon: FolderKanban },
  { label: "Repositories", href: "/dashboard/repositories", icon: GitBranch },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border-color bg-surface">
      <div className="flex items-center gap-2 border-b border-border-color px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent">
          <Code2 size={18} className="text-accent-foreground" />
        </div>
        <span className="text-base font-semibold text-foreground">
          DevBoard
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-foreground-muted hover:bg-background hover:text-foreground"
              }`}
            >
              <item.icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border-color p-4">
        <div className="mb-3 flex items-center gap-2 rounded-md border border-border-color bg-background px-2.5 py-1.5">
          <span className="text-xs text-foreground-muted">Quick search</span>
          <kbd className="ml-auto rounded border border-border-color bg-surface px-1.5 py-0.5 text-[10px] font-medium text-foreground-muted">
            &#8984;K
          </kbd>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
            {email ? email[0].toUpperCase() : "?"}
          </div>
          <span className="truncate text-xs text-foreground-muted">
            {email ?? "Loading..."}
          </span>
        </div>
      </div>
    </aside>
  );
}