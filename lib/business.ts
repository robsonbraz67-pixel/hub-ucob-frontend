// lib/business.ts

import { SaleRecord, ColportorProfile } from './data-mock';

export interface AppConfig {
  p1: { livro: number; revista: number }; // Jan–Fev
  p2: { livro: number; revista: number }; // Mar–Dez
}

export const CONFIG_DEFAULTS: AppConfig = {
  p1: { livro: 110.61, revista: 152.88 },
  p2: { livro: 116.92, revista: 161.52 }
};

export function loadConfig(): AppConfig {
  if (typeof window === 'undefined') {
    return JSON.parse(JSON.stringify(CONFIG_DEFAULTS));
  }
  try {
    const raw = localStorage.getItem('ucob_config');
    if (raw) {
      const p = JSON.parse(raw);
      if (p && p.p1 && p.p2) return p;
    }
  } catch (e) {}
  return JSON.parse(JSON.stringify(CONFIG_DEFAULTS));
}

export function saveConfig(config: AppConfig, p1l: string, p1r: string, p2l: string, p2r: string): AppConfig {
  const updated = {
    p1: {
      livro: parseFloat(p1l) || CONFIG_DEFAULTS.p1.livro,
      revista: parseFloat(p1r) || CONFIG_DEFAULTS.p1.revista,
    },
    p2: {
      livro: parseFloat(p2l) || CONFIG_DEFAULTS.p2.livro,
      revista: parseFloat(p2r) || CONFIG_DEFAULTS.p2.revista,
    }
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('ucob_config', JSON.stringify(updated));
    } catch (e) {}
  }
  return updated;
}

// Jan–Fev = p1 · Mar–Dez = p2
export function getPeriodo(mes: string | number): 'p1' | 'p2' {
  const m = typeof mes === 'string' ? parseInt(mes, 10) : mes;
  return (m || 3) <= 2 ? 'p1' : 'p2';
}

// Produto com "Assinante" no nome = Revista. Todos os demais = Livro.
export function isRevista(produto: string): boolean {
  return (produto || '').toLowerCase().includes('assinante');
}

export const MES_TEXTO: Record<string, number> = {
  'janeiro': 1, 'fevereiro': 2, 'marco': 3, 'março': 3, 'abril': 4, 'maio': 5, 'junho': 6,
  'julho': 7, 'agosto': 8, 'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
};

