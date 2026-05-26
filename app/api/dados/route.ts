// app/api/dados/route.ts
// Proxy para a API FastAPI do Hub UCOB Analytics.
// Em desenvolvimento: define UCOB_API_URL=http://localhost:8000 no .env.local
// Em produção (AI Studio / Railway): configure UCOB_API_URL como variável de ambiente.

import { NextRequest, NextResponse } from 'next/server';

const UCOB_API_URL = process.env.UCOB_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    // Repassa query params (ano, mes, campo, colportor) para a API real
    const { searchParams } = new URL(request.url);
    const params = new URLSearchParams();
    ['ano', 'mes', 'campo', 'colportor'].forEach(k => {
      const v = searchParams.get(k);
      if (v) params.set(k, v);
    });

    const url = `${UCOB_API_URL}/dados${params.toString() ? '?' + params.toString() : ''}`;
    
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      // Sem cache — dados podem atualizar após reload do consolidated.json
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`API respondeu com status ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[UCOB] Erro ao buscar /dados:', error);
    return NextResponse.json(
      {
        error: 'Não foi possível conectar à API UCOB.',
        detail: String(error),
        hint: `Verifique se UCOB_API_URL está correto: ${UCOB_API_URL}`,
      },
      { status: 502 }
    );
  }
}
