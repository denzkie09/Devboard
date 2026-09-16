"use client";

import { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  GitBranch,
  Settings,
  LogOut,
  Plus,
  School,
} from "lucide-react";
import { getProjects, type Project } from "../../lib/Projects";
import { createClient } from "../../lib/supabase/client";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const router = useRouter();

  // Toggle with Cmd+K / Ctrl+K from anywhere
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Load projects fresh each time the palette opens
  useEffect(() => {
    if (open) {
      getProjects()
        .then(setProjects)
        .catch(() => setProjects([]));
    }
  }, [open]);

  const runCommand = useCallback((action: () => void) => {
    setOpen(false);
    action();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      className="fixed left-1/2 top-24 z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-lg border border-border-color bg-surface shadow-2xl"
    >
      <div className="flex items-center border-b border-border-color px-3">
        <Command.Input
          autoFocus
          placeholder="Type a command or search projects..."
          className="w-full bg-transparent px-2 py-3 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none"
        />
      </div>

      <Command.List className="max-h-80 overflow-y-auto p-2">
        <Command.Empty className="px-3 py-6 text-center text-sm text-foreground-muted">
          No results found.
        </Command.Empty>

        <Command.Group
          heading="Navigate"
          className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-foreground-muted"
        >
          <Command.Item
            onSelect={() => runCommand(() => router.push("/dashboard"))}
            className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
          >
            <LayoutDashboard size={16} />
            Go to Dashboard
          </Command.Item>
          <Command.Item
            onSelect={() =>
              runCommand(() => router.push("/dashboard/projects"))
            }
            className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
          >
            <FolderKanban size={16} />
            Go to Projects
          </Command.Item>
          <Command.Item
            onSelect={() =>
              runCommand(() => router.push("/dashboard/classroom"))
            }
            className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
          >
            <School size={16} />
            Go to Classroom
          </Command.Item>
          <Command.Item
            onSelect={() =>
              runCommand(() => router.push("/dashboard/repositories"))
            }
            className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
          >
            <GitBranch size={16} />
            Go to Repositories
          </Command.Item>
          <Command.Item
            onSelect={() =>
              runCommand(() => router.push("/dashboard/settings"))
            }
            className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
          >
            <Settings size={16} />
            Go to Settings
          </Command.Item>
        </Command.Group>

        <Command.Group
          heading="Actions"
          className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-foreground-muted"
        >
          <Command.Item
            onSelect={() =>
              runCommand(() =>
                router.push("/dashboard/projects?new=true")
              )
            }
            className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
          >
            <Plus size={16} />
            New project
          </Command.Item>
          <Command.Item
            onSelect={() => runCommand(handleLogout)}
            className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-danger data-[selected=true]:bg-danger data-[selected=true]:text-white"
          >
            <LogOut size={16} />
            Log out
          </Command.Item>
        </Command.Group>

        {projects.length > 0 && (
          <Command.Group
            heading="Projects"
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-foreground-muted"
          >
            {projects.map((project) => (
              <Command.Item
                key={project.id}
                value={project.name}
                onSelect={() =>
                  runCommand(() =>
                    router.push(`/dashboard/projects/${project.id}`)
                  )
                }
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
              >
                <FolderKanban size={16} />
                {project.name}
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  );
}