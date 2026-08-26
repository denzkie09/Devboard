export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight">DevBoard</h1>
      <p className="max-w-md text-neutral-500">
        A developer productivity dashboard for managing projects, tasks, and GitHub activity in one place.
      </p>
      
      <a
        href="/dashboard"
        className="rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Go to Dashboard
      </a>
    </main>
  );
}