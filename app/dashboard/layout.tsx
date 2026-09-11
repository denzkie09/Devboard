import Sidebar from "../components/Sidebar";
import CommandPalette from "../components/CommandPalette";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <CommandPalette />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl p-8">{children}</div>
      </div>
    </div>
  );
}