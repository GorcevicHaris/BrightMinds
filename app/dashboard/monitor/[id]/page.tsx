// app/dashboard/monitor/[id]/page.tsx
import { verifyToken } from '@/lib/auth';
import pool from '@/lib/db';
import LiveMonitor from '@/app/components/LiveMonitor';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { RowDataPacket } from 'mysql2';

interface Child extends RowDataPacket {
  id: number;
  first_name: string;
  last_name: string;
}

export default async function MonitorPage({ params }: { params: { id: string } }) {
  let user;
  try {
    user = await verifyToken();
  } catch {
    redirect('/login');
  }

  const childId = parseInt((await params).id);

  // Proveri da li korisnik ima pristup ovom detetu
  const [accessRows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM user_children WHERE user_id = ? AND child_id = ?',
    [user.id, childId]
  );

  if (accessRows.length === 0) {
    redirect('/dashboard');
  }

  // Uzmi podatke o detetu
  const [children] = await pool.query<Child[]>(
    'SELECT * FROM children WHERE id = ?',
    [childId]
  );

  if (children.length === 0) {
    redirect('/dashboard');
  }

  const child = children[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      {/* Back Button */}
      <div className="max-w-4xl mx-auto mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
        >
          <ArrowLeft size={20} />
          Nazad na Dashboard
        </Link>
      </div>

      {/* Monitor Component */}
      <LiveMonitor
        childId={child.id}
        childName={`${child.first_name} ${child.last_name}`}
      />
    </div>
  );
}