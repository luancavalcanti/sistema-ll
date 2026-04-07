import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: "Conexão com a API Cron funcionando!", 
    timestamp: new Date().toISOString() 
  });
}