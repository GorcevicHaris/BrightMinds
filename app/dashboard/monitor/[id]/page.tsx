// app/dashboard/monitor/[id]/page.tsx
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import LiveMonitor from '@/app/components/LiveMonitor';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function MonitorPage({ params }: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await verifyToken();
  } catch {
    redirect('/login');
  }

  const childId = parseInt((await params).id, 10);

  // Proveri da li korisnik ima pristup ovom detetu
  const { data: accessRows } = await supabaseAdmin
    .from('user_children')
    .select('id')
    .eq('user_id', user.id)
    .eq('child_id', childId);

  if (!accessRows || accessRows.length === 0) {
    redirect('/dashboard');
  }

  // Uzmi podatke o detetu
  const { data: child } = await supabaseAdmin
    .from('children')
    .select('*')
    .eq('id', childId)
    .single();

  if (!child) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-2 sm:p-6">
      {/* Back Button */}
      <div className="w-full mb-4 sm:mb-6 px-2 sm:px-0">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
        >
          <ArrowLeft size={20} />
          Nazad na Dashboard
        </Link>
      </div>

      <LiveMonitor
        childId={child.id}
        childName={`${child.first_name} ${child.last_name}`}
      />
    </div>
  );
}