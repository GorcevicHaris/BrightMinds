import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import ProgressDashboard from '@/app/components/ProgressDashboard';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function ProgressPage({ params }: { params: Promise<{ id: string }> }) {
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
    <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        <ArrowLeft size={18} />
                        Nazad
                    </Link>
                    <h1 className="text-xl font-bold text-slate-900">
                        Statistika napretka: <span className="text-indigo-600">{child.first_name} {child.last_name}</span>
                    </h1>
                </div>
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <ProgressDashboard childId={child.id} childName={child.first_name} />
      </main>
    </div>
  );
}
