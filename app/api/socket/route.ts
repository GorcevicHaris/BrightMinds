// app/api/socket/route.ts
import { NextRequest } from 'next/server';
import { getSocketServer } from '@/lib/socket';

export async function GET(req: NextRequest) {
  try {
    const io = getSocketServer();
    
    return new Response(
      JSON.stringify({ 
        status: 'Socket server running',
        connected: io.sockets.sockets.size 
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Socket server not initialized' }),
      { status: 500 }
    );
  }
}