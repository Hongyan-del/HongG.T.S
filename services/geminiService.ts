import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { TrendAnalysis, DrivingForce } from "../types";

const cleanJsonResponse = (text: string) => {
  return text.replace(/```json\n?|```/g, '').trim();
};

/**
 * 提取模型的回傳思考過程 (Reasoning/Thought)
 */
const extractThought = (response: any): string => {
  const parts = response.candidates?.[0]?.content?.parts || [];
  return parts
    .filter((part: any) => part.thought)
    .map((part: any) => part.thought)
    .join("\n");
};

export const analyzeTrend = async (query: string): Promise<TrendAnalysis> => {
  // 嚴格依照指南：在每次呼叫前初始化 GoogleGenAI
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `[目前的真實日期: ${new Date().toLocaleDateString()}] \n\n 使用者輸入信號: ${query}`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 4000 },
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          forces: {
            type: Type.OBJECT,
            properties: {
              [DrivingForce.ENERGY]: { 
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  detailedAnalysis: { type: Type.STRING },
                  empiricalData: { type: Type.STRING },
                  futurePath: { type: Type.STRING }
                },
                required: ["description", "detailedAnalysis", "empiricalData", "futurePath"]
              },
              [DrivingForce.LABOR]: { 
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  detailedAnalysis: { type: Type.STRING },
                  empiricalData: { type: Type.STRING },
                  futurePath: { type: Type.STRING }
                },
                required: ["description", "detailedAnalysis", "empiricalData", "futurePath"]
              },
              [DrivingForce.GEOPOLITICS]: { 
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  detailedAnalysis: { type: Type.STRING },
                  empiricalData: { type: Type.STRING },
                  futurePath: { type: Type.STRING }
                },
                required: ["description", "detailedAnalysis", "empiricalData", "futurePath"]
              },
              [DrivingForce.ASSETS]: { 
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  detailedAnalysis: { type: Type.STRING },
                  empiricalData: { type: Type.STRING },
                  futurePath: { type: Type.STRING }
                },
                required: ["description", "detailedAnalysis", "empiricalData", "futurePath"]
              },
              [DrivingForce.AGENCY]: { 
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  detailedAnalysis: { type: Type.STRING },
                  empiricalData: { type: Type.STRING },
                  futurePath: { type: Type.STRING }
                },
                required: ["description", "detailedAnalysis", "empiricalData", "futurePath"]
              },
            },
            required: Object.values(DrivingForce)
          },
          inversion: {
            type: Type.OBJECT,
            properties: {
              falsification: { type: Type.STRING },
              physicalLimits: { type: Type.STRING },
            },
            required: ["falsification", "physicalLimits"]
          },
          investments: {
            type: Type.OBJECT,
            properties: {
              taiwanStocks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    ticker: { type: Type.STRING },
                    name: { type: Type.STRING },
                    logic: { type: Type.STRING },
                    risk: { type: Type.STRING },
                    riskLevel: { type: Type.INTEGER },
                    correlatedForce: { type: Type.STRING, enum: Object.values(DrivingForce) }
                  },
                  required: ["ticker", "name", "logic", "risk", "riskLevel", "correlatedForce"]
                }
              },
              usStocks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    ticker: { type: Type.STRING },
                    name: { type: Type.STRING },
                    logic: { type: Type.STRING },
                    risk: { type: Type.STRING },
                    riskLevel: { type: Type.INTEGER },
                    correlatedForce: { type: Type.STRING, enum: Object.values(DrivingForce) }
                  },
                  required: ["ticker", "name", "logic", "risk", "riskLevel", "correlatedForce"]
                }
              },
              strategicSummary: { type: Type.STRING }
            },
            required: ["taiwanStocks", "usStocks", "strategicSummary"]
          },
          dataFreshness: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.INTEGER },
              reason: { type: Type.STRING },
              lastUpdatedInfo: { type: Type.STRING }
            },
            required: ["score", "reason", "lastUpdatedInfo"]
          }
        },
        required: ["title", "summary", "forces", "inversion", "investments", "dataFreshness"]
      }
    }
  });

  // 使用指南推薦的 .text 屬性（注意：思考過程通常不會包含在 .text 中，需手動提取）
  const rawText = response.text || "{}";
  const thought = extractThought(response);
  const jsonStr = cleanJsonResponse(rawText);
  const rawData = JSON.parse(jsonStr);
  
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources = groundingChunks
    .map((chunk: any) => ({
      title: chunk.web?.title || "即時參考來源",
      uri: chunk.web?.uri
    }))
    .filter((s: any) => s.uri);

  return {
    ...rawData,
    thought,
    sources,
    timestamp: new Date().toISOString()
  };
};

export const generateArticle = async (data: TrendAnalysis): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const prompt = `
    請根據以下「全球趨勢雷達分析數據」撰寫一篇深度專題文章。
    
    分析主題：${data.title}
    
    文章架構要求：
    1. 標題：起一個具有震懾力、大師感的專欄標題。
    2. 導讀：用一個具體的場景或生活例子切入，帶出目前全球正在發生的巨變。
    3. 格柵拆解：將五大驅動力融合進敘事，不要死板條列。用「故事＋邏輯」的方式解釋為什麼 ${Object.values(DrivingForce).join('、')} 正在交織。
    4. 投資者的指南針：根據數據中的投資佈局，詳細解釋其背後的戰略價值。
    5. 證偽思考：引用證偽協議與物理極限，展現格柵思維的理性與不盲從。
    6. 結論：給讀者一段具備行動啟發性的總結。
    
    寫作風格：生動、白話但具備專業深度（查理·蒙格風格）。必須超過 1000 字繁體中文。
    
    詳細數據參考：
    摘要：${data.summary}
    投資戰略：${data.investments.strategicSummary}
    證偽觀點：${data.inversion.falsification}
    物理極限：${data.inversion.physicalLimits}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      temperature: 0.8,
      topP: 0.95,
      topK: 40,
      thinkingConfig: { thinkingBudget: 4000 }
    }
  });

  return response.text || "深度文章生成中斷，請重試。";
};
