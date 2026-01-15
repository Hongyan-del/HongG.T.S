
export enum DrivingForce {
  ENERGY = "能源與物理約束",
  LABOR = "勞動力與自動化",
  GEOPOLITICS = "地緣政治離婚",
  ASSETS = "數位化實體資產",
  AGENCY = "智能代理化"
}

export interface ForceDetail {
  description: string;
  detailedAnalysis: string;
  empiricalData: string;
  futurePath: string;
}

export interface StockSuggestion {
  ticker: string;
  name: string;
  logic: string;
  risk: string;
  riskLevel: number; // 1 (low) to 5 (high)
  correlatedForce: DrivingForce;
}

export interface InvestmentAnalysis {
  taiwanStocks: StockSuggestion[];
  usStocks: StockSuggestion[];
  strategicSummary: string;
}

export interface GroundingSource {
  title?: string;
  uri?: string;
}

export interface TrendAnalysis {
  id: string; // 唯一識別碼
  title: string;
  summary: string;
  thought?: string; // AI 的思考推演過程
  forces: {
    [key in DrivingForce]: ForceDetail;
  };
  inversion: {
    falsification: string;
    physicalLimits: string;
  };
  investments: InvestmentAnalysis;
  sources: GroundingSource[];
  timestamp: string;
  dataFreshness: {
    score: number; // 1-10
    reason: string;
    lastUpdatedInfo: string;
  };
}

export interface RadarState {
  scanning: boolean;
  query: string;
  result: TrendAnalysis | null;
  error: string | null;
  selectedForceKey: DrivingForce | null;
  history: TrendAnalysis[]; // 歷史紀錄列表
}
