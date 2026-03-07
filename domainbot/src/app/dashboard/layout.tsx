import Navbar from "@/components/Navbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-0">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-60 left-1/3 h-[500px] w-[700px] rounded-full bg-brand-500/5 blur-[120px]" />
        <div className="absolute top-1/2 right-0 h-[300px] w-[400px] rounded-full bg-purple-500/4 blur-[100px]" />
      </div>

      <Navbar />

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-10">
        {children}
      </main>
    </div>
  );
}
