import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:flex">
      <Sidebar />
      <div className="flex-1 min-h-screen">
        <MobileNav />
        {children}
      </div>
    </div>
  );
}
