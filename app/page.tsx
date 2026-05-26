// app/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  motion, 
  AnimatePresence 
} from 'motion/react';
import { 
  TrendingUp, 
  Users, 
  Target, 
  Award, 
  SlidersHorizontal, 
  UploadCloud, 
  RotateCcw, 
  Search, 
  Settings, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  ArrowUpRight, 
  Calculator, 
  Check, 
  FileSpreadsheet,
  X,
  Info,
  Calendar
} from 'lucide-react';
import { 
  SaleRecord, 
  ColportorProfile 
} from '@/lib/data-mock';
import {
  AppConfig,
  CONFIG_DEFAULTS,
  loadConfig,
  saveConfig,
  parseDates,
  getPeriodo,
  isRevista,
  calcReducao,
  baseCategoria,
  segmentoColportor,
  calcMetaAcum,
  calcCotas,
  calcMetaCotasProp,
  calcCatProgresso,
  getColpInfo,
  aggColpMetas,
  getIngressoInfo,
  sortedUniq,
  fmtM,
  MESES_NOME,
  MESES_FULL,
  catKey,
  CAT_HIER,
  _normNome
} from '@/lib/business';

export default function Dashboard() {
  // ── Estado de carregamento ──
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>('');

  // ── Dados vindos da API ──
  const [salesList, setSalesList] = useState<SaleRecord[]>([]);
  const [colportoresList, setColportoresList] = useState<ColportorProfile[]>([]);
  const [config, setConfig] = useState<AppConfig>(() => loadConfig());
  
  // Filtros Globais / Abas
  const [activeTab, setActiveTab] = useState<'ranking' | 'metas' | 'colportores'>('ranking');
  const [selectedYear, setSelectedYear] = useState<string>('2025');
  const [selectedCampo, setSelectedCampo] = useState<string>('ABC');
  const [selectedTipo, setSelectedTipo] = useState<string>('Permanente');
  const [periodoRapido, setPeriodoRapido] = useState<'s1' | 's2' | 'anual'>('s1');
  const [selectedSingleMonth, setSelectedSingleMonth] = useState<string>(''); // Vazio = Período Rápido

  // Seleção de Colportor na aba Individual
  const [selectedColpName, setSelectedColpName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState<boolean>(false);

  // Modais e Painéis
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showDiagPanel, setShowDiagPanel] = useState<boolean>(false);

  // Form de Configuração
  const [p1LivroInput, setP1LivroInput] = useState<string>(() => String(loadConfig().p1.livro));
  const [p1RevistaInput, setP1RevistaInput] = useState<string>(() => String(loadConfig().p1.revista));
  const [p2LivroInput, setP2LivroInput] = useState<string>(() => String(loadConfig().p2.livro));
  const [p2RevistaInput, setP2RevistaInput] = useState<string>(() => String(loadConfig().p2.revista));

  // Form de Upload de dados customizados
  const [uploadSalesRaw, setUploadSalesRaw] = useState<string>('');
  const [uploadColpRaw, setUploadColpRaw] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string>('');

  // Sorter para Rankings
  const [rankingSortBy, setRankingSortBy] = useState<'bonTotal' | 'liq' | 'qtd'>('bonTotal');
  const [rankingGroupByField, setRankingGroupByField] = useState<boolean>(false);



  // ── Carregamento da API ao montar ──
  useEffect(() => {
    async function loadFromAPI() {
      setIsLoading(true);
      setLoadError('');
      try {
        const [dadosRes, colpRes] = await Promise.all([
          fetch('/api/dados'),
          fetch('/api/colportores'),
        ]);

        if (!dadosRes.ok) throw new Error(`/api/dados retornou ${dadosRes.status}`);
        if (!colpRes.ok)  throw new Error(`/api/colportores retornou ${colpRes.status}`);

        const dadosJson = await dadosRes.json();
        const colpJson  = await colpRes.json();

        const registros: SaleRecord[] = dadosJson.registros || [];
        parseDates(registros);
        setSalesList(registros);

        const colportores: ColportorProfile[] = colpJson.colportores || [];
        setColportoresList(colportores);

        // Seleciona primeiro colportor disponível
        if (colportores.length > 0 && !selectedColpName) {
          setSelectedColpName(colportores[0].colportor);
        }

        // Log de diagnóstico no console (equivalente ao diagColp do HTML)
        const semDataIngresso = colportores.filter(c => !c.DataIngresso).length;
        console.log('[UCOB] Dados carregados:', registros.length, 'registros,', colportores.length, 'colportores');
        if (semDataIngresso > 0) {
          console.warn('[UCOB]', semDataIngresso, 'colportores sem DataIngresso — redução será 0%');
        }
        if (dadosJson.diagnostico) {
          console.log('[UCOB] Diagnóstico API:', dadosJson.diagnostico);
        }

      } catch (err: any) {
        console.error('[UCOB] Erro ao carregar dados:', err);
        setLoadError(
          `Não foi possível conectar à API UCOB. Verifique se a API está rodando e se UCOB_API_URL está configurado corretamente.\n\nDetalhe: ${err.message}\n\nAcesse /api/status para diagnóstico.`
        );
      } finally {
        setIsLoading(false);
      }
    }
    loadFromAPI();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recarrega dados da API (usado no botão "Restaurar")
  const handleReloadFromAPI = async () => {
    setIsLoading(true);
    setLoadError('');
    setUploadSuccessMsg('');
    try {
      const [dadosRes, colpRes] = await Promise.all([
        fetch('/api/dados'),
        fetch('/api/colportores'),
      ]);
      const dadosJson = await dadosRes.json();
      const colpJson  = await colpRes.json();
      const registros: SaleRecord[] = dadosJson.registros || [];
      parseDates(registros);
      setSalesList(registros);
      const colportores: ColportorProfile[] = colpJson.colportores || [];
      setColportoresList(colportores);
      if (colportores.length > 0) setSelectedColpName(colportores[0].colportor);
      setUploadSuccessMsg('Dados recarregados da API com sucesso!');
    } catch (err: any) {
      setLoadError(`Erro ao recarregar: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Diagnóstico em tempo real (Regra 8)
  const diagnostics = useMemo(() => {
    if (!salesList.length || !colportoresList.length) return null;

    let comDataIngresso = 0;
    const semMatchCSV: string[] = [];

    const colportorNamesInSales = sortedUniq(salesList.map(s => s.Colportor));

    colportorNamesInSales.forEach(name => {
      const match = getColpInfo(name, colportoresList);
      if (match) {
        if (match.DataIngresso) comDataIngresso++;
      } else {
        semMatchCSV.push(name);
      }
    });

    // Exemplo de diagnóstico no console (Regra 8)
    const exemploColp = colportoresList[0];
    const exemploIngresso = getIngressoInfo(exemploColp);
    const exemploReducao = calcReducao(exemploIngresso.ano, exemploIngresso.mes, 2026, 5);

    console.log(`[DIAG] Campos do INJECTED_COLP (primeiro registro):`, Object.keys(exemploColp));
    console.log(`[DIAG] Total registros INJECTED_COLP: ${colportoresList.length}`);
    console.log(`[DIAG] Com DataIngresso: ${comDataIngresso} | Sem match CSV: ${semMatchCSV.length}`);
    if (comDataIngresso > 0) {
      console.log(`[DIAG] ${exemploColp.colportor} → DataIngresso: ${exemploColp.DataIngresso} → ano: ${exemploIngresso.ano} · mes: ${exemploIngresso.mes} → reducao: ${exemploReducao * 100}% → segmento: ${exemploColp.ColporteurSegment || 'Mix Real'}`);
    }

    return {
      comDataIngresso,
      semMatchTotal: semMatchCSV.length,
      semMatchLista: semMatchCSV,
      totalColportoresBanco: colportoresList.length
    };
  }, [salesList, colportoresList]);

  // Lista de anos, campos e tipos únicos para popular filtros dinamicamente
  const filtersOptions = useMemo(() => {
    const anos = sortedUniq(salesList.filter(s => (s as any)._ano).map(s => (s as any)._ano));
    const campos = sortedUniq(salesList.map(s => s.Campo));
    const tipos = sortedUniq(salesList.map(s => s.Tipo));
    
    return {
      anos: anos.length ? anos : ['2025', '2026'],
      campos: campos.length ? campos : ['ABC', 'DEF', 'GHI'],
      tipos: tipos.length ? tipos : ['Permanente', 'Estudante']
    };
  }, [salesList]);

  // Lista de meses ativos no período selecionado (Regra 4)
  const mesesAtivosList = useMemo((): string[] => {
    if (selectedSingleMonth) {
      return [selectedSingleMonth];
    }
    if (periodoRapido === 's1') {
      return ['1', '2', '3', '4', '5', '6'];
    }
    if (periodoRapido === 's2') {
      return ['7', '8', '9', '10', '11', '12'];
    }
    return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  }, [periodoRapido, selectedSingleMonth]);

  // Vendas já pré-filtradas por Ano e Tipo
  const filteredSalesBase = useMemo(() => {
    return salesList.filter(s => {
      const matchAno = (s as any)._ano === selectedYear;
      const matchTipo = s.Tipo === selectedTipo;
      const matchMonth = mesesAtivosList.includes((s as any)._mes);
      return matchAno && matchTipo && matchMonth;
    });
  }, [salesList, selectedYear, selectedTipo, mesesAtivosList]);

  // ----------------------------------------------------
  // COMPUTANDO METRICAS: ABA RANKING
  // ----------------------------------------------------
  const rankingData = useMemo(() => {
    if (rankingGroupByField) {
      // Agrupado por Campo
      const camposSet: Record<string, { campo: string; bonTotal: number; liq: number; qtd: number; colAtivos: Set<string>; assinantes: number }> = {};
      filteredSalesBase.forEach(s => {
        if (!camposSet[s.Campo]) {
          camposSet[s.Campo] = {
            campo: s.Campo,
            bonTotal: 0,
            liq: 0,
            qtd: 0,
            colAtivos: new Set<string>(),
            assinantes: 0
          };
        }
        camposSet[s.Campo].bonTotal += s['Vlr. Bonificado'];
        camposSet[s.Campo].liq += s['Vlr. Vend. Líq.'];
        camposSet[s.Campo].qtd += s['Qtd. Vendas'];
        camposSet[s.Campo].colAtivos.add(s.Colportor);
        if ((s.Produto || '').toLowerCase().includes('assinante')) {
          camposSet[s.Campo].assinantes += s['Qtd. Vendas'];
        }
      });

      return Object.values(camposSet).sort((a, b) => b[rankingSortBy] - a[rankingSortBy]);
    } else {
      // Agrupado por Colportor
      const colSet: Record<string, { colportor: string; campo: string; bonTotal: number; liq: number; qtd: number; categoria: string; segmento: string }> = {};
      
      filteredSalesBase.forEach(s => {
        if (!colSet[s.Colportor]) {
          const profile = getColpInfo(s.Colportor, colportoresList);
          colSet[s.Colportor] = {
            colportor: s.Colportor,
            campo: s.Campo,
            bonTotal: 0,
            liq: 0,
            qtd: 0,
            categoria: profile ? (profile.categoria) : s.Categoria,
            segmento: profile?.ColporteurSegment || 'Mix Real'
          };
        }
        colSet[s.Colportor].bonTotal += s['Vlr. Bonificado'];
        colSet[s.Colportor].liq += s['Vlr. Vend. Líq.'];
        colSet[s.Colportor].qtd += s['Qtd. Vendas'];
      });

      return Object.values(colSet).sort((a, b) => b[rankingSortBy] - a[rankingSortBy]);
    }
  }, [filteredSalesBase, colportoresList, rankingGroupByField, rankingSortBy]);

  // Três primeiros para pódio no Rank
  const podiumData = useMemo(() => {
    return rankingData.slice(0, 3);
  }, [rankingData]);

  // ----------------------------------------------------
  // COMPUTANDO METRICAS: ABA METAS E COTAS (CAMPO ATIVO)
  // ----------------------------------------------------
  const metasDashboardData = useMemo(() => {
    // Registros específicos do campo selecionado
    const salesNoCampo = filteredSalesBase.filter(s => s.Campo === selectedCampo);
    // Nomes de colportores ativos no campo selecionado
    const colportoresAtivos = sortedUniq(salesNoCampo.map(s => s.Colportor));

    // Totais globais do Campo
    let totalBonificado = 0;
    let totalLiquido = 0;
    let totalVendido = 0;
    let totalAssinantes = 0;

    salesNoCampo.forEach(s => {
      totalBonificado += s['Vlr. Bonificado'];
      totalLiquido += s['Vlr. Vend. Líq.'];
      totalVendido += s['Qtd. Vendas'];
      if ((s.Produto || '').toLowerCase().includes('assinante')) {
        totalAssinantes += s['Qtd. Vendas'];
      }
    });

    // Detalhamento individual dos colportores do Campo
    const colportoresAnalyzed = colportoresAtivos.map(nome => {
      const info = getColpInfo(nome, colportoresList);
      const rowsDele = salesNoCampo.filter(s => s.Colportor === nome);

      // Agrega valores básicos (Regra E)
      const agg = aggColpMetas(nome, rowsDele, info);

      // Metas Financeiras (Regras B, C, D)
      const ingresso = getIngressoInfo(info);
      const ultMesAtivo = mesesAtivosList[mesesAtivosList.length - 1] || '12';
      const reducao = calcReducao(ingresso.ano, ingresso.mes, selectedYear, ultMesAtivo);
      
      const cat = info ? (info.categoria) : (rowsDele[0]?.Categoria || 'Iniciante');
      const baseUnidades = baseCategoria(cat, info);

      const metaFinanceira = calcMetaAcum(baseUnidades, reducao, agg.segmento, mesesAtivosList, config);
      const percentualMeta = metaFinanceira > 0 ? (agg.bonTotal / metaFinanceira) : 1;

      // Status de Metas (Regra A - Avaliação 2)
      // Dot verde por cada mês vencido
      const cotasObj = calcCotas(nome, info, salesList, selectedYear, ultMesAtivo, config);

      // Avaliação de Promoção / Risco (Regra A - Avaliação 2)
      const progresso = calcCatProgresso(agg.bonTotal, cat, reducao, agg.segmento, mesesAtivosList, config);

      return {
        nome,
        info,
        vendasQtd: agg.qtdTotal,
        bonTotal: agg.bonTotal,
        liqTotal: agg.liq,
        ticketMedio: agg.ticket,
        segmento: agg.segmento,
        categoria: cat,
        reducaoPct: reducao,
        metaFinanceira,
        percentualMeta,
        cotasBatidas: cotasObj.cotas,
        cotasHistorico: cotasObj.historico,
        historicoObj: cotasObj,
        progresso
      };
    }).sort((a, b) => b.bonTotal - a.bonTotal);

    return {
      totalBonificado,
      totalLiquido,
      totalVendido,
      totalAssinantes,
      totalOutros: totalVendido - totalAssinantes,
      colportores: colportoresAnalyzed
    };
  }, [filteredSalesBase, selectedCampo, colportoresList, selectedYear, mesesAtivosList, config, salesList]);

  // Autocomplete suggestions
  const colportoresSuggestions = useMemo(() => {
    if (!searchQuery) return colportoresList;
    const q = _normNome(searchQuery);
    return colportoresList.filter(c => _normNome(c.colportor).includes(q));
  }, [colportoresList, searchQuery]);

  // ----------------------------------------------------
  // COMPUTANDO METRICAS: ABA COLPORTOR INDIVIDUAL
  // ----------------------------------------------------
  const colpIndividualData = useMemo(() => {
    const nome = selectedColpName;
    const info = getColpInfo(nome, colportoresList);
    
    // Vendas gerais desse colportor no ano selecionado
    const todasVendasNoAno = salesList.filter(s => s.Colportor === nome && (s as any)._ano === selectedYear);
    // Filtradas pelo período selecionado
    const vendasNoPeriodo = todasVendasNoAno.filter(s => mesesAtivosList.includes((s as any)._mes));

    const agg = aggColpMetas(nome, vendasNoPeriodo, info);
    
    const cat = info ? (info.categoria) : (vendasNoPeriodo[0]?.Categoria || 'Iniciante');
    const baseUnidades = baseCategoria(cat, info);
    const ingresso = getIngressoInfo(info);
    
    // Último mês do período
    const ultMesAtivo = mesesAtivosList[mesesAtivosList.length - 1] || '12';
    const reducao = calcReducao(ingresso.ano, ingresso.mes, selectedYear, ultMesAtivo);

    const metaFinAcumulada = calcMetaAcum(baseUnidades, reducao, agg.segmento, mesesAtivosList, config);
    const percentualMeta = metaFinAcumulada > 0 ? (agg.bonTotal / metaFinAcumulada) : 1;

    // Cálculo das cotas mês a mês
    const cotasData = calcCotas(nome, info, salesList, selectedYear, ultMesAtivo, config);

    // Meta proporcional de cotas para o indicador velocímetro
    // (metaSemestral / 6) * n_meses
    const metaCotasProp = calcMetaCotasProp(cat, mesesAtivosList.length);
    const cotasMetasPct = metaCotasProp > 0 ? (cotasData.cotas / metaCotasProp) : 1;

    // Progresso de categoria
    const progresso = calcCatProgresso(agg.bonTotal, cat, reducao, agg.segmento, mesesAtivosList, config);

    // Detalhamento de compras por produto
    const comprasAgrupadas: Record<string, { produto: string; qtd: number; bonTotal: number; liq: number; isRev: boolean }> = {};
    vendasNoPeriodo.forEach(v => {
      if (!comprasAgrupadas[v.Produto]) {
        comprasAgrupadas[v.Produto] = {
          produto: v.Produto,
          qtd: 0,
          bonTotal: 0,
          liq: 0,
          isRev: isRevista(v.Produto)
        };
      }
      comprasAgrupadas[v.Produto].qtd += v['Qtd. Vendas'];
      comprasAgrupadas[v.Produto].bonTotal += v['Vlr. Bonificado'];
      comprasAgrupadas[v.Produto].liq += v['Vlr. Vend. Líq.'];
    });

    // Gráfico mensal (Bonificado vs Meta) — construído para o array completo de meses ativos
    const mensalChartData = mesesAtivosList.map(m => {
      const vendasDoMes = todasVendasNoAno.filter(s => (s as any)._mes === m);
      const bon = vendasDoMes.reduce((s, r) => s + (r['Vlr. Bonificado'] || 0), 0);
      const r_bonLivro = vendasDoMes.filter(r => !isRevista(r.Produto)).reduce((s, r) => s + (r['Vlr. Bonificado'] || 0), 0);
      const r_bonRev = vendasDoMes.filter(r => isRevista(r.Produto)).reduce((s, r) => s + (r['Vlr. Bonificado'] || 0), 0);
      
      const segMes = segmentoColportor(info, r_bonLivro, r_bonRev);
      const redMes = calcReducao(ingresso.ano, ingresso.mes, selectedYear, m);
      const metaMes = baseUnidades * (1 - redMes) * config[getPeriodo(m)][segMes === 'Revista' ? 'revista' : 'livro'];

      return {
        mes: m,
        mesNome: MESES_NOME[parseInt(m, 10)] || m,
        bonificado: bon,
        meta: metaMes
      };
    });

    return {
      nome,
      info,
      cat,
      baseUnidades,
      reducao,
      segmento: agg.segmento,
      ticket: agg.ticket,
      vendasQtd: agg.qtdTotal,
      bonTotal: agg.bonTotal,
      liqTotal: agg.liq,
      metaFinAcumulada,
      percentualMeta,
      cotasBatidas: cotasData.cotas,
      metaCotasProp,
      cotasMetasPct,
      cotasHistorico: cotasData.historico,
      progresso,
      compras: Object.values(comprasAgrupadas).sort((a,b) => b.bonTotal - a.bonTotal),
      mensalChartData
    };
  }, [selectedColpName, colportoresList, selectedYear, mesesAtivosList, salesList, config]);

  // ----------------------------------------------------
  // AÇÕES E HANDLERS
  // ----------------------------------------------------
  
  // Salvar quotas P1/P2
  const handleSaveConfig = () => {
    const updated = saveConfig(
      config,
      p1LivroInput,
      p1RevistaInput,
      p2LivroInput,
      p2RevistaInput
    );
    setConfig(updated);
    setShowConfigModal(false);
  };

  // Resetar configurações para os valores de fábrica
  const handleResetConfig = () => {
    localStorage.removeItem('ucob_config');
    setConfig(JSON.parse(JSON.stringify(CONFIG_DEFAULTS)));
    setP1LivroInput(String(CONFIG_DEFAULTS.p1.livro));
    setP1RevistaInput(String(CONFIG_DEFAULTS.p1.revista));
    setP2LivroInput(String(CONFIG_DEFAULTS.p2.livro));
    setP2RevistaInput(String(CONFIG_DEFAULTS.p2.revista));
  };

  // Processar importação customizada de dados (Vendas e Perfis)
  const handleDataImport = () => {
    setUploadError('');
    setUploadSuccessMsg('');

    try {
      let parsedSales: SaleRecord[] = [];
      let parsedColp: ColportorProfile[] = [];

      // Caso o usuário cole JSON diretamente para Vendas
      if (uploadSalesRaw.trim()) {
        const cleaned = uploadSalesRaw.trim();
        if (cleaned.startsWith('[') || cleaned.startsWith('{')) {
          const contents = JSON.parse(cleaned);
          parsedSales = Array.isArray(contents) ? contents : [contents];
        } else {
          // Parse simples de CSV
          const lines = cleaned.split('\n');
          const headers = lines[0].split(/[;,]/).map(h => h.trim().replace(/^"|"$/g, ''));
          
          for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = lines[i].split(/[;,]/).map(v => v.trim().replace(/^"|"$/g, ''));
            const row: any = {};
            headers.forEach((h, index) => {
              row[h] = values[index];
            });

            parsedSales.push({
              Data: row.Data || row.data || '',
              Colportor: row.Colportor || row.colportor || '',
              Campo: row.Campo || row.campo || '',
              Tipo: (row.Tipo || row.tipo || 'Permanente') as any,
              Categoria: (row.Categoria || row.categoria || 'Licenciado') as any,
              Produto: row.Produto || row.produto || '',
              'Qtd. Vendas': parseInt(row['Qtd. Vendas'] || row['Qtd.Vendas'] || row.qtd || '1', 10),
              'Vlr. Bonificado': parseFloat(row['Vlr. Bonificado'] || row['Vlr.Bonificado'] || row.bonificado || '0'),
              'Vlr. Vend. Líq.': parseFloat(row['Vlr. Vend. Líq.'] || row['Vlr.Vend.Liq.'] || row.liquido || '0'),
              CostCenterCode: row.CostCenterCode || '133411',
              CostCenterName: row.CostCenterName || 'Publicações'
            });
          }
        }
      }

      // Caso o usuário cole JSON diretamente para Colportores
      if (uploadColpRaw.trim()) {
        const cleaned = uploadColpRaw.trim();
        if (cleaned.startsWith('[') || cleaned.startsWith('{')) {
          const contents = JSON.parse(cleaned);
          parsedColp = Array.isArray(contents) ? contents : [contents];
        } else {
          // Parse simples de CSV
          const lines = cleaned.split('\n');
          const headers = lines[0].split(/[;,]/).map(h => h.trim().replace(/^"|"$/g, ''));
          
          for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = lines[i].split(/[;,]/).map(v => v.trim().replace(/^"|"$/g, ''));
            const row: any = {};
            headers.forEach((h, index) => {
              row[h] = values[index];
            });

            parsedColp.push({
              colportor: row.colportor || row.Colportor || row.nome || '',
              campo: row.campo || row.Campo || '',
              tipo: (row.tipo || row.Tipo || 'Permanente') as any,
              categoria: (row.categoria || row.Categoria || 'Licenciado') as any,
              ColporteurSegment: row.ColporteurSegment || row.segmento || '',
              DataIngresso: row.DataIngresso || row.dataingresso || ''
            });
          }
        }
      }

      if (parsedSales.length === 0 && parsedColp.length === 0) {
        setUploadError('Nenhum dado válido fornecido. Insira dados em formato CSV ou JSON.');
        return;
      }

      if (parsedSales.length > 0) {
        parseDates(parsedSales);
        setSalesList(parsedSales);
      }
      if (parsedColp.length > 0) {
        setColportoresList(parsedColp);
        if (parsedColp.length > 0) {
          setSelectedColpName(parsedColp[0].colportor);
        }
      }

      setUploadSuccessMsg(`Importação realizada com sucesso! Vendas carregadas: ${parsedSales.length || 'inalteradas'}, Colportores carregados: ${parsedColp.length || 'inalteradas'}.`);
      setUploadSalesRaw('');
      setUploadColpRaw('');
      setTimeout(() => setShowUploadModal(false), 2500);

    } catch (err: any) {
      setUploadError(`Erro ao interpretar dados: ${err.message}. Certifique-se de usar sintaxe JSON correta ou formato CSV válido.`);
    }
  };

  // Restaurar dados da API (substitui reset para mock)
  const handleResetToSeeds = () => {
    handleReloadFromAPI();
  };

  // ----------------------------------------------------
  // VISUAL SVGS INLINE CUSTOM CHARTS
  // ----------------------------------------------------

  // Donut/Pizza Metas Segmento (Livros vs Revistas)
  const renderDonutChart = () => {
    const total = metasDashboardData.totalVendido;
    const rev = metasDashboardData.totalAssinantes;
    const liv = metasDashboardData.totalOutros;

    if (!total) {
      return (
        <div className="flex h-48 flex-col items-center justify-center text-brand-400">
          <Info className="mb-2 h-8 w-8 stroke-1" />
          <p className="text-sm">Sem vendas registradas no filtro</p>
        </div>
      );
    }

    const pctRev = rev / total;
    const pctLiv = liv / total;
    
    // SVG circular parameter helpers
    const radius = 60;
    const circ = 2 * Math.PI * radius;
    const strokeDashoffsetRev = circ - (pctRev * circ);

    return (
      <div className="flex items-center justify-around py-2">
        <div className="relative flex h-36 w-36 items-center justify-center">
          <svg className="absolute -rotate-90 animate-fade-in" width="140" height="140" viewBox="0 0 140 140">
            {/* Background ring */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="transparent"
              stroke="var(--color-brand-100)"
              strokeWidth="14"
            />
            {/* Livros segment */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="transparent"
              stroke="var(--color-brand-500)"
              strokeWidth="15"
              strokeDasharray={circ}
              strokeDashoffset="0"
            />
            {/* Revistas segment */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="transparent"
              stroke="var(--color-accent-teal)"
              strokeWidth="15.5"
              strokeDasharray={circ}
              strokeDashoffset={strokeDashoffsetRev}
            />
          </svg>
          <div className="z-10 text-center">
            <span className="font-display text-2xl font-semibold text-brand-900">{total}</span>
            <p className="text-[10px] font-mono tracking-wider text-brand-500 uppercase">Vendas</p>
          </div>
        </div>

        <div className="space-y-3 font-sans text-xs">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 rounded bg-brand-500"></div>
            <div>
              <p className="font-medium text-brand-800">Livros ({Math.round(pctLiv * 100)}%)</p>
              <p className="text-10 font-mono text-brand-500">{liv} un. vendidas</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 rounded bg-accent-teal"></div>
            <div>
              <p className="font-medium text-brand-800">Assinaturas ({Math.round(pctRev * 100)}%)</p>
              <p className="text-10 font-mono text-brand-500">{rev} un. vendidas</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Speedometer Gauge para cotas alcançadas vs meta proporcional
  const renderGauge = (batidas: number, metaProp: number) => {
    // Escala máxima = Math.max(6, metaProp)
    const limite = Math.max(6, Math.ceil(metaProp));
    const normalizedVal = Math.min(batidas / limite, 1.0);
    const angle = normalizedVal * 180; // semicírculo

    // SVG parameters
    const r = 55;
    const circSemicircle = Math.PI * r;
    const dashOffset = circSemicircle - (normalizedVal * circSemicircle);

    return (
      <div className="flex flex-col items-center justify-center p-2 text-center">
        <div className="relative h-28 w-44 overflow-hidden">
          <svg className="absolute top-0 left-0" width="176" height="110" viewBox="0 0 176 110">
            <defs>
              <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--color-brand-500)" />
                <stop offset="100%" stopColor="var(--color-accent-teal)" />
              </linearGradient>
            </defs>
            {/* Trail */}
            <path
              d="M 23 90 A 65 65 0 0 1 153 90"
              fill="none"
              stroke="var(--color-brand-200)"
              strokeWidth="14"
              strokeLinecap="round"
            />
            {/* Actives values */}
            <path
              d="M 23 90 A 65 65 0 0 1 153 90"
              fill="none"
              stroke="url(#gaugeGrad)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={circSemicircle}
              strokeDashoffset={dashOffset}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute bottom-1 left-0 right-0 text-center">
            <p className="font-sans text-3xl font-bold text-brand-900">{batidas}</p>
            <p className="text-[10px] font-mono tracking-wider text-brand-500 uppercase">
              Cotas Alcançadas (Alvo: {metaProp.toFixed(1)})
            </p>
          </div>
        </div>
      </div>
    );
  };

  // SVG Line/Area Chart de evolução de compras vs meta mensal
  const renderLineChart = (chartData: Array<{ mesNome: string; bonificado: number; meta: number }>) => {
    if (!chartData || chartData.length === 0) return null;

    const width = 640;
    const height = 180;
    const paddingLeft = 65;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const maxVal = Math.max(
      ...chartData.map(d => Math.max(d.bonificado, d.meta)),
      5000 // Valor mínimo para o topo do gráfico
    );

    // Helpers para coordenadas
    const getX = (index: number) => {
      if (chartData.length <= 1) return paddingLeft + (width - paddingLeft - paddingRight) / 2;
      return paddingLeft + (index / (chartData.length - 1)) * (width - paddingLeft - paddingRight);
    };

    const getY = (val: number) => {
      const scale = (height - paddingTop - paddingBottom);
      return height - paddingBottom - (val / maxVal) * scale;
    };

    // Construção de paths de SVG
    let valuePath = '';
    let valueAreaPath = '';
    let metaPath = '';

    chartData.forEach((d, i) => {
      const x = getX(i);
      const yVal = getY(d.bonificado);
      const yMeta = getY(d.meta);

      if (i === 0) {
        valuePath = `M ${x} ${yVal}`;
        valueAreaPath = `M ${x} ${height - paddingBottom} L ${x} ${yVal}`;
        metaPath = `M ${x} ${yMeta}`;
      } else {
        valuePath += ` L ${x} ${yVal}`;
        valueAreaPath += ` L ${x} ${yVal}`;
        metaPath += ` L ${x} ${yMeta}`;
      }
      if (i === chartData.length - 1) {
        valueAreaPath += ` L ${x} ${height - paddingBottom} Z`;
      }
    });

    return (
      <div className="w-full overflow-x-auto">
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="min-w-[500px]">
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--color-brand-50)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Gridlines horizontais */}
          {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
            const hVal = maxVal * p;
            const y = getY(hVal);
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="var(--color-brand-200)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="font-mono text-[9px] font-medium text-brand-400"
                >
                  {fmtM(hVal).replace('R$', '').trim()}
                </text>
              </g>
            );
          })}

          {/* Area de vendas preenchida */}
          {chartData.length > 1 && (
            <path d={valueAreaPath} fill="url(#areaGrad)" />
          )}

          {/* Linhas principais */}
          {chartData.length > 1 && (
            <>
              {/* Linha Meta */}
              <path
                d={metaPath}
                fill="none"
                stroke="var(--color-accent-gold)"
                strokeWidth="2.5"
                strokeDasharray="4 4"
                strokeLinecap="round"
              />
              {/* Linha Vendas */}
              <path
                d={valuePath}
                fill="none"
                stroke="var(--color-brand-500)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* Dots de Vendas e Metas nos checkpoints mensais */}
          {chartData.map((d, i) => {
            const x = getX(i);
            const yVal = getY(d.bonificado);
            const yMeta = getY(d.meta);
            
            return (
              <g key={i} className="group cursor-pointer">
                {/* Eixo vertical guia */}
                <line
                  x1={x}
                  y1={paddingTop}
                  x2={x}
                  y2={height - paddingBottom}
                  stroke="var(--color-brand-300)"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                />
                {/* Círculo Meta */}
                <circle
                  cx={x}
                  cy={yMeta}
                  r="4"
                  fill="white"
                  stroke="var(--color-accent-gold)"
                  strokeWidth="2"
                />
                {/* Círculo Venda Realizada */}
                <circle
                  cx={x}
                  cy={yVal}
                  r={d.bonificado >= d.meta ? "6" : "5"}
                  fill={d.bonificado >= d.meta ? "var(--color-accent-teal)" : "var(--color-brand-600)"}
                  stroke="white"
                  strokeWidth="2"
                  className="transition-all hover:scale-125"
                />
                {/* Texto Mês */}
                <text
                  x={x}
                  y={height - 10}
                  textAnchor="middle"
                  className="font-sans text-[10px] font-medium text-brand-500"
                >
                  {d.mesNome}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="mt-2 flex justify-center space-x-6 text-xs font-sans">
          <div className="flex items-center space-x-1.5">
            <span className="h-2.5 w-6 rounded bg-brand-500 inline-block"></span>
            <span className="text-brand-600 font-medium">Bonificado Realizado</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-0 w-6 border-b-2.5 border-dashed border-accent-gold inline-block"></span>
            <span className="text-brand-600 font-medium font-dashed">Meta Calculada</span>
          </div>
        </div>
      </div>
    );
  };

  // ── Tela de loading ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center gap-4">
        <div className="text-brand-400 text-4xl animate-pulse">⚡</div>
        <p className="text-brand-300 font-mono text-sm">Conectando à API UCOB...</p>
        <p className="text-brand-500 font-mono text-xs">Aguarde enquanto os dados são carregados</p>
      </div>
    );
  }

  // ── Tela de erro de conexão ──
  if (loadError && salesList.length === 0) {
    return (
      <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center gap-4 p-8">
        <div className="text-red-400 text-4xl">⚠</div>
        <p className="text-brand-200 font-sans font-bold text-lg">Erro ao conectar com a API</p>
        <pre className="text-brand-400 font-mono text-xs bg-brand-100 rounded-lg p-4 max-w-xl w-full whitespace-pre-wrap">{loadError}</pre>
        <button
          onClick={handleReloadFromAPI}
          className="mt-2 px-6 py-2 bg-brand-accent text-brand-50 rounded-lg font-bold text-sm hover:opacity-90"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-50 text-brand-900 pb-16 font-sans relative overflow-hidden">
      {/* Background radial glow blobs for Immersive Dark Theme */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] right-[-10%] w-[40vw] h-[40vw] bg-cyan-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[35vw] h-[35vw] bg-purple-500/10 rounded-full blur-[120px]" />
      </div>
      
      {/* APP TOP BAR HEADER (Seção 1) */}
      <header className="sticky top-0 z-40 bg-brand-100/40 backdrop-blur-md border-b border-brand-200/50 shadow-sm px-4 lg:px-8 py-4 relative">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-cyan-400 text-white rounded-xl shadow-lg shadow-indigo-500/20">
              <TrendingUp className="h-6 w-6 stroke-[2]" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight text-brand-950 flex items-center gap-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                Hub UCOB Analytics
                <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-mono font-medium text-accent-teal uppercase animate-pulse">
                  v4.0
                </span>
              </h1>
              <p className="text-xs text-brand-400 font-sans font-medium">Gestão Comercial Integrada do Departamento de Publicações</p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 md:self-end">
            <button
              onClick={() => setShowConfigModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-brand-300 bg-brand-200 text-xs font-semibold text-brand-800 hover:bg-brand-300 transition cursor-pointer"
              title="Configurar Metas e Cotas Unitárias"
            >
              <Settings className="h-3.5 w-3.5 text-indigo-400" />
              <span>Cotas Regra C</span>
            </button>

            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-brand-300 bg-brand-200 text-xs font-semibold text-brand-800 hover:bg-brand-300 transition cursor-pointer"
              title="Importar CSV/JSON do Usuário Final"
            >
              <UploadCloud className="h-3.5 w-3.5 text-indigo-400" />
              <span>Importar Planilhas</span>
            </button>

            <button
              onClick={() => setShowDiagPanel(!showDiagPanel)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-brand-300 bg-brand-200 text-xs font-semibold text-brand-800 hover:bg-brand-300 transition cursor-pointer"
            >
              <Calculator className="h-3.5 w-3.5 text-indigo-400" />
              <span>Depuração Regra 8</span>
            </button>

            <button
              onClick={handleResetToSeeds}
              className="p-1.5 rounded-lg border border-brand-300 bg-brand-200 hover:bg-brand-300 text-brand-400 hover:text-brand-800 transition cursor-pointer"
              title="Restaurar Dados Originais de Vendas"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 lg:px-8 mt-6 relative z-10">
        
        {/* BANNER DE NOTIFICAÇÃO E FEEDBACK */}
        <AnimatePresence>
          {uploadSuccessMsg && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-start space-x-2.5 text-emerald-300 text-xs font-medium"
            >
              <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 flex justify-between items-center">
                <span>{uploadSuccessMsg}</span>
                <button onClick={() => setUploadSuccessMsg('')} className="text-emerald-400 hover:text-emerald-300 font-mono font-bold text-sm ml-2">×</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* COMPONENTE DE DIAGNÓSTICO DO BANCO (Regra 8) */}
        {showDiagPanel && diagnostics && (
          <div className="mb-6 rounded-xl border border-dashed border-brand-300 bg-brand-100 p-4 text-xs font-sans text-brand-800 shadow-sm backdrop-blur-md relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-brand-200 pb-2 mb-3">
              <h2 className="font-display font-bold text-brand-950 flex items-center gap-1.5">
                <Calculator className="h-4 w-4 text-brand-500" />
                Painel Integrado de Diagnóstico (Regra 8)
              </h2>
              <button onClick={() => setShowDiagPanel(false)} className="text-brand-400 hover:text-brand-600 font-bold font-mono text-sm leading-none cursor-pointer">&times;</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-brand-50 p-2.5 rounded-lg border border-brand-200">
                <span className="text-brand-400 block pb-1">Total Injected Colp:</span>
                <strong className="text-sm font-mono text-brand-900">{diagnostics.totalColportoresBanco} colportores</strong>
              </div>
              <div className="bg-brand-50 p-2.5 rounded-lg border border-brand-200">
                <span className="text-brand-400 block pb-1">Com Data Ingresso:</span>
                <strong className="text-sm font-mono text-emerald-400">{diagnostics.comDataIngresso} match</strong>
              </div>
              <div className="bg-brand-50 p-2.5 rounded-lg border border-brand-200">
                <span className="text-brand-400 block pb-1">Sem correspondência no CSV:</span>
                <strong className={`text-sm font-mono ${diagnostics.semMatchTotal > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {diagnostics.semMatchTotal} registros
                </strong>
              </div>
              <div className="bg-brand-50 p-2.5 rounded-lg border border-brand-200 flex flex-col justify-center">
                <span className="text-brand-400 block pb-1">Status de Match:</span>
                <div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold font-mono ${diagnostics.semMatchTotal === 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                    {diagnostics.semMatchTotal === 0 ? '✓ 100% Sincronizado' : '⚠ Correção Necessária'}
                  </span>
                </div>
              </div>
            </div>

            {diagnostics.semMatchTotal > 0 && (
              <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-[10px] text-amber-300 leading-relaxed font-mono">
                <strong>Nomes sem par exato no CSV (Fallback de busca aplicado):</strong>
                <p className="mt-1">{diagnostics.semMatchLista.join(', ')}</p>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* FILTROS GLOBAIS ESTILO SLATE ACCENT (Regra 4) */}
        {/* ---------------------------------------------------- */}
        <section className="bg-brand-100/40 backdrop-blur-md rounded-2xl border border-brand-200/50 shadow-sm p-4 lg:p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Seletor de Ano */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-medium text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-indigo-400" />
                Ano Comercial
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full bg-brand-200 border border-brand-300 hover:border-indigo-500/50 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-800 focus:outline-none focus:ring-1.5 focus:ring-brand-500 focus:bg-brand-200 transition cursor-pointer"
              >
                {filtersOptions.anos.map(yr => (
                  <option key={yr} value={yr}>Comercial {yr}</option>
                ))}
              </select>
            </div>

            {/* Seletor de Tipo */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-medium text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-3 w-3 text-indigo-400" />
                Tipo de Colportor
              </label>
              <div className="grid grid-cols-2 gap-1 bg-brand-200 p-1 rounded-lg border border-brand-300">
                {filtersOptions.tipos.map(tp => (
                  <button
                    key={tp}
                    onClick={() => setSelectedTipo(tp)}
                    className={`text-[11px] font-bold py-1 rounded-md transition cursor-pointer ${
                      selectedTipo === tp 
                        ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' 
                        : 'text-brand-400 hover:text-brand-800 hover:bg-brand-300/30'
                    }`}
                  >
                    {tp}
                  </button>
                ))}
              </div>
            </div>

            {/* Período Rápido */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-[10px] font-mono font-medium text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="h-3 w-3 text-indigo-400" />
                Duração do Semestre (Regra 4)
              </label>
              <div className="flex gap-1 bg-brand-200 p-1 rounded-lg border border-brand-300">
                <button
                  onClick={() => { setPeriodoRapido('s1'); setSelectedSingleMonth(''); }}
                  className={`flex-1 text-[11px] font-bold py-1 rounded-md transition cursor-pointer ${
                    periodoRapido === 's1' && !selectedSingleMonth
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' 
                      : 'text-brand-400 hover:text-brand-800 hover:bg-brand-300/30'
                  }`}
                >
                  1º Semestre
                </button>
                <button
                  onClick={() => { setPeriodoRapido('s2'); setSelectedSingleMonth(''); }}
                  className={`flex-1 text-[11px] font-bold py-1 rounded-md transition cursor-pointer ${
                    periodoRapido === 's2' && !selectedSingleMonth
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' 
                      : 'text-brand-400 hover:text-brand-800 hover:bg-brand-300/30'
                  }`}
                >
                  2º Semestre
                </button>
                <button
                  onClick={() => { setPeriodoRapido('anual'); setSelectedSingleMonth(''); }}
                  className={`flex-1 text-[11px] font-bold py-1 rounded-md transition cursor-pointer ${
                    periodoRapido === 'anual' && !selectedSingleMonth
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' 
                      : 'text-brand-400 hover:text-brand-800 hover:bg-brand-300/30'
                  }`}
                >
                  Anual
                </button>
              </div>
            </div>

            {/* Mês Avulso Adicional */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-medium text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="h-3 w-3 text-indigo-400" />
                Mês Avulso (Opcional)
              </label>
              <select
                value={selectedSingleMonth}
                onChange={(e) => setSelectedSingleMonth(e.target.value)}
                className="w-full bg-brand-200 border border-brand-300 hover:border-indigo-500/50 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-800 focus:outline-none focus:ring-1.5 focus:ring-brand-500 focus:bg-brand-200 transition cursor-pointer"
              >
                <option value="">Usar Semestre Inteiro</option>
                {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(mNum => (
                  <option key={mNum} value={mNum}>{MESES_FULL[parseInt(mNum, 10)]}</option>
                ))}
              </select>
            </div>
            
          </div>
        </section>

        {/* ---------------------------------------------------- */}
        {/* BARRA DE MENU DE ABAS (Seção 5) */}
        {/* ---------------------------------------------------- */}
        <section className="flex flex-col sm:flex-row items-stretch justify-between gap-4 border-b border-brand-200 pb-3 mb-6 relative">
          <div className="flex bg-brand-200/65 p-1 rounded-xl self-start w-full sm:w-auto scale-100 border border-brand-300/30 backdrop-blur-md">
            <button
              onClick={() => setActiveTab('ranking')}
              className={`flex items-center justify-center space-x-1.5 px-6 py-2 rounded-lg text-xs font-bold transition w-1/3 sm:w-auto cursor-pointer ${
                activeTab === 'ranking' 
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' 
                  : 'text-brand-400 hover:text-brand-800 hover:bg-brand-300/30'
              }`}
            >
              <Award className="h-3.5 w-3.5" />
              <span>Rankings</span>
            </button>
            <button
              onClick={() => setActiveTab('metas')}
              className={`flex items-center justify-center space-x-1.5 px-6 py-2 rounded-lg text-xs font-bold transition w-1/3 sm:w-auto cursor-pointer ${
                activeTab === 'metas' 
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' 
                  : 'text-brand-400 hover:text-brand-800 hover:bg-brand-300/30'
              }`}
            >
              <Target className="h-3.5 w-3.5" />
              <span>Metas & Cotas</span>
            </button>
            <button
              onClick={() => setActiveTab('colportores')}
              className={`flex items-center justify-center space-x-1.5 px-6 py-2 rounded-lg text-xs font-bold transition w-1/3 sm:w-auto cursor-pointer ${
                activeTab === 'colportores' 
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' 
                  : 'text-brand-400 hover:text-brand-800 hover:bg-brand-300/30'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Visão Individual</span>
            </button>
          </div>

          <div className="font-mono text-[10px] tracking-widest text-brand-400 flex items-center justify-end uppercase mt-1">
            <span>
              Período selecionado: {selectedSingleMonth ? `MÊS DE ${MESES_FULL[parseInt(selectedSingleMonth, 10)].toUpperCase()}` : `${periodoRapido.toUpperCase()}`} • {selectedYear}
            </span>
          </div>
        </section>

        {/* ---------------------------------------------------- */}
        {/* CONTEÚDO DA ABA 1: RANKINGS */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'ranking' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Visual Header do Rank */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-display text-lg font-bold text-brand-950">Desempenho Geral de Vendas</h3>
                <p className="text-xs text-brand-400 font-medium">Ranking cumulativo dos maiores faturamentos de colportagem</p>
              </div>

              {/* Filtro e Agrupamento */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setRankingGroupByField(!rankingGroupByField)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-200 border border-brand-300 text-brand-800 hover:bg-brand-300 transition cursor-pointer"
                >
                  Agrupar por: {rankingGroupByField ? 'Associações (Campos)' : 'Colportores'}
                </button>
                
                <div className="flex bg-brand-200 p-0.5 rounded-lg border border-brand-300">
                  {(['bonTotal', 'liq', 'qtd'] as const).map(k => (
                    <button
                      key={k}
                      onClick={() => setRankingSortBy(k)}
                      className={`text-[10px] font-bold px-2.5 py-1.5 rounded-md uppercase tracking-wider transition cursor-pointer ${
                        rankingSortBy === k 
                          ? 'bg-brand-500 text-white shadow-xs' 
                          : 'text-brand-400 hover:text-brand-800 hover:bg-brand-300/30'
                      }`}
                    >
                      {k === 'bonTotal' ? 'Bonificado' : k === 'liq' ? 'Líquido' : 'Unidades'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* PÓDIO PARA OS TRÊS LÍDERES (Com efeitos e halos metálicos) */}
            {podiumData.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-10 pb-6 max-w-5xl mx-auto">
                
                {/* 2º LUGAR (Prata) */}
                {podiumData[1] && (
                  <div className="order-2 md:order-1 flex flex-col items-center bg-brand-100/40 backdrop-blur-md border border-brand-200/50 rounded-2xl p-5 shadow-sm relative pt-12 transform hover:scale-102 transition">
                    <div className="absolute -top-6 rounded-full bg-brand-200 border-4 border-brand-50 text-brand-400 shadow-md flex items-center justify-center h-12 w-12 font-display font-black text-lg">2</div>
                    <div className="text-center space-y-1">
                      <h4 className="font-display font-semibold text-brand-900 max-w-44 truncate">
                        {rankingGroupByField ? `Campo ${(podiumData[1] as any).campo}` : (podiumData[1] as any).colportor}
                      </h4>
                      {!rankingGroupByField && (
                        <p className="text-[10px] text-brand-400 uppercase font-bold">Campo {(podiumData[1] as any).campo} • {(podiumData[1] as any).categoria}</p>
                      )}
                    </div>
                    <div className="mt-4 border-t border-brand-200 w-full pt-4 text-center">
                      <p className="font-mono text-xl font-bold text-brand-800">{fmtM(podiumData[1][rankingSortBy === 'qtd' ? 'bonTotal' : rankingSortBy])}</p>
                      <p className="text-[10px] text-brand-400 uppercase font-mono tracking-wider">
                        {rankingSortBy === 'qtd' ? 'Quantidade' : 'Faturamento'}
                      </p>
                    </div>
                  </div>
                )}

                {/* 1º LUGAR (Ouro) */}
                {podiumData[0] && (
                  <div className="order-1 md:order-2 flex flex-col items-center bg-brand-100/80 backdrop-blur-md border-2 border-amber-500/40 rounded-3xl p-6 shadow-xl relative pt-14 transform md:-translate-y-4 hover:scale-102 transition ring-4 ring-amber-500/10">
                    <div className="absolute -top-8 rounded-full bg-amber-400 text-amber-950 border-4 border-brand-50 shadow-lg flex items-center justify-center h-16 w-16 font-display font-black text-2xl relative">
                      1
                      <div className="absolute -top-5 text-amber-500 animate-[bounce_1.5s_infinite]">♛</div>
                    </div>
                    <div className="text-center space-y-1">
                      <h4 className="font-display font-black text-lg max-w-44 truncate bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500">
                        {rankingGroupByField ? `Campo ${(podiumData[0] as any).campo}` : (podiumData[0] as any).colportor}
                      </h4>
                      {!rankingGroupByField && (
                        <p className="text-[10px] text-amber-400 uppercase font-bold tracking-wider">Campo {(podiumData[0] as any).campo} • {(podiumData[0] as any).categoria}</p>
                      )}
                    </div>
                    <div className="mt-4 border-t border-brand-300 w-full pt-4 text-center">
                      <p className="font-mono text-2xl font-black text-brand-900">{fmtM(podiumData[0][rankingSortBy === 'qtd' ? 'bonTotal' : rankingSortBy])}</p>
                      <p className="text-[10px] text-brand-400 uppercase font-mono tracking-wider">
                        ★ Campeão de Vendas ★
                      </p>
                    </div>
                  </div>
                )}

                {/* 3º LUGAR (Bronze) */}
                {podiumData[2] && (
                  <div className="order-3 flex flex-col items-center bg-brand-100/40 backdrop-blur-md border border-brand-200/50 rounded-2xl p-5 shadow-sm relative pt-12 transform hover:scale-102 transition">
                    <div className="absolute -top-6 rounded-full bg-brand-200 border-4 border-brand-50 text-orange-400 shadow-md flex items-center justify-center h-12 w-12 font-display font-black text-lg">3</div>
                    <div className="text-center space-y-1">
                      <h4 className="font-display font-semibold text-brand-900 max-w-44 truncate">
                        {rankingGroupByField ? `Campo ${(podiumData[2] as any).campo}` : (podiumData[2] as any).colportor}
                      </h4>
                      {!rankingGroupByField && (
                        <p className="text-[10px] text-brand-400 uppercase font-bold">Campo {(podiumData[2] as any).campo} • {(podiumData[2] as any).categoria}</p>
                      )}
                    </div>
                    <div className="mt-4 border-t border-brand-200 w-full pt-4 text-center">
                      <p className="font-mono text-xl font-bold text-brand-800">{fmtM(podiumData[2][rankingSortBy === 'qtd' ? 'bonTotal' : rankingSortBy])}</p>
                      <p className="text-[10px] text-brand-400 uppercase font-mono tracking-wider">
                        {rankingSortBy === 'qtd' ? 'Quantidade' : 'Faturamento'}
                      </p>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* TABELA DETALHADA E CLASSIFICAÇÃO COMPLETA */}
            <div className="bg-brand-100/40 backdrop-blur-md rounded-2xl border border-brand-200/50 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-brand-200 flex items-center justify-between">
                <span className="text-xs font-bold text-brand-800 uppercase tracking-wider font-mono">Tabela Completa de Classificação</span>
                <span className="text-xs font-semibold text-brand-400 bg-brand-200 px-2.5 py-0.5 rounded-full border border-brand-300">
                  {rankingData.length} registros no ranking
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans text-xs">
                  <thead className="bg-brand-200/40 text-brand-400 uppercase tracking-wider font-mono text-[9px]">
                    <tr>
                      <th className="py-3 px-4 text-center w-14">Posto</th>
                      <th className="py-3 px-4 font-semibold">
                        {rankingGroupByField ? 'Associação (Campo)' : 'Colportor'}
                      </th>
                      {!rankingGroupByField && (
                        <>
                          <th className="py-3 px-4 font-semibold text-center">Campo</th>
                          <th className="py-3 px-4 font-semibold text-center">Segmento</th>
                          <th className="py-3 px-4 font-semibold text-center">Categoria</th>
                        </>
                      )}
                      {rankingGroupByField && (
                        <th className="py-3 px-4 font-semibold text-center">Colportores Ativos</th>
                      )}
                      <th className="py-3 px-4 text-right font-semibold">Qtd Vendas</th>
                      <th className="py-3 px-4 text-right font-semibold">Livre Bonificado</th>
                      <th className="py-3 px-4 text-right font-semibold">Líquido Recebido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-200 text-brand-800">
                    {rankingData.map((row: any, idx: number) => {
                      const idRow = rankingGroupByField ? row.campo : row.colportor;
                      const isPodium = idx < 3;
                      
                      return (
                        <tr 
                          key={idRow} 
                          className={`hover:bg-brand-50/50 transition cursor-pointer ${
                            isPodium ? 'bg-amber-500/5' : ''
                          }`}
                        >
                          <td className="py-3 px-4 text-center font-mono font-bold">
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                          </td>
                          <td className="py-3 px-4 font-display font-medium text-brand-950">
                            {rankingGroupByField ? `Campo ${row.campo}` : row.colportor}
                          </td>
                          {!rankingGroupByField && (
                            <>
                              <td className="py-3 px-4 text-center font-semibold font-mono text-brand-600">{row.campo}</td>
                              <td className="py-3 px-4 text-center font-medium italic text-brand-400">{row.segmento}</td>
                              <td className="py-3 px-4 text-center font-semibold text-brand-700">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  row.categoria === 'Credenciado' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                                  row.categoria === 'Licenciado' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  row.categoria === 'Aspirante' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-brand-200 text-brand-300'
                                }`}>
                                  {row.categoria}
                                </span>
                              </td>
                            </>
                          )}
                          {rankingGroupByField && (
                            <td className="py-3 px-4 text-center font-mono font-semibold text-brand-600">
                              {row.colAtivos.size} colportores
                            </td>
                          )}
                          <td className="py-3 px-4 text-right font-mono font-medium">{row.qtd} un.</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-brand-950">{fmtM(row.bonTotal)}</td>
                          <td className="py-3 px-4 text-right font-mono font-black text-emerald-400">{fmtM(row.liq)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* ---------------------------------------------------- */}
        {/* CONTEÚDO DA ABA 2: METAS & COTAS */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'metas' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Visual Header do Campo */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="font-display text-lg font-bold text-brand-950">Acompanhamento de Campo de Publicações</h3>
                <p className="text-xs text-brand-400 font-medium">Monitoramento e progresso de cotas por região (Regra C, E)</p>
              </div>

              {/* Seletor dinâmico de Campo */}
              <div className="space-y-1 sm:self-end">
                <span className="text-[10px] font-mono font-semibold text-brand-400 block uppercase">Filtrar Campo Ativo</span>
                <select
                  value={selectedCampo}
                  onChange={(e) => setSelectedCampo(e.target.value)}
                  className="bg-brand-200 border border-brand-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-800 transition cursor-pointer focus:bg-brand-200 focus:outline-none"
                >
                  {filtersOptions.campos.map(cp => (
                    <option key={cp} value={cp}>Associação / Campo {cp}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* CARDS DE INDICADORES DO CAMPO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-brand-100/40 backdrop-blur-md rounded-xl border border-brand-200/50 p-4 shadow-xs">
                <span className="text-[10px] font-mono text-brand-400 uppercase block tracking-wider font-bold">Total Faturamento Campo</span>
                <strong className="text-xl font-display font-black text-brand-950 mt-1 block">{fmtM(metasDashboardData.totalBonificado)}</strong>
                <p className="text-10 text-emerald-400 mt-1 font-mono font-medium flex items-center gap-0.5">
                  <ArrowUpRight className="h-3 w-3 inline" />
                  Líquido: {fmtM(metasDashboardData.totalLiquido)}
                </p>
              </div>

              <div className="bg-brand-100/40 backdrop-blur-md rounded-xl border border-brand-200/50 p-4 shadow-xs">
                <span className="text-[10px] font-mono text-brand-400 uppercase block tracking-wider font-bold font-semibold">Colportores Ativos no Mês</span>
                <strong className="text-xl font-display font-bold text-brand-950 mt-1 block">{metasDashboardData.colportores.length} ativos</strong>
                <p className="text-10 text-brand-400 mt-1 font-sans">No Campo selecionado {selectedCampo}</p>
              </div>

              <div className="bg-brand-100/40 backdrop-blur-md rounded-xl border border-brand-200/50 p-4 shadow-xs">
                <span className="text-[10px] font-mono text-brand-400 uppercase block tracking-wider font-bold font-semibold">Meta de Cotas Cumulativa</span>
                <strong className="text-xl font-display font-bold text-brand-950 mt-1 block">
                  {metasDashboardData.colportores.reduce((s, c) => s + c.cotasBatidas, 0)} cotas bateram
                </strong>
                <p className="text-10 text-amber-400 mt-1 font-mono">Indicador de permanência</p>
              </div>

              <div className="bg-brand-100/40 backdrop-blur-md rounded-xl border border-brand-200/50 p-4 shadow-xs">
                <span className="text-[10px] font-mono text-brand-400 uppercase block tracking-wider font-bold font-semibold">Ticket Médio das Vendas (Regra E)</span>
                <strong className="text-xl font-display font-bold text-brand-950 mt-1 block">
                  {metasDashboardData.colportores.length > 0
                    ? fmtM(metasDashboardData.totalBonificado / metasDashboardData.totalVendido)
                    : 'R$ 0,00'
                  }
                </strong>
                <p className="text-10 text-brand-400 mt-1 font-mono">Unidades totais: {metasDashboardData.totalVendido}</p>
              </div>

            </div>

            {/* DIVISÃO DE SEGMENTOS DE MERCADO */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="bg-brand-100/40 backdrop-blur-md rounded-xl border border-brand-200/50 p-4 shadow-xs flex flex-col justify-between">
                <div>
                  <h4 className="font-display font-bold text-xs text-brand-900 uppercase tracking-wider font-mono">Distribuição de Materiais</h4>
                  <p className="text-[11px] text-brand-400">Livros de saúde vs. Assinaturas de periódicos UCOB</p>
                </div>
                <div className="my-2">
                  {renderDonutChart()}
                </div>
                <div className="bg-brand-200/60 p-3 rounded-lg text-[11px] text-brand-400 leading-relaxed font-sans border border-brand-300/50">
                  <strong>Regra D:</strong> Perfis distritais que vendem mais assinaturas do que catálogos são forçados a metas ajustadas para a tabela de Revistas.
                </div>
              </div>

              {/* LISTAGEM INDIVIDUAL DE METAS */}
              <div className="lg:col-span-2 bg-brand-100/40 backdrop-blur-md rounded-xl border border-brand-200/50 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-brand-200 flex items-center justify-between bg-brand-200/30">
                  <span className="text-[10px] font-mono font-bold text-brand-800 uppercase tracking-wider">Metas Financeiras dos Colportores</span>
                  <span className="text-[10px] font-mono text-brand-400 uppercase">Fator Casa Regra B aplicado</span>
                </div>
                
                <div className="divide-y divide-brand-200 scroll-smooth overflow-y-auto max-h-[420px] px-4">
                  {metasDashboardData.colportores.map((c: any) => {
                    const progressVal = Math.min(c.percentualMeta * 100, 100);
                    const isBateuGeral = c.bonTotal >= c.metaFinanceira;

                    return (
                      <div key={c.nome} className="py-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h5 className="font-display font-bold text-brand-950 text-sm hover:underline cursor-pointer" onClick={() => { setSelectedColpName(c.nome); setActiveTab('colportores'); }}>
                                {c.nome}
                              </h5>
                              <span className="text-[9px] font-mono font-bold bg-brand-500/10 text-brand-400 border border-brand-500/20 px-1.5 py-0.25 rounded">
                                {c.categoria}
                              </span>
                              <span className="text-[9px] font-mono bg-brand-200 text-brand-400 px-1.5 py-0.25 rounded border border-brand-300">
                                Redução: {c.reducaoPct * 100}%
                              </span>
                            </div>
                            <p className="text-10 mt-1 text-brand-400 font-sans">Segmento: <strong className="font-semibold text-indigo-400">{c.segmento}</strong></p>
                          </div>

                          <div className="text-right">
                            <p className="font-mono font-black text-sm text-brand-950">{fmtM(c.bonTotal)}</p>
                            <p className="text-10 font-mono text-brand-400">Meta: {fmtM(c.metaFinanceira)}</p>
                          </div>
                        </div>

                        {/* Barra de progresso visual */}
                        <div className="space-y-1">
                          <div className="h-1.5 w-full bg-brand-200/60 rounded-full overflow-hidden border border-brand-300/30">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                isBateuGeral ? 'bg-accent-teal shadow-[0_0_8px_rgba(6,182,212,0.4)]' : 'bg-brand-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]'
                              }`} 
                              style={{ width: `${progressVal}%` }}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between text-10 font-mono text-brand-400">
                            <span>Atingimento: <strong>{Math.round(c.percentualMeta * 100)}%</strong></span>
                            {isBateuGeral ? (
                              <span className="text-cyan-400 font-bold flex items-center gap-0.5">
                                <CheckCircle2 className="h-3 w-3" /> Meta Batida
                              </span>
                            ) : (
                              <span className="text-brand-400 font-medium">Meta Pendente</span>
                            )}
                          </div>
                        </div>

                        {/* Histórico mensal de Cotas (Regra A) */}
                        <div className="flex items-center justify-between pt-1 border-t border-brand-200 border-dashed text-[10px]">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono text-brand-400">Mensalidades:</span>
                            <div className="flex space-x-1">
                              {c.cotasHistorico.map((h: any, i: number) => (
                                <span
                                  key={i}
                                  title={`Mês ${MESES_FULL[parseInt(h.mes, 10)]}: ${fmtM(h.realizado)} / ${fmtM(h.meta)}`}
                                  className={`h-2.5 w-2.5 rounded-full inline-block ${
                                    h.meta === 0 ? 'bg-brand-200 border border-brand-300' :
                                    h.bateu ? 'bg-accent-teal shadow-xs shadow-cyan-500/30' : 'bg-rose-500/40 border border-rose-500/50'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Alerta de Categoria da UCOB */}
                          <div className="text-right">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded border font-mono font-bold text-[8px] uppercase ${
                              c.progresso.cls === 'ok' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              c.progresso.cls === 'warn' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}>
                              {c.progresso.msg}
                            </span>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </motion.div>
        )}

        {/* ---------------------------------------------------- */}
        {/* CONTEÚDO DA ABA 3: COLPORTOR INDIVIDUAL */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'colportores' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* AUTOCAMP DE BUSCA E ENCONTRO (Seção 3.11) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-brand-100/40 backdrop-blur-md border border-brand-200/50 rounded-2xl p-4 shadow-sm relative z-30 animate-pulse-slow">
              
              <div className="relative md:col-span-2">
                <span className="text-[10px] font-mono text-brand-400 uppercase tracking-widest block font-bold mb-1">Localizar Colportor</span>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-brand-400">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Busca em tempo real de colportores..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSearchSuggestions(true);
                    }}
                    onFocus={() => setShowSearchSuggestions(true)}
                    className="w-full bg-brand-200 border border-brand-300 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-brand-950 placeholder:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-brand-200/50 transition"
                  />
                </div>

                {/* Autocomplete Suggestions Menu */}
                {showSearchSuggestions && colportoresSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-brand-250 border border-brand-350 rounded-xl shadow-lg z-50 backdrop-blur-lg">
                    {colportoresSuggestions.map(colp => (
                      <button
                        key={colp.colportor}
                        onClick={() => {
                          setSelectedColpName(colp.colportor);
                          setSearchQuery('');
                          setShowSearchSuggestions(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-brand-800 hover:bg-brand-300 border-b border-brand-200 transition flex items-center justify-between cursor-pointer"
                      >
                        <span className="font-semibold">{colp.colportor}</span>
                        <span className="text-[10px] bg-brand-200 border border-brand-300 px-1.5 py-0.25 rounded font-mono font-medium text-brand-600">{colp.campo}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Seletor Dropdown Tradicional */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-brand-400 uppercase tracking-widest block font-bold">Listagem Completa</span>
                <select
                  value={selectedColpName}
                  onChange={(e) => setSelectedColpName(e.target.value)}
                  className="w-full bg-brand-200 border border-brand-300 rounded-xl px-2.5 py-2 text-xs font-semibold text-brand-800 cursor-pointer focus:outline-none focus:bg-brand-200"
                >
                  {colportoresList.map(c => (
                    <option key={c.colportor} value={c.colportor}>{c.colportor} ({c.campo})</option>
                  ))}
                </select>
              </div>

            </div>

            {/* GRID PRINCIPAL DO PERFIL */}
            {colpIndividualData && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* CARTÃO DO PERFIL E METROS GAUGE */}
                <div className="space-y-6">
                  
                  {/* Ficha Cadastral (Regra 7) */}
                  <div className="bg-brand-100/40 backdrop-blur-md rounded-2xl border border-brand-200/50 p-5 shadow-xs relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-16 w-16 bg-brand-500 opacity-5 transform translate-x-4 -translate-y-4 rounded-full" />
                    <div className="space-y-3">
                      <div>
                        <span className="text-[9px] font-mono font-bold bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2 py-0.5 rounded uppercase">
                          {colpIndividualData.cat}
                        </span>
                        <h4 className="font-display text-xl font-bold text-brand-950 mt-1.5">{colpIndividualData.nome}</h4>
                        <p className="text-xs text-brand-400 font-medium mt-0.5">Associação Campo {colpIndividualData.info?.campo || 'UCOB'}</p>
                      </div>

                      <div className="border-t border-brand-200 pt-3 text-[11px] grid grid-cols-2 gap-2 font-sans text-brand-800">
                        <div>
                          <span className="text-brand-400 block">Tipo:</span>
                          <span className="font-semibold">{colpIndividualData.info?.tipo || 'Permanente'}</span>
                        </div>
                        <div>
                          <span className="text-brand-400 block">Segmento Ativo:</span>
                          <span className="font-semibold text-indigo-400">{colpIndividualData.segmento}</span>
                        </div>
                        <div>
                          <span className="text-brand-400 block">Ingresso Registrado:</span>
                          <span className="font-semibold font-mono">{colpIndividualData.info?.DataIngresso || 'Ficha Incompleta'}</span>
                        </div>
                        <div>
                          <span className="text-brand-400 block">Alívio Meta (Redução):</span>
                          <span className="font-bold text-emerald-400 font-mono">{colpIndividualData.reducao * 100}%</span>
                        </div>
                      </div>

                      {/* Ticket médio individual */}
                      <div className="bg-brand-200 p-3 rounded-xl flex items-center justify-between font-mono text-xs border border-brand-300/50">
                        <span className="text-brand-450 font-semibold">Ticket Médio (Regra E)</span>
                        <strong className="text-brand-950 font-black">{fmtM(colpIndividualData.ticket)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Velocímetro de Cotas da Regra A */}
                  <div className="bg-brand-100/40 backdrop-blur-md rounded-2xl border border-brand-200/50 p-5 shadow-xs text-center">
                    <h4 className="font-display font-medium text-xs text-brand-900 uppercase tracking-wider font-mono mb-4 text-left">Frequência de Cotas</h4>
                    {renderGauge(colpIndividualData.cotasBatidas, colpIndividualData.metaCotasProp)}
                    <p className="text-10 text-brand-400 leading-relaxed font-sans max-w-xs mx-auto mt-2">
                      Frequência acumulada do semestre selecionado. Para a categoria <strong>{colpIndividualData.cat}</strong>, a meta proporcional estabelecida para {mesesAtivosList.length} meses ativos é de <strong>{colpIndividualData.metaCotasProp.toFixed(1)}</strong> pontos.
                    </p>
                  </div>

                </div>

                {/* GRÁFICO HISTÓRICO DE EVOLUÇÃO MENSAL */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Gráfico Linear Real */}
                  <div className="bg-brand-100/40 backdrop-blur-md rounded-2xl border border-brand-200/50 p-5 shadow-xs min-h-[280px]">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-brand-250 pb-3 mb-5">
                      <div>
                        <h4 className="font-display font-bold text-brand-950">Desempenho Comercial Mês a Mês</h4>
                        <p className="text-xs text-brand-400">Trajetória financeira individual em relação à meta (Fator C)</p>
                      </div>
                      <div className="bg-brand-200 border border-brand-300 px-3 py-1 rounded-lg text-right font-mono text-[11px] font-bold text-brand-800">
                        Meta Acumulada: {fmtM(colpIndividualData.metaFinAcumulada)}
                      </div>
                    </div>
                    
                    <div className="py-2">
                      {renderLineChart(colpIndividualData.mensalChartData)}
                    </div>
                  </div>

                  {/* PROMOÇÃO E TABELA DE ITENS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Alerta de Categoria UCOB */}
                    <div className="bg-brand-100/40 backdrop-blur-md rounded-2xl border border-brand-200/50 p-5 shadow-xs flex flex-col justify-between">
                      <div>
                        <h5 className="font-display font-bold text-xs text-brand-900 uppercase tracking-wider font-mono">Status da Categoria (Regra A-2)</h5>
                        <p className="text-xs text-brand-400">Avaliação automática comercial para o Hub UCOB</p>
                      </div>

                      <div className="my-4 text-center">
                        <span className={`inline-flex px-3 py-1.5 rounded-xl font-mono text-center font-bold text-xs leading-none uppercase border ${
                          colpIndividualData.progresso.cls === 'ok' ? 'bg-emerald-500/10 text-emerald-400 shadow-xs ring-4 ring-emerald-500/10 border-emerald-500/20' :
                          colpIndividualData.progresso.cls === 'warn' ? 'bg-amber-500/10 text-amber-400 shadow-xs ring-4 ring-amber-500/10 border-amber-500/20' : 'bg-rose-500/10 text-rose-400 shadow-xs ring-4 ring-rose-500/10 border-rose-500/20'
                        }`}>
                          {colpIndividualData.progresso.msg}
                        </span>
                      </div>

                      <div className="space-y-2 text-10 font-sans text-brand-400 leading-normal">
                        <p>✓ Categoria Cadastrada: <strong className="font-bold text-indigo-400">{colpIndividualData.cat}</strong></p>
                        <p>✓ Bonificação acumulada: <strong>{fmtM(colpIndividualData.bonTotal)}</strong></p>
                        {colpIndividualData.progresso.proxima && (
                          <p>
                            ★ Alvo de Promoção: <strong className="text-brand-950">{colpIndividualData.progresso.proxima}</strong>
                            {colpIndividualData.progresso.faltaSubir !== null && (
                              <span> (Faltam {fmtM(colpIndividualData.progresso.faltaSubir)})</span>
                            )}
                          </p>
                        )}
                        {colpIndividualData.progresso.sugerePrev && (
                          <p className="text-rose-400 font-bold font-mono">⚠ Sugestão de Reposicionamento para {colpIndividualData.progresso.sugerePrev}</p>
                        )}
                      </div>
                    </div>

                    {/* Tabela de produtos itemizados */}
                    <div className="bg-brand-100/40 backdrop-blur-md rounded-2xl border border-brand-200/50 shadow-xs overflow-hidden">
                      <div className="px-4 py-3 border-b border-brand-250 bg-brand-200/30">
                        <span className="text-[10px] font-mono font-bold text-brand-800 uppercase tracking-wider">Itens e Artigos Vendidos</span>
                      </div>

                      <div className="max-h-52 overflow-y-auto divide-y divide-brand-200 text-[11px] font-sans">
                        {colpIndividualData.compras.length === 0 ? (
                          <div className="p-4 text-center text-brand-400">Nenhum produto faturado neste período</div>
                        ) : (
                          colpIndividualData.compras.map(c => (
                            <div key={c.produto} className="p-3 flex items-start justify-between">
                              <div className="max-w-[150px]">
                                <p className="font-semibold text-brand-950 leading-tight">{c.produto}</p>
                                <span className="font-mono text-[9px] text-brand-400">Qtd: {c.qtd} un. • {c.isRev ? 'Revista' : 'Livro'}</span>
                              </div>
                              <div className="text-right">
                                <p className="font-mono font-bold text-brand-950">{fmtM(c.bonTotal)}</p>
                                <p className="font-mono text-[9px] text-emerald-400">Líq: {fmtM(c.liq)}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>

                </div>

              </div>
            )}

          </motion.div>
        )}

      </main>

      {/* ---------------------------------------------------- */}
      {/* DIALOG 1: CONFIGURAÇÃO DE VALORES DAS METAS (Regra C) */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-100/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-brand-300 w-full max-w-md p-6 relative font-sans text-brand-800"
            >
              <button 
                onClick={() => setShowConfigModal(false)}
                className="absolute top-4 right-4 text-brand-400 hover:text-brand-800 font-bold font-mono text-lg transition cursor-pointer"
              >
                &times;
              </button>
              
              <div className="flex items-center space-x-2 text-brand-900 mb-4 border-b border-brand-200 pb-2">
                <Settings className="h-5 w-5 text-indigo-400" />
                <h3 className="font-display font-bold text-lg text-brand-950">Valores de Referência (Regra C)</h3>
              </div>

              <p className="text-xs text-brand-400 mb-6 font-sans leading-relaxed">
                Edite os valores nominais de Livros e Revistas para os períodos P1 (Jan–Fev) e P2 (Mar–Dez) para ajustar a fórmula de cotas da UCOB.
              </p>

              <div className="space-y-4 text-xs">
                
                {/* Período P1 */}
                <div className="space-y-2 border-b border-brand-200 pb-3">
                  <span className="font-semibold text-brand-900 uppercase tracking-wider text-[10px] font-mono block">Período P1 (Janeiro - Fevereiro)</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-brand-400 block">Unitário Livro (R$):</label>
                      <input
                        type="number"
                        step="0.01"
                        value={p1LivroInput}
                        onChange={(e) => setP1LivroInput(e.target.value)}
                        className="bg-brand-200 border border-brand-300 rounded-lg px-2.5 py-1.5 font-mono text-brand-950 focus:outline-none focus:ring-1 focus:ring-brand-400 w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-brand-400 block">Unitário Revista (R$):</label>
                      <input
                        type="number"
                        step="0.01"
                        value={p1RevistaInput}
                        onChange={(e) => setP1RevistaInput(e.target.value)}
                        className="bg-brand-200 border border-brand-300 rounded-lg px-2.5 py-1.5 font-mono text-brand-950 focus:outline-none focus:ring-1 focus:ring-brand-400 w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Período P2 */}
                <div className="space-y-2 pb-2">
                  <span className="font-semibold text-brand-900 uppercase tracking-wider text-[10px] font-mono block">Período P2 (Março - Dezembro)</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-brand-400 block">Unitário Livro (R$):</label>
                      <input
                        type="number"
                        step="0.01"
                        value={p2LivroInput}
                        onChange={(e) => setP2LivroInput(e.target.value)}
                        className="bg-brand-200 border border-brand-300 rounded-lg px-2.5 py-1.5 font-mono text-brand-950 focus:outline-none focus:ring-1 focus:ring-brand-400 w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-brand-400 block">Unitário Revista (R$):</label>
                      <input
                        type="number"
                        step="0.01"
                        value={p2RevistaInput}
                        onChange={(e) => setP2RevistaInput(e.target.value)}
                        className="bg-brand-200 border border-brand-300 rounded-lg px-2.5 py-1.5 font-mono text-brand-950 focus:outline-none focus:ring-1 focus:ring-brand-400 w-full"
                      />
                    </div>
                  </div>
                </div>

              </div>

              <div className="flex items-center space-x-2 mt-6 justify-end text-xs font-semibold border-t border-brand-200 pt-4">
                <button
                  onClick={handleResetConfig}
                  className="px-4 py-2 rounded-lg bg-brand-200 border border-brand-300 text-brand-800 hover:bg-brand-300 transition cursor-pointer"
                >
                  Valores Padrão
                </button>
                <button
                  onClick={handleSaveConfig}
                  className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition shadow-sm cursor-pointer"
                >
                  Salvar Parâmetros
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------- */}
      {/* DIALOG 2: IMPORT IMPORTAÇÃO CUSTOMIZADA */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-100/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-brand-300 w-full max-w-lg p-6 relative font-sans text-brand-800"
            >
              <button 
                onClick={() => setShowUploadModal(false)}
                className="absolute top-4 right-4 text-brand-400 hover:text-brand-800 font-bold font-mono text-lg transition cursor-pointer"
              >
                &times;
              </button>

              <div className="flex items-center space-x-2 text-brand-900 mb-2 border-b border-brand-200 pb-2">
                <UploadCloud className="h-5 w-5 text-indigo-400" />
                <h3 className="font-display font-bold text-lg text-brand-950">Carregar Planilhas de Vendas</h3>
              </div>
              <p className="text-xs text-brand-400 mb-4 font-sans leading-relaxed">
                Insira arquivos CSV separados por vírgula/ponto-e-vírgula ou dados JSON estruturados para vendas e perfis adicionais de colportores correspondentes ao banco.
              </p>

              {uploadError && (
                <div className="mb-4 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start space-x-2 text-rose-400 text-xs">
                  <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="space-y-4 text-xs font-sans">
                
                {/* Janela de Vendas */}
                <div className="space-y-1.5">
                  <label className="text-brand-900 font-mono text-[10px] uppercase font-bold tracking-wider block">Registros de Vendas (CSV ou JSON)</label>
                  <textarea
                    placeholder='Cole aqui ou digite seu lote. Exemplo CSV:
Data,Colportor,Campo,Tipo,Categoria,Produto,Qtd. Vendas,Vlr. Bonificado,Vlr. Vend. Líq.
01/03/2025,João Silva,ABC,Permanente,Licenciado,Coleção Vida,20,2400.00,1950.00'
                    value={uploadSalesRaw}
                    onChange={(e) => setUploadSalesRaw(e.target.value)}
                    className="w-full bg-brand-200 border border-brand-300 rounded-xl p-3 font-mono text-[10px] text-brand-950 focus:outline-none focus:ring-1.5 focus:ring-brand-400 h-28 leading-relaxed focus:bg-brand-200/50 transition"
                  />
                  <p className="text-[10px] text-brand-400">Suporta formatação e headers CSV originais do Hub UCOB.</p>
                </div>

                {/* Janela de Colportores */}
                <div className="space-y-1.5">
                  <label className="text-brand-900 font-mono text-[10px] uppercase font-bold tracking-wider block">Dados Cadastrais Colportores (Opcional - CSV ou JSON)</label>
                  <textarea
                    placeholder='Exemplo:
colportor,campo,tipo,categoria,ColporteurSegment,DataIngresso
João Silva,ABC,Permanente,Licenciado,Distrital de Livros,04/1994'
                    value={uploadColpRaw}
                    onChange={(e) => setUploadColpRaw(e.target.value)}
                    className="w-full bg-brand-200 border border-brand-300 rounded-xl p-3 font-mono text-[10px] text-brand-950 focus:outline-none focus:ring-1.5 focus:ring-brand-400 h-28 leading-relaxed focus:bg-brand-200/50 transition"
                  />
                  <p className="text-[10px] text-brand-400">Preencha data de ingresso e segmento para recalcular alívios e cotas proporcionais.</p>
                </div>

              </div>

              <div className="flex items-center space-x-2 mt-6 justify-end text-xs font-semibold border-t border-brand-200 pt-4">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-lg bg-brand-200 border border-brand-300 text-brand-800 hover:bg-brand-300 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDataImport}
                  className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition shadow-sm cursor-pointer"
                >
                  Importar e Atualizar
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