export function mesTextoNum(s: string): number {
  const clean = (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return MES_TEXTO[clean] || 0;
}

// Retorna fator de redução: 0.0, 0.2 ou 0.4
// anoRef/mesRef = último mês do período selecionado
export function calcReducao(
  anoEntrada: number | null,
  mesEntrada: number | string | null,
  anoRef: string | number,
  mesRef: string | number
): number {
  if (!anoEntrada) return 0.0; // sem data = meta cheia
  const aRef = typeof anoRef === 'string' ? parseInt(anoRef, 10) : anoRef;
  const mRef = typeof mesRef === 'string' ? parseInt(mesRef, 10) : mesRef;
  const aEnt = anoEntrada;
  let mEnt = typeof mesEntrada === 'number' ? mesEntrada : mesTextoNum(mesEntrada || '');
  if (!mEnt) mEnt = 1;
  
  const mesesCasa = (aRef * 12 + mRef) - (aEnt * 12 + mEnt);
  const anos = mesesCasa / 12;
  if (anos >= 25) return 0.4;
  if (anos >= 15) return 0.2;
  return 0.0;
}

// Retorna número de unidades base para o cálculo da meta
export function baseCategoria(cat: string, info?: any): number {
  const c = (cat || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (info) {
    if (c.includes('credenciad')) return parseFloat(info.QuotaCredenciado || info.quotaCredenciado) || 75;
    if (c.includes('licenciad')) return parseFloat(info.QuotaLicenciado || info.quotaLicenciado) || 60;
    if (c.includes('aspiran')) return parseFloat(info.QuotaAspirante || info.quotaAspirante) || 30;
    if (c.includes('inician')) return parseFloat(info.QuotaAspirante || info.quotaAspirante || info.QuotaIniciante) || 30;
    if (info.Quota && parseFloat(info.Quota) > 0) return parseFloat(info.Quota);
    if (info.quota && parseFloat(info.quota) > 0) return parseFloat(info.quota);
  }
  if (c.includes('credenciad')) return 75;
  if (c.includes('licenciad')) return 60;
  return 30; // Aspirante, Iniciante, outros
}

// Retorna 'Livro' ou 'Revista'
export function segmentoColportor(info: any, bonLivro: number, bonRev: number): 'Livro' | 'Revista' {
  if (info && (info.ColporteurSegment || info.colporteursegment || info.segmento)) {
    const s = (info.ColporteurSegment || info.colporteursegment || info.segmento || '').toLowerCase();
    if (s.includes('revista') && !s.includes('livro')) return 'Revista';
    if (s.includes('livro') && !s.includes('revista')) return 'Livro';
  }
  return bonRev > bonLivro ? 'Revista' : 'Livro';
}

// Soma a meta mês a mês respeitando P1/P2 de cada mês
export function calcMetaAcum(
  baseCat: number,
  reducao: number,
  segmento: 'Livro' | 'Revista',
  mesesAtivos: string[],
  currentConfig: AppConfig
): number {
  return mesesAtivos.reduce((soma, m) => {
    const per = getPeriodo(m);
    const vlr = currentConfig[per][segmento === 'Revista' ? 'revista' : 'livro'];
    return soma + baseCat * (1 - reducao) * vlr;
  }, 0);
}

export function parseDates(dataArray: SaleRecord[]) {
  const reBR = /^(\d{2})\/(\d{2})\/(\d{4})/;
  dataArray.forEach((r: any) => {
    const m = ('' + r.Data).match(reBR);
    if (m) {
      r._ano = m[3];
      r._mes = String(parseInt(m[2], 10));
    } else {
      r._ano = null;
      r._mes = null;
    }
  });
}

// Extrai { ano, mes } do campo DataIngresso (MM/YYYY)
export function getIngressoInfo(info: any) {
  if (!info) return { ano: null as number | null, mes: 0 };
  const anoMax = new Date().getFullYear() + 1;
  const di = info.DataIngresso || info.dataingresso || info.data_ingresso || '';
  if (di && typeof di === 'string') {
    const parts = di.split('/');
    if (parts.length === 2) {
      const m = parseInt(parts[0], 10);
      const a = parseInt(parts[1], 10);
      if (a > 1900 && a <= anoMax && m >= 1 && m <= 12) {
        return { ano: a, mes: m };
      }
    }
  }
  const ano = parseInt(info.Ano || info.ANO || info.ano || '', 10);
  const mes = mesTextoNum(info['Mês'] || info['Mes'] || info['mes'] || '') || 1;
  if (ano > 1900 && ano <= anoMax) return { ano, mes };
  return { ano: null as number | null, mes: 0 };
}

// Um dot verde por mês em que realizado >= meta
export function calcCotas(
  colportorNome: string,
  colpInfo: any,
  salesData: SaleRecord[],
  ano: string,
  mesRefMax: string,
  currentConfig: AppConfig
) {
  const maxMesNum = parseInt(mesRefMax, 10) || 12;
  const meses = Array.from({ length: maxMesNum }, (_, i) => String(i + 1));

  const historico: Array<{ mes: string; bateu: boolean; realizado: number; meta: number }> = [];

  meses.forEach(m => {
    const dadosMes = salesData.filter(r => {
      return r.Colportor === colportorNome && (r as any)._ano === ano && (r as any)._mes === m;
    });

    if (!dadosMes.length) {
      historico.push({ mes: m, bateu: false, realizado: 0, meta: 0 });
      return;
    }

    let bonLivro = 0;
    let bonRev = 0;
    dadosMes.forEach(r => {
      const b = r['Vlr. Bonificado'] || 0;
      if (isRevista(r.Produto)) {
        bonRev += b;
      } else {
        bonLivro += b;
      }
    });

    const seg = segmentoColportor(colpInfo, bonLivro, bonRev);
    const per = getPeriodo(m);
    const vlrBase = currentConfig[per][seg === 'Revista' ? 'revista' : 'livro'];
    
    // Determine category
    const cat = colpInfo
      ? (colpInfo.ColporteurType || colpInfo.Categoria || colpInfo.categoria || '')
      : (dadosMes[0].Categoria || 'Iniciante');
    
    const ingresso = getIngressoInfo(colpInfo);
    const reducao = calcReducao(ingresso.ano, ingresso.mes, ano, m);
    const baseC = baseCategoria(cat, colpInfo);
    const meta = baseC * (1 - reducao) * vlrBase;
    
    const realizado = dadosMes.reduce((s, r) => s + (r['Vlr. Bonificado'] || 0), 0);

    historico.push({
      mes: m,
      bateu: realizado >= meta,
      realizado,
      meta
    });
  });

  return {
    cotas: historico.filter(h => h.bateu).length,
    historico
  };
}

// Base de referência = semestre (6 meses)
// Metas semestrais: Iniciante=3, todos os demais=5
// Proporção: (metaSemestral / 6) * nMeses
export function calcMetaCotasProp(cat: string, nMeses: number): number {
  const c = (cat || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const metaSem = c.includes('inician') ? 3 : 5;
  return (metaSem / 6) * nMeses;
}

export const CAT_HIER = [
  { key: 'iniciante', label: 'Iniciante', base: 30 },
  { key: 'aspirante', label: 'Aspirante', base: 30 },
  { key: 'licenciado', label: 'Licenciado', base: 60 },
  { key: 'credenciado', label: 'Credenciado', base: 75 }
];

export function catKey(cat: string): 'iniciante' | 'aspirante' | 'licenciado' | 'credenciado' {
  const c = (cat || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (c.includes('credenci')) return 'credenciado';
  if (c.includes('licenci')) return 'licenciado';
  if (c.includes('aspir')) return 'aspirante';
  return 'iniciante';
}

export interface ProgressResult {
  status: 'sobe' | 'subindo' | 'manteve' | 'risco';
  msg: string;
  pct: number;
  proxima: string | null;
  faltaSubir: number | null;
  faltaManter: number;
  cls: 'ok' | 'warn' | 'risk';
  sugerePrev?: string | null;
}

export function calcCatProgresso(
  bonAcum: number,
  cat: string,
  reducao: number,
  segmento: 'Livro' | 'Revista',
  mesesAtivos: string[],
  currentConfig: AppConfig
): ProgressResult {
  const currentKey = catKey(cat);
  const idx = CAT_HIER.findIndex(c => c.key === currentKey);
  const info = CAT_HIER[idx === -1 ? 0 : idx];
  const proxCat = idx !== -1 && idx < CAT_HIER.length - 1 ? CAT_HIER[idx + 1] : null;
  const prevCat = idx > 0 ? CAT_HIER[idx - 1] : null;

  const metaManter = calcMetaAcum(info.base, reducao, segmento, mesesAtivos, currentConfig);
  const metaSubir = proxCat ? calcMetaAcum(proxCat.base, reducao, segmento, mesesAtivos, currentConfig) : null;

  const pctManter = metaManter > 0 ? Math.min(bonAcum / metaManter, 1) : 1;
  const pctSubir = metaSubir && metaSubir > 0 ? Math.min(bonAcum / metaSubir, 1) : null;

  const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Iniciante: meta é subir para Aspirante
  if (info.key === 'iniciante') {
    const metaAsp = calcMetaAcum(CAT_HIER[1].base, reducao, segmento, mesesAtivos, currentConfig);
    const pAsp = metaAsp > 0 ? Math.min(bonAcum / metaAsp, 1) : 0;
    if (bonAcum >= metaAsp) {
      return {
        status: 'sobe',
        msg: '✓ Pronto para Aspirante',
        pct: pAsp,
        proxima: 'Aspirante',
        faltaSubir: 0,
        faltaManter: 0,
        cls: 'ok'
      };
    }
    return {
      status: 'subindo',
      msg: `Faltam R$ ${fmt(metaAsp - bonAcum)} para Aspirante`,
      pct: pAsp,
      proxima: 'Aspirante',
      faltaSubir: metaAsp - bonAcum,
      faltaManter: 0,
      cls: 'warn'
    };
  }

  // Credenciado (topo)
  if (info.key === 'credenciado') {
    if (bonAcum >= metaManter) {
      return {
        status: 'manteve',
        msg: '✓ Categoria mantida',
        pct: pctManter,
        proxima: null,
        faltaSubir: null,
        faltaManter: 0,
        cls: 'ok'
      };
    }
    return {
      status: 'risco',
      msg: `⚠ Risco · faltam R$ ${fmt(metaManter - bonAcum)} para manter`,
      pct: pctManter,
      proxima: null,
      faltaSubir: null,
      faltaManter: metaManter - bonAcum,
      cls: 'risk',
      sugerePrev: prevCat ? prevCat.label : null
    };
  }

  // Intermediários
  const faltaManter = Math.max(metaManter - bonAcum, 0);
  const faltaSubir = metaSubir ? Math.max(metaSubir - bonAcum, 0) : null;

  if (bonAcum < metaManter) {
    return {
      status: 'risco',
      msg: `⚠ Risco · faltam R$ ${fmt(faltaManter)} para manter ${info.label}`,
      pct: pctManter,
      proxima: proxCat ? proxCat.label : null,
      faltaSubir: faltaSubir,
      faltaManter: faltaManter,
      cls: 'risk',
      sugerePrev: prevCat ? prevCat.label : null
    };
  }

  if (metaSubir && bonAcum >= metaSubir) {
    return {
      status: 'sobe',
      msg: `✓ Pode subir para ${proxCat?.label || ''}`,
      pct: pctSubir || 1,
      proxima: proxCat?.label || null,
      faltaSubir: 0,
      faltaManter: 0,
      cls: 'ok'
    };
  }

  return {
    status: 'manteve',
    msg: `✓ Mantido · faltam R$ ${fmt(faltaSubir || 0)} para ${proxCat?.label}`,
    pct: pctSubir || pctManter,
    proxima: proxCat ? proxCat.label : null,
    faltaSubir: faltaSubir,
    faltaManter: 0,
    cls: 'warn'
  };
}

export function _normNome(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Busca colportor
export function getColpInfo(nome: string, colportores: ColportorProfile[]): ColportorProfile | null {
  const chave = _normNome(nome);
  // Match exato normalizado
  const exact = colportores.find(c => _normNome(c.colportor) === chave);
  if (exact) return exact;

  // Match parcial por inclusão
  for (const c of colportores) {
    const n = _normNome(c.colportor);
    if (n && chave && (n.includes(chave) || chave.includes(n))) {
      return c;
    }
  }
  return null;
}

// Agregado de vendas
export function aggColpMetas(nome: string, rows: SaleRecord[], info: any) {
  let bonLivro = 0;
  let bonRev = 0;
  let qtdTotal = 0;
  let bonTotal = 0;
  let liq = 0;

  rows.forEach(r => {
    const b = r['Vlr. Bonificado'] || 0;
    const q = r['Qtd. Vendas'] || 0;
    bonTotal += b;
    qtdTotal += q;
    liq += r['Vlr. Vend. Líq.'] || 0;
    if (isRevista(r.Produto)) {
      bonRev += b;
    } else {
      bonLivro += b;
    }
  });

  const segmento = segmentoColportor(info, bonLivro, bonRev);
  const ticket = qtdTotal > 0 ? bonTotal / qtdTotal : 0;

  return {
    bonTotal,
    bonLivro,
    bonRev,
    qtdTotal,
    liq,
    segmento,
    ticket,
    pctLivro: bonTotal > 0 ? bonLivro / bonTotal : 0,
    pctRev: bonTotal > 0 ? bonRev / bonTotal : 0
  };
}

// Formatador moeda PT-BR
export function fmtM(v: number): string {
  return 'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function sortedUniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr)).sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
}

export const MESES_NOME = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export const MESES_FULL = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
