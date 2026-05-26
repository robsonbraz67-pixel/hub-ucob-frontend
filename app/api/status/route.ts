// app/api/status/route.ts
// Verifica conectividade com a API FastAPI.
// Acesse /api/status no browser para diagnosticar problemas de conexão.

import { NextResponse } from 'next/server';

const UCOB_API_URL = process.env.UCOB_API_URL || 'http://localhost:8000';

export async function GET() {
  const result: Record<string, unknown> = {
    nextjs: 'ok',
    ucob_api_url: UCOB_API_URL,
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch(`${UCOB_API_URL}/status`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000), // timeout 5s
    });
    const data = await res.json();
    result.api_status = res.ok ? 'ok' : 'erro';
    result.api_response = data;
  } catch (error) {
    result.api_status = 'inacessível';
    result.api_error = String(error);
    result.solucao = [
      '1. Confirme que a API está rodando: uvicorn api:app --port 8000',
      '2. Confirme que UCOB_API_URL está correto no .env.local',
      '3. Se Railway: verifique se o deploy está ativo e a URL está correta',
    ];
  }

  return NextResponse.json(result, {
    status: result.api_status === 'ok' ? 200 : 502,
  });
}
