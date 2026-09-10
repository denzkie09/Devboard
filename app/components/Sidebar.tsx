"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Projects", href: "/dashboard/projects" },
  { label: "Repositories", href: "/dashboard/repositories" },
  { label: "Settings", href: "/dashboard/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border-color bg-surface p-4">
      <span className="mb-6 text-lg font-semibold text-foreground">
        DevBoard
      </span>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive
                  ? "rounded-md px-3 py-2 text-sm bg-accent font-medium text-accent-foreground"
                  : "rounded-md px-3 py-2 text-sm text-foreground-muted hover:bg-background hover:text-foreground"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}