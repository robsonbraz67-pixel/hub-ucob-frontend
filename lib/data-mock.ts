// lib/data-mock.ts

export interface SaleRecord {
  Data: string;
  Colportor: string;
  Campo: string;
  Tipo: 'Permanente' | 'Estudante';
  Categoria: 'Iniciante' | 'Aspirante' | 'Licenciado' | 'Credenciado';
  Produto: string;
  'Qtd. Vendas': number;
  'Vlr. Bonificado': number;
  'Vlr. Vend. Líq.': number;
  CostCenterCode: string;
  CostCenterName: string;
}

export interface ColportorProfile {
  colportor: string;
  campo: string;
  tipo: 'Permanente' | 'Estudante';
  categoria: 'Iniciante' | 'Aspirante' | 'Licenciado' | 'Credenciado';
  ColporteurSegment?: string;
  DataIngresso?: string;
}

export const SAMPLE_COLPORTORES: ColportorProfile[] = [
  {
    colportor: "João Silva",
    campo: "ABC",
    tipo: "Permanente",
    categoria: "Licenciado",
    ColporteurSegment: "Distrital de Livros",
    DataIngresso: "04/1994"
  },
  {
    colportor: "Maria Santos",
    campo: "ABC",
    tipo: "Permanente",
    categoria: "Credenciado",
    ColporteurSegment: "Distrital de Revistas",
    DataIngresso: "10/2010"
  },
  {
    colportor: "Pedro Oliveira",
    campo: "ABC",
    tipo: "Permanente",
    categoria: "Aspirante",
    ColporteurSegment: "Revistas",
    DataIngresso: "12/2021"
  },
  {
    colportor: "Lucas Ferreira",
    campo: "ABC",
    tipo: "Permanente",
    categoria: "Iniciante",
    ColporteurSegment: "Distrital de Livros",
    DataIngresso: "01/2025"
  },
  {
    colportor: "Ana Souza",
    campo: "DEF",
    tipo: "Permanente",
    categoria: "Credenciado",
    ColporteurSegment: "Livros e Revistas",
    DataIngresso: "05/2012"
  },
  {
    colportor: "Marcos Lima",
    campo: "DEF",
    tipo: "Permanente",
    categoria: "Licenciado",
    ColporteurSegment: "Distrital de Livros",
    DataIngresso: "03/2018"
  },
  {
    colportor: "Julia Costa",
    campo: "DEF",
    tipo: "Permanente",
    categoria: "Iniciante",
    ColporteurSegment: "Revistas",
    DataIngresso: "02/2026"
  },
  {
    colportor: "Carlos Ribeiro",
    campo: "GHI",
    tipo: "Permanente",
    categoria: "Aspirante",
    ColporteurSegment: "Distrital de Revistas",
    DataIngresso: "08/2023"
  },
  {
    colportor: "Fernanda Alves",
    campo: "GHI",
    tipo: "Permanente",
    categoria: "Credenciado",
    ColporteurSegment: "Livros e Revistas",
    DataIngresso: "11/2005"
  },
  {
    colportor: "Sandra Barbosa",
    campo: "GHI",
    tipo: "Permanente",
    categoria: "Licenciado",
    ColporteurSegment: "Distrital de Livros",
    DataIngresso: "06/2015"
  },
  {
    colportor: "Felipe Andrade",
    campo: "ABC",
    tipo: "Estudante",
    categoria: "Iniciante",
    ColporteurSegment: "Livros e Revistas",
    DataIngresso: "01/2026"
  },
  {
    colportor: "Amanda Teles",
    campo: "DEF",
    tipo: "Estudante",
    categoria: "Aspirante",
    ColporteurSegment: "Revistas",
    DataIngresso: "12/2025"
  }
];

// Helper to generate a sales record
function createSale(
  day: number,
  month: number,
  year: number,
  colportor: ColportorProfile,
  product: string,
  qty: number,
  bonusVal: number,
  liqVal: number,
  ccCode = "133411",
  ccName = "Publicações UCOB"
): SaleRecord {
  const padD = String(day).padStart(2, '0');
  const padM = String(month).padStart(2, '0');
  return {
    Data: `${padD}/${padM}/${year}`,
    Colportor: colportor.colportor,
    Campo: colportor.campo,
    Tipo: colportor.tipo,
    Categoria: colportor.categoria,
    Produto: product,
    'Qtd. Vendas': qty,
    'Vlr. Bonificado': bonusVal,
    'Vlr. Vend. Líq.': liqVal,
    CostCenterCode: ccCode,
    CostCenterName: ccName
  };
}

// Generate rich sales data across 2025 and 2026
const generatedSales: SaleRecord[] = [];

// Let's populate sales month-by-month for 2025 and 2026
const years = [2025, 2026];
const monthsList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const products = [
  { name: "Coleção Vida e Saúde", isRev: false, val: 220 },
  { name: "Livro O Grande Conflito", isRev: false, val: 120 },
  { name: "Revista Vida Saudável - Assinante", isRev: true, val: 160 },
  { name: "Revista Nosso Amiguinho - Assinante", isRev: true, val: 153 },
  { name: "Bíblia Ilustrada Família", isRev: false, val: 300 },
  { name: "Pão Diário Devocional", isRev: false, val: 95 }
];

// Seed to make generation slightly randomized but consistent
let seed = 42;
function random() {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

years.forEach(yr => {
  monthsList.forEach(mo => {
    SAMPLE_COLPORTORES.forEach(c => {
      // Don't sell anything if they entered after this month/year
      if (c.DataIngresso) {
        const [iMo, iYr] = c.DataIngresso.split('/').map(Number);
        if (yr < iYr || (yr === iYr && mo < iMo)) {
          return; // Not active yet
        }
      }

      // Decide how active the colportor is (random factor based on category)
      let activityFactor = 0.5;
      if (c.categoria === 'Credenciado') activityFactor = 0.85;
      else if (c.categoria === 'Licenciado') activityFactor = 0.75;
      else if (c.categoria === 'Aspirante') activityFactor = 0.6;
      else if (c.categoria === 'Iniciante') activityFactor = 0.45;

      if (random() < activityFactor) {
        // Did 1 to 3 distinct product orders this month
        const ordersCount = Math.floor(random() * 3) + 1;
        for (let i = 0; i < ordersCount; i++) {
          const prodObj = products[Math.floor(random() * products.length)];
          const qty = Math.floor(random() * 25) + 3;
          let unitPrice = prodObj.val;
          
          // Adjust price slightly for variance
          unitPrice = Math.round(unitPrice * (0.9 + random() * 0.2));

          const vlrBonificado = qty * unitPrice;
          const vlrVendLiq = Math.round(vlrBonificado * 0.82); // liquids are usually a fraction after administrative deductions
          
          const day = Math.floor(random() * 25) + 2;

          generatedSales.push(
            createSale(day, mo, yr, c, prodObj.name, qty, vlrBonificado, vlrVendLiq)
          );
        }
      }
    });
  });
});

export const SAMPLE_DADOS: SaleRecord[] = generatedSales;
