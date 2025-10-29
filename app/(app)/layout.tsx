import Sidebar from '@/components/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:flex">
      <Sidebar />
      <div className="flex-1 min-h-screen">
        {children}
      </div>
    </div>
  );
}
