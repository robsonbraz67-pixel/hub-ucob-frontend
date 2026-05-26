// app/api/colportores/route.ts
// Proxy para o endpoint /colportores da API FastAPI do Hub UCOB Analytics.
// Retorna ColporteurSegment e DataIngresso vindos do Dados_Colportores.csv
// (necessários para Regra B — redução e Regra D — segmento).

import { NextResponse } from 'next/server';

const UCOB_API_URL = process.env.UCOB_API_URL || 'http://localhost:8000';

export async function GET() {
  try {
    const res = await fetch(`${UCOB_API_URL}/colportores`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`API respondeu com status ${res.status}`);
    }

    const data = await res.json();

    // Normaliza nomes dos campos para garantir compatibilidade com o frontend
    // A API retorna { total, colportores: [...], diagnostico: {...} }
    // O frontend espera { total, colportores: [...] }
    return NextResponse.json({
      total: data.total,
      colportores: data.colportores || [],
      // Repassa diagnóstico para facilitar debug no browser (Network tab)
      diagnostico: data.diagnostico || null,
    });

  } catch (error) {
    console.error('[UCOB] Erro ao buscar /colportores:', error);
    return NextResponse.json(
      {
        error: 'Não foi possível conectar à API UCOB.',
        detail: String(error),
        hint: `Verifique se UCOB_API_URL está correto: ${UCOB_API_URL}`,
        // Retorna lista vazia para não quebrar o frontend — redução será 0%
        total: 0,
        colportores: [],
      },
      { status: 502 }
    );
  }
}
