import Sidebar from "../components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl p-8">{children}</div>
      </div>
    </div>
  );
}