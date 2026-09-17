import { Sidebar } from "@/components/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row lg:items-stretch">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="mx-auto w-full max-w-[1200px] px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pb-16 lg:pt-8">{children}</div>
      </main>
    </div>
  );
}
