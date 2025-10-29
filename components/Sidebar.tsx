import Link from 'next/link';

export default function Sidebar() {
  return (
    <aside className="h-screen w-64 border-r bg-white p-4 hidden md:block">
      <div className="font-bold text-lg mb-6">Client Portal</div>
      <nav className="space-y-2">
        <Link href="/dashboard" className="block px-2 py-1 rounded hover:bg-gray-100">Dashboard</Link>
        <Link href="/settings/billing" className="block px-2 py-1 rounded hover:bg-gray-100">Billing</Link>
      </nav>
    </aside>
  );
}
