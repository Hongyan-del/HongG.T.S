import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { TrendAnalysis, DrivingForce } from "../types";

const cleanJsonResponse = (text: string) => {
  return text.replace(/```json\n?|```/g, '').trim();
};

const extractThought = (response: any): string => {
  const parts = response.candidates?.[0]?.content?.parts || [];
  return parts
    .filter((part: any) => part.thought)
    .map((part: any) => part.thought)
    .join("\n");
};

export const analyzeTrend = async (query: string): Promise<TrendAnalysis> => {
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
    id: crypto.randomUUID(),
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
    1. 使用 Markdown 格式：標題請用 # 與 ##，重點與列表請用 *，引用請用 >。
    2. 標題：起一個具有震懾力、大師感的專欄標題。
    3. 導讀：用一個具體的場景或生活例子切入。
    4. 格柵拆解：將五大驅動力融合進敘事，分析其背後的跨學科邏輯。
    5. 投資者的指南針：根據數據中的投資佈局，詳細解釋其背後的戰略價值。
    6. 證偽思考：引用證偽協議與物理極限。
    7. 結論：總結並給予行動啟發。
    
    寫作風格：查理·蒙格風格，深刻、諷刺且富有理性。必須超過 1000 字繁體中文。
    
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
