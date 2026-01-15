import React, { useState, useEffect } from 'react';
import { analyzeTrend, generateArticle } from './services/geminiService';
import { RadarState, TrendAnalysis, DrivingForce, ForceDetail, StockSuggestion } from './types';
import { PRESET_QUERIES } from './constants';
import RadarVisual from './components/RadarVisual';

const App: React.FC = () => {
  const [state, setState] = useState<RadarState & { 
    generatingArticle: boolean, 
    articleResult: string | null,
    showArticleModal: boolean,
    showThought: boolean
  }>({
    scanning: false,
    query: '',
    result: null,
    error: null,
    selectedForceKey: null,
    generatingArticle: false,
    articleResult: null,
    showArticleModal: false,
    showThought: false
  });

  const [activeMarket, setActiveMarket] = useState<'台股' | '美股'>('台股');

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setState(prev => ({ ...prev, selectedForceKey: null, showArticleModal: false }));
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleScan = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setState(prev => ({ ...prev, scanning: true, error: null, result: null, articleResult: null, showThought: false }));
    try {
      const result = await analyzeTrend(searchQuery);
      setState(prev => ({ ...prev, result, scanning: false }));
    } catch (err: any) {
      setState(prev => ({ 
        ...prev, 
        scanning: false, 
        error: "掃描目前受阻。請調整輸入信號後重試。" 
      }));
    }
  };

  const handleGenerateFullArticle = async () => {
    if (!state.result) return;
    if (state.articleResult) {
      setState(prev => ({ ...prev, showArticleModal: true }));
      return;
    }
    
    setState(prev => ({ ...prev, generatingArticle: true, showArticleModal: true, articleResult: null }));
    try {
      const article = await generateArticle(state.result);
      setState(prev => ({ ...prev, articleResult: article, generatingArticle: false }));
    } catch (err) {
      setState(prev => ({ ...prev, generatingArticle: false, error: "文章生成失敗。" }));
    }
  };

  const handleDownloadArticle = () => {
    if (!state.articleResult) return;
    const element = document.createElement("a");
    const file = new Blob([state.articleResult], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `【深度專題】${state.result?.title || '趨勢分析'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const closeForceModal = () => setState(prev => ({ ...prev, selectedForceKey: null }));
  const closeArticleModal = () => setState(prev => ({ ...prev, showArticleModal: false }));

  const selectedForce = state.result && state.selectedForceKey ? state.result.forces[state.selectedForceKey] : null;

  const getForceTextColor = (force: DrivingForce) => {
    switch (force) {
      case DrivingForce.ENERGY: return 'text-orange-300';
      case DrivingForce.LABOR: return 'text-sky-300';
      case DrivingForce.GEOPOLITICS: return 'text-red-400';
      case DrivingForce.ASSETS: return 'text-emerald-300';
      case DrivingForce.AGENCY: return 'text-violet-300';
      default: return 'text-zinc-400';
    }
  };

  return (
    <div className="min-h-screen p-6 lg:p-16 max-w-[1400px] mx-auto space-y-24">
      {/* 頁首 - 圓弧化 */}
      <header className="flex flex-col items-center gap-8 py-12 border-b-2 border-double border-yellow-700/10">
        <div className="relative inline-block px-12 py-8 border-4 border-yellow-700/30 bg-black/60 text-center shadow-2xl rounded-[3rem]">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-700 px-6 py-1.5 text-[10px] font-black text-black mono tracking-[0.5em] rounded-full shadow-lg">
            GLOBAL TREND RADAR
          </div>
          <h1 className="text-4xl lg:text-7xl font-black tracking-[0.25em] text-white serif uppercase">
            全球趨勢<span className="text-red-600">雷達</span>
          </h1>
          <div className="mt-5 text-[12px] text-yellow-600 font-bold tracking-[0.8em] uppercase opacity-80">
            格柵思維 · 戰略分析系統
          </div>
        </div>
        <div className="flex gap-8">
          <div className="seal">搜尋接地：開啟</div>
          <div className="seal border-yellow-800 text-yellow-500">偵測模式：即時數據</div>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-20">
        {/* 左側：輸入區 */}
        <div className="lg:col-span-4 space-y-16">
          <section className="space-y-8">
            <h2 className="text-xs font-black uppercase tracking-[0.4em] text-yellow-600 flex items-center gap-5">
              <span className="w-12 h-px bg-yellow-900/50"></span> 輸入趨勢信號
            </h2>
            <div className="tang-panel p-8">
              <textarea
                value={state.query}
                onChange={(e) => setState(prev => ({ ...prev, query: e.target.value }))}
                placeholder="在此輸入您觀察到的市場趨勢、技術變化或關鍵信號..."
                className="w-full h-64 bg-transparent border-none focus:ring-0 text-xl text-zinc-100 placeholder:text-zinc-600 font-medium leading-relaxed resize-none"
              />
            </div>
            <button
              onClick={() => handleScan(state.query)}
              disabled={state.scanning}
              className={`w-full py-6 btn-tang text-xl active:scale-95 shadow-2xl ${state.scanning ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {state.scanning ? '數據解構中...' : '啟動深度掃描'}
            </button>
          </section>

          <section className="space-y-8">
            <h2 className="text-xs font-black uppercase tracking-[0.4em] text-yellow-600 flex items-center gap-5">
              <span className="w-12 h-px bg-yellow-900/50"></span> 掃描範本
            </h2>
            <div className="space-y-4">
              {PRESET_QUERIES.map((q, i) => (
                <button
                  key={i}
                  onClick={() => { setState(prev => ({ ...prev, query: q })); handleScan(q); }}
                  className="w-full text-left p-6 tang-card text-sm text-zinc-400 hover:text-yellow-500 font-medium italic leading-relaxed"
                >
                  {q}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* 右側：結果區 */}
        <div className="lg:col-span-8">
          {state.error && <div className="p-8 border-l-4 border-red-700 bg-red-950/30 text-red-400 font-bold mb-12 animate-pulse rounded-2xl">{state.error}</div>}

          {!state.result && !state.scanning && (
            <div className="h-[600px] flex flex-col items-center justify-center space-y-12 text-zinc-800">
              <div className="relative">
                <i className="fa-solid fa-dharmachakra text-9xl opacity-10 animate-spin-slow"></i>
                <i className="fa-solid fa-compass absolute inset-0 flex items-center justify-center text-4xl opacity-20 text-yellow-800"></i>
              </div>
              <p className="text-xs tracking-[0.6em] font-black uppercase opacity-40">請於左側輸入信號，開啟趨勢解構</p>
            </div>
          )}

          {state.scanning && (
            <div className="h-[600px] flex flex-col items-center justify-center space-y-12">
              <div className="w-16 h-16 border-t-2 border-yellow-600 rounded-full animate-spin"></div>
              <p className="text-xs tracking-[0.5em] font-black text-yellow-600 uppercase">格柵思維引擎分析中...</p>
            </div>
          )}

          {state.result && (
            <div className="space-y-16 animate-in fade-in duration-1000">
              {/* AI 思考過程 */}
              {state.result.thought && (
                <section className="tang-panel border-yellow-700/20 bg-yellow-900/10 p-8 overflow-hidden">
                  <button 
                    onClick={() => setState(prev => ({ ...prev, showThought: !prev.showThought }))}
                    className="w-full flex justify-between items-center text-yellow-600 hover:text-yellow-400 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <i className="fa-solid fa-brain text-lg"></i>
                      <span className="text-xs font-black tracking-[0.5em] uppercase">格柵思維推演過程 (REASONING)</span>
                    </div>
                    <i className={`fa-solid ${state.showThought ? 'fa-chevron-up' : 'fa-chevron-down'} text-sm`}></i>
                  </button>
                  {state.showThought && (
                    <div className="mt-8 pt-8 border-t border-yellow-900/30 animate-in slide-in-from-top-4 duration-500">
                      <p className="text-lg text-zinc-200 leading-loose italic serif whitespace-pre-wrap px-2">
                        {state.result.thought}
                      </p>
                    </div>
                  )}
                </section>
              )}

              {/* 核心洞見 */}
              <article className="tang-panel p-12 lg:p-20 space-y-16">
                <div className="space-y-10">
                  <div className="flex items-center gap-6">
                    <span className="seal">新鮮度: {state.result.dataFreshness.score} / 10</span>
                    <span className="text-xs text-zinc-400 mono uppercase tracking-widest">{new Date().toLocaleDateString()} 系統快照</span>
                  </div>
                  <h2 className="text-5xl lg:text-7xl font-black text-white leading-tight serif tracking-wider">
                    {state.result.title}
                  </h2>
                  <div className="scroll-container">
                    <p className="text-2xl lg:text-3xl text-zinc-200 leading-relaxed font-medium italic text-center px-8">
                      {state.result.summary}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {(Object.entries(state.result.forces) as [DrivingForce, ForceDetail][]).map(([forceKey, detail]) => (
                    <button 
                      key={forceKey} 
                      onClick={() => setState(prev => ({ ...prev, selectedForceKey: forceKey }))}
                      className="tang-card p-10 text-left space-y-5"
                    >
                      <h4 className={`text-sm font-black uppercase tracking-[0.4em] ${getForceTextColor(forceKey)}`}>{forceKey}</h4>
                      <p className="text-base text-zinc-400 font-medium leading-relaxed line-clamp-2">{detail.description}</p>
                    </button>
                  ))}
                </div>

                <div className="pt-10 text-center flex flex-col items-center gap-6">
                  <button 
                    onClick={handleGenerateFullArticle}
                    className="px-20 py-8 btn-tang text-2xl shadow-2xl active:scale-95 transition-all"
                  >
                    {state.articleResult ? "進入深度趨勢專題" : "生成深度趨勢專題"}
                  </button>
                  {state.articleResult && (
                    <p className="text-sm text-yellow-600/80 mono uppercase tracking-[0.4em] animate-pulse">專題已編織完成</p>
                  )}
                </div>
              </article>

              {/* 投資佈局 */}
              <section className="tang-panel p-12 lg:p-20 space-y-16">
                <div className="flex flex-col lg:flex-row justify-between items-center gap-10">
                  <div className="text-center lg:text-left">
                    <h3 className="text-4xl font-black text-white serif tracking-widest">核心戰略佈局</h3>
                    <p className="text-xs text-yellow-600 tracking-[0.4em] uppercase mt-3 opacity-80">Strategic Allocation</p>
                  </div>
                  <div className="flex bg-black/60 p-1.5 border border-yellow-700/30 rounded-full">
                    {['台股', '美股'].map((m) => (
                      <button 
                        key={m}
                        onClick={() => setActiveMarket(m as any)} 
                        className={`px-12 py-3 text-sm font-black tracking-[0.4em] transition-all duration-300 rounded-full ${activeMarket === m ? 'bg-yellow-700 text-black shadow-lg scale-105' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {(activeMarket === '台股' ? state.result.investments.taiwanStocks : state.result.investments.usStocks).map((stock, i) => (
                    <div key={i} className="tang-card p-12 space-y-10">
                      <div className="flex justify-between items-start">
                        <div className="space-y-3">
                          <p className="text-5xl font-black text-yellow-600 serif">{stock.ticker}</p>
                          <p className="text-xl text-zinc-200 font-bold">{stock.name}</p>
                        </div>
                        <div className="seal">風險等級: {stock.riskLevel}</div>
                      </div>
                      <p className="text-xl text-zinc-200 leading-relaxed font-medium italic border-l-4 border-yellow-700/40 pl-8">{stock.logic}</p>
                      <div className="pt-8 border-t border-zinc-900/60 flex gap-4 items-start">
                        <i className="fa-solid fa-triangle-exclamation text-red-800 mt-1.5"></i>
                        <p className="text-sm text-zinc-400 font-bold leading-relaxed">{stock.risk}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 證偽思考 - 使用圓弧面板 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="tang-panel p-16 border-l-8 border-red-700">
                  <h4 className="text-xs font-black uppercase tracking-[0.5em] text-red-600 mb-8">證偽協議 (INVERSION)</h4>
                  <p className="text-2xl text-zinc-100 leading-relaxed font-medium serif italic">{state.result.inversion.falsification}</p>
                </div>
                <div className="tang-panel p-16 border-l-8 border-yellow-700">
                  <h4 className="text-xs font-black uppercase tracking-[0.5em] text-yellow-600 mb-8">邊界約束 (CONSTRAINTS)</h4>
                  <p className="text-2xl text-zinc-100 leading-relaxed font-medium serif italic">{state.result.inversion.physicalLimits}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 深度專題 Modal */}
      {state.showArticleModal && (
        <div className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-0 lg:p-16 animate-in fade-in zoom-in-95 duration-500">
          <div className="tang-panel w-full h-full lg:h-auto max-w-7xl lg:max-h-[95vh] flex flex-col overflow-hidden border-double border-8">
            <header className="p-12 border-b-2 border-yellow-700/20 flex justify-between items-center bg-black/40">
              <div className="flex items-center gap-10">
                <button 
                  onClick={closeArticleModal} 
                  className="group flex items-center gap-4 text-yellow-600 hover:text-white transition-all pr-8 border-r border-yellow-700/30"
                >
                  <i className="fa-solid fa-arrow-left text-2xl group-hover:-translate-x-2 transition-transform"></i>
                  <span className="text-base font-black tracking-widest">返回面板</span>
                </button>
                <div className="space-y-2 hidden sm:block">
                  <h2 className="text-3xl font-black text-white serif tracking-wider">深度趨勢專題報告</h2>
                  <p className="text-[10px] text-yellow-700 tracking-[0.6em] mono uppercase opacity-60">Synthesis Analysis Report</p>
                </div>
              </div>
              <div className="flex gap-12 items-center">
                {state.articleResult && (
                  <button onClick={handleDownloadArticle} className="text-yellow-600 text-sm font-black tracking-[0.3em] hover:text-white transition-all underline underline-offset-8 decoration-yellow-900 hidden md:block">
                    下載存檔 (.txt)
                  </button>
                )}
                <button onClick={closeArticleModal} className="text-yellow-600 hover:text-white transition-all">
                  <i className="fa-solid fa-xmark text-4xl"></i>
                </button>
              </div>
            </header>
            
            <div className="flex-1 overflow-y-auto p-12 lg:p-24 article-view relative">
              {state.generatingArticle ? (
                <div className="flex flex-col items-center justify-center h-full space-y-12 py-40">
                  <div className="w-20 h-20 border-t-2 border-yellow-600 rounded-full animate-spin"></div>
                  <p className="text-xs text-yellow-700 uppercase tracking-[1em] font-black animate-pulse">正在編織深度論述，請稍候...</p>
                </div>
              ) : (
                <div className="space-y-24 pb-24">
                  <div className="whitespace-pre-wrap leading-loose text-zinc-200">{state.articleResult}</div>
                  
                  <div className="pt-24 border-t border-yellow-900/40 flex flex-col items-center gap-12">
                    <p className="text-zinc-500 text-lg italic serif">閱讀完畢 · 建議即刻進行戰略反思</p>
                    <div className="flex gap-8">
                      <button 
                        onClick={closeArticleModal} 
                        className="px-16 py-6 btn-tang text-xl shadow-2xl active:scale-95"
                      >
                        返回戰略面板
                      </button>
                      <button 
                        onClick={() => {
                          const el = document.querySelector('.article-view');
                          if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
                        }} 
                        className="px-16 py-6 border border-yellow-700/40 text-yellow-600 text-lg font-black hover:bg-yellow-700/10 transition-all rounded-full"
                      >
                        回到頂部
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 維度詳解 Modal */}
      {state.selectedForceKey && selectedForce && (
        <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-8 lg:p-20 animate-in fade-in duration-500">
          <div className="tang-panel w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col border-4">
            <header className="p-12 border-b-2 border-yellow-700/20 flex justify-between items-center">
              <h2 className={`text-4xl font-black serif tracking-widest ${getForceTextColor(state.selectedForceKey)}`}>{state.selectedForceKey}</h2>
              <button onClick={closeForceModal} className="text-yellow-600 hover:text-white transition-all"><i className="fa-solid fa-xmark text-4xl"></i></button>
            </header>
            <div className="flex-1 overflow-y-auto p-12 lg:p-20 space-y-20">
              <section className="space-y-10">
                <p className="text-[11px] font-black text-yellow-700 uppercase tracking-[0.8em] opacity-80">底層邏輯解構</p>
                <div className="text-2xl lg:text-4xl text-zinc-100 font-medium serif leading-relaxed">{selectedForce.detailedAnalysis}</div>
              </section>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-20 pt-16 border-t border-yellow-900/30">
                <div className="space-y-8">
                  <p className="text-[11px] font-black text-yellow-700 uppercase tracking-[0.8em] opacity-80">實證數據</p>
                  <p className="text-xl text-zinc-400 font-medium italic leading-relaxed">{selectedForce.empiricalData}</p>
                </div>
                <div className="space-y-8">
                  <p className="text-[11px] font-black text-yellow-700 uppercase tracking-[0.8em] opacity-80">演進路徑</p>
                  <p className="text-xl text-zinc-400 font-medium leading-relaxed">{selectedForce.futurePath}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="text-center py-40 text-yellow-700/40 text-[11px] mono uppercase tracking-[1.5em] border-t border-yellow-900/10">
        格柵思維分析系統 · 2024 · 盛唐引擎驅動
      </footer>
    </div>
  );
};

export default App;