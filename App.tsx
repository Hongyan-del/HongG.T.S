import React, { useState, useEffect } from 'react';
import { analyzeTrend, generateArticle } from './services/geminiService';
import { RadarState, TrendAnalysis, DrivingForce, ForceDetail, StockSuggestion } from './types';
import { PRESET_QUERIES } from './constants';
import RadarVisual from './components/RadarVisual';

type MobileTab = 'scan' | 'result' | 'invest' | 'history';

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
    showThought: false,
    history: []
  });

  const [activeMarket, setActiveMarket] = useState<'台股' | '美股'>('台股');
  const [activeTab, setActiveTab] = useState<MobileTab>('scan');
  const [isMobile, setIsMobile] = useState(false);

  // 偵測是否為行動裝置
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const savedHistory = localStorage.getItem('trend_radar_history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setState(prev => ({ ...prev, history: parsed }));
      } catch (e) {
        console.error("無法載入歷史紀錄", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('trend_radar_history', JSON.stringify(state.history));
  }, [state.history]);

  const handleScan = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setState(prev => ({ ...prev, scanning: true, error: null, result: null, articleResult: null, showThought: false }));
    try {
      const result = await analyzeTrend(searchQuery);
      setState(prev => ({ 
        ...prev, 
        result, 
        scanning: false,
        history: [result, ...prev.history].slice(0, 10)
      }));
      if (isMobile) setActiveTab('result');
    } catch (err: any) {
      setState(prev => ({ ...prev, scanning: false, error: "掃描目前受阻。請調整輸入信號後重試。" }));
    }
  };

  const loadHistoryItem = (item: TrendAnalysis) => {
    setState(prev => ({ ...prev, result: item, articleResult: null, showThought: false }));
    if (isMobile) {
      setActiveTab('result');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const renderArticleContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('# ')) return <h1 key={idx} className="text-2xl lg:text-5xl font-black text-center mb-12 text-yellow-500 serif">{line.replace('# ', '')}</h1>;
      if (line.startsWith('## ')) return <h2 key={idx} className="text-xl lg:text-3xl font-bold mt-16 mb-8 text-red-500 border-b border-yellow-900/30 pb-4 serif">{line.replace('## ', '')}</h2>;
      if (line.startsWith('> ')) return <blockquote key={idx} className="border-l-4 border-yellow-600 pl-8 my-10 italic text-zinc-400 bg-yellow-900/5 p-6 rounded-r-xl">{line.replace('> ', '')}</blockquote>;
      if (line.startsWith('* ') || line.startsWith('- ')) return <ul key={idx} className="list-disc pl-10 my-4 text-zinc-300"><li>{line.replace(/^[*|-]\s/, '')}</li></ul>;
      if (line.trim() === '') return <div key={idx} className="h-6"></div>;
      return <p key={idx} className="mb-6 text-lg lg:text-xl leading-relaxed text-justify text-zinc-200">{line}</p>;
    });
  };

  const handleDownloadArticle = () => {
    if (!state.articleResult) return;
    const htmlContent = `<html><head><meta charset='utf-8'></head><body>${state.articleResult.replace(/\n/g, '<br>')}</body></html>`;
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `趨勢報告_${state.result?.title}.doc`;
    link.click();
  };

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

  // --- 手機端底部導航列 ---
  const MobileNavBar = () => (
    <div className="fixed bottom-0 left-0 right-0 z-[150] mobile-nav-blur flex justify-around items-center px-4 py-3 lg:hidden">
      <button onClick={() => setActiveTab('scan')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'scan' ? 'text-yellow-500 scale-110' : 'text-zinc-500'}`}>
        <i className="fa-solid fa-satellite-dish text-xl"></i>
        <span className="text-[10px] font-black tracking-tighter">掃描</span>
      </button>
      <button onClick={() => setActiveTab('result')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'result' ? 'text-yellow-500 scale-110' : 'text-zinc-500'}`}>
        <i className="fa-solid fa-eye text-xl"></i>
        <span className="text-[10px] font-black tracking-tighter">洞見</span>
      </button>
      <button onClick={() => setActiveTab('invest')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'invest' ? 'text-yellow-500 scale-110' : 'text-zinc-500'}`}>
        <i className="fa-solid fa-chart-line text-xl"></i>
        <span className="text-[10px] font-black tracking-tighter">投資</span>
      </button>
      <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'history' ? 'text-yellow-500 scale-110' : 'text-zinc-500'}`}>
        <i className="fa-solid fa-clock-rotate-left text-xl"></i>
        <span className="text-[10px] font-black tracking-tighter">紀錄</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen px-4 py-8 lg:p-16 max-w-[1500px] mx-auto space-y-12 lg:space-y-24">
      {/* 頁首 */}
      <header className="flex flex-col items-center gap-6 lg:gap-8 py-6 lg:py-12 border-b-2 border-double border-yellow-700/10">
        <div className="relative inline-block px-8 lg:px-12 py-6 lg:py-8 border-2 lg:border-4 border-yellow-700/30 bg-black/60 text-center shadow-2xl rounded-[2rem] lg:rounded-[3rem]">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-700 px-4 py-1 text-[8px] lg:text-[10px] font-black text-black mono tracking-[0.4em] rounded-full shadow-lg">
            GLOBAL RADAR
          </div>
          <h1 className="text-2xl lg:text-7xl font-black tracking-[0.1em] lg:tracking-[0.25em] text-white serif uppercase">
            全球趨勢<span className="text-red-600">雷達</span>
          </h1>
          <div className="mt-3 text-[9px] lg:text-[12px] text-yellow-600 font-bold tracking-[0.4em] lg:tracking-[0.8em] uppercase opacity-80">
            格柵思維 · 戰略分析
          </div>
        </div>
        <div className="flex gap-4 lg:gap-8 scale-90 lg:scale-100">
          <div className="seal">搜尋接地：開啟</div>
          <div className="seal border-yellow-800 text-yellow-500">偵測：即時</div>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-20">
        {/* 電腦端左側側欄 或 手機端分頁顯示 */}
        <div className={`${isMobile ? (activeTab === 'scan' || activeTab === 'history' ? 'block' : 'hidden') : 'lg:col-span-4'} space-y-12`}>
          {/* 輸入區 */}
          {(activeTab === 'scan' || !isMobile) && (
            <section className="space-y-6">
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-600 flex items-center gap-3">
                <span className="w-8 h-px bg-yellow-900/50"></span> 輸入趨勢信號
              </h2>
              <div className="tang-panel p-6 lg:p-8">
                <textarea
                  value={state.query}
                  onChange={(e) => setState(prev => ({ ...prev, query: e.target.value }))}
                  placeholder="在此輸入您觀察到的市場趨勢..."
                  className="w-full h-48 lg:h-64 bg-transparent border-none focus:ring-0 text-lg lg:text-xl text-zinc-100 placeholder:text-zinc-600 font-medium leading-relaxed resize-none"
                />
              </div>
              <button
                onClick={() => handleScan(state.query)}
                disabled={state.scanning}
                className={`w-full py-5 btn-tang text-lg lg:text-xl active:scale-95 shadow-xl ${state.scanning ? 'opacity-50' : ''}`}
              >
                {state.scanning ? '數據解構中...' : '啟動掃描'}
              </button>
            </section>
          )}

          {/* 紀錄區 */}
          {(activeTab === 'history' || !isMobile) && (
            <section className="space-y-6">
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-600 flex items-center gap-3">
                <span className="w-8 h-px bg-yellow-900/50"></span> 歷史推演紀錄
              </h2>
              <div className="grid grid-cols-1 gap-4 max-h-[400px] lg:max-h-[500px] overflow-y-auto hide-scrollbar">
                {state.history.length > 0 ? state.history.map((item) => (
                  <div key={item.id} onClick={() => loadHistoryItem(item)} className={`group p-5 tang-card cursor-pointer border-l-4 transition-all ${state.result?.id === item.id ? 'border-yellow-600 bg-yellow-900/10' : 'border-zinc-800'}`}>
                    <div className="flex justify-between items-start gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-zinc-200 line-clamp-1">{item.title}</p>
                        <p className="text-[9px] mono text-zinc-500">{new Date(item.timestamp).toLocaleString()}</p>
                      </div>
                      <i className="fa-solid fa-chevron-right text-[10px] text-zinc-700 group-hover:text-yellow-600 transition-colors"></i>
                    </div>
                  </div>
                )) : <div className="text-center py-12 text-zinc-700 text-xs tracking-widest uppercase">暫無紀錄</div>}
              </div>
            </section>
          )}

          {/* 範本 */}
          {(activeTab === 'scan' || !isMobile) && (
            <section className="space-y-6">
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-600 flex items-center gap-3">
                <span className="w-8 h-px bg-yellow-900/50"></span> 快速掃描範本
              </h2>
              <div className="space-y-3">
                {PRESET_QUERIES.map((q, i) => (
                  <button key={i} onClick={() => { setState(prev => ({ ...prev, query: q })); handleScan(q); }} className="w-full text-left p-4 tang-card text-xs text-zinc-500 hover:text-yellow-500 font-medium italic leading-relaxed">
                    {q}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* 主內容區 */}
        <div className={`${isMobile ? (activeTab === 'result' || activeTab === 'invest' ? 'block' : 'hidden') : 'lg:col-span-8'} space-y-12`}>
          {state.scanning && (
            <div className="h-[60vh] flex flex-col items-center justify-center space-y-8">
              <div className="w-12 h-12 border-t-2 border-yellow-600 rounded-full animate-spin"></div>
              <p className="text-[10px] tracking-[0.5em] font-black text-yellow-600 uppercase animate-pulse">格柵思維引擎運算中...</p>
            </div>
          )}

          {!state.result && !state.scanning && activeTab === 'result' && (
            <div className="h-[50vh] flex flex-col items-center justify-center space-y-12 text-zinc-800">
              <i className="fa-solid fa-dharmachakra text-8xl opacity-10 animate-spin-slow"></i>
              <p className="text-[10px] tracking-[0.4em] font-black uppercase opacity-40">請由掃描頁面輸入信號</p>
            </div>
          )}

          {state.result && (
            <div className="space-y-12 animate-in fade-in duration-700">
              {/* 核心洞見 (僅在 result 分頁顯示) */}
              {(activeTab === 'result' || !isMobile) && (
                <article className="tang-panel p-8 lg:p-20 space-y-12">
                  <div className="space-y-8">
                    <div className="flex items-center gap-4">
                      <span className="seal">新鮮度: {state.result.dataFreshness.score}/10</span>
                      <span className="text-[10px] text-zinc-500 mono uppercase">{new Date(state.result.timestamp).toLocaleDateString()} 快照</span>
                    </div>
                    <h2 className="text-3xl lg:text-6xl font-black text-white leading-tight serif tracking-wider">{state.result.title}</h2>
                    <div className="py-8 border-y border-yellow-700/10">
                      <p className="text-xl lg:text-3xl text-zinc-200 leading-relaxed font-medium italic text-center px-4 serif uppercase tracking-wide">
                        {state.result.summary}
                      </p>
                    </div>
                  </div>

                  {/* 五大驅動力卡片 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8">
                    {(Object.entries(state.result.forces) as [DrivingForce, ForceDetail][]).map(([key, detail]) => (
                      <button key={key} onClick={() => setState(prev => ({ ...prev, selectedForceKey: key }))} className="tang-card p-6 lg:p-10 text-left space-y-4">
                        <h4 className={`text-xs font-black uppercase tracking-[0.2em] ${getForceTextColor(key)}`}>{key}</h4>
                        <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2">{detail.description}</p>
                      </button>
                    ))}
                  </div>

                  <div className="pt-8 text-center">
                    <button onClick={handleGenerateFullArticle} className="px-12 lg:px-20 py-5 lg:py-8 btn-tang text-lg lg:text-2xl shadow-2xl active:scale-95 transition-all">
                      {state.articleResult ? "檢視深度專題報告" : "生成深度專題報告"}
                    </button>
                  </div>
                </article>
              )}

              {/* 投資戰略 (僅在 invest 分頁顯示) */}
              {(activeTab === 'invest' || !isMobile) && (
                <section className="tang-panel p-8 lg:p-20 space-y-12">
                  <div className="flex flex-col lg:flex-row justify-between items-center gap-8">
                    <div className="text-center lg:text-left">
                      <h3 className="text-3xl lg:text-4xl font-black text-white serif">核心戰略佈局</h3>
                      <p className="text-[10px] text-yellow-600 tracking-[0.4em] uppercase mt-2">Strategic Portfolio</p>
                    </div>
                    <div className="flex bg-black/40 p-1 border border-yellow-700/20 rounded-full w-full lg:w-auto">
                      {['台股', '美股'].map((m) => (
                        <button key={m} onClick={() => setActiveMarket(m as any)} className={`flex-1 lg:flex-none px-8 py-2 text-xs font-black tracking-widest rounded-full transition-all ${activeMarket === m ? 'bg-yellow-700 text-black shadow-lg' : 'text-zinc-600'}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
                    {(activeMarket === '台股' ? state.result.investments.taiwanStocks : state.result.investments.usStocks).map((stock, i) => (
                      <div key={i} className="tang-card p-8 lg:p-12 space-y-8">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <p className="text-3xl lg:text-5xl font-black text-yellow-600 serif">{stock.ticker}</p>
                            <p className="text-lg text-zinc-200 font-bold">{stock.name}</p>
                          </div>
                          <div className="seal">風險 {stock.riskLevel}</div>
                        </div>
                        <p className="text-lg text-zinc-300 leading-relaxed italic border-l-2 border-yellow-700/30 pl-6 serif">{stock.logic}</p>
                        <div className="text-[11px] text-zinc-500 font-bold flex gap-2">
                          <i className="fa-solid fa-triangle-exclamation text-red-900"></i>
                          <span>{stock.risk}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 證偽思考 (僅在 result 頁底部顯示) */}
              {(activeTab === 'result' || !isMobile) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="tang-panel p-10 border-l-4 border-red-700">
                    <h4 className="text-[9px] font-black uppercase tracking-[0.4em] text-red-600 mb-6">證偽協議 (INVERSION)</h4>
                    <p className="text-lg lg:text-xl text-zinc-200 serif italic">{state.result.inversion.falsification}</p>
                  </div>
                  <div className="tang-panel p-10 border-l-4 border-yellow-700">
                    <h4 className="text-[9px] font-black uppercase tracking-[0.4em] text-yellow-600 mb-6">邊界約束 (CONSTRAINTS)</h4>
                    <p className="text-lg lg:text-xl text-zinc-200 serif italic">{state.result.inversion.physicalLimits}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* 手機底部導航 */}
      {isMobile && <MobileNavBar />}

      {/* 深度專題 Modal (手機端全屏化) */}
      {state.showArticleModal && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex items-center justify-center animate-in fade-in duration-300">
          <div className="tang-panel w-full h-full lg:max-w-7xl lg:h-[90vh] flex flex-col overflow-hidden border-none lg:border-8 border-double">
            <header className="p-6 lg:p-10 border-b border-yellow-700/20 flex justify-between items-center bg-black/60">
              <button onClick={() => setState(prev => ({ ...prev, showArticleModal: false }))} className="flex items-center gap-3 text-yellow-600">
                <i className="fa-solid fa-chevron-left"></i>
                <span className="text-xs font-black tracking-widest uppercase">返回</span>
              </button>
              <div className="text-center">
                <h2 className="text-base lg:text-3xl font-black text-white serif uppercase tracking-widest">報告詳情</h2>
              </div>
              <button onClick={handleDownloadArticle} className="text-yellow-600">
                <i className="fa-solid fa-file-arrow-down text-xl"></i>
              </button>
            </header>
            
            <div className="flex-1 overflow-y-auto p-6 lg:p-24 article-content hide-scrollbar">
              {state.generatingArticle ? (
                <div className="h-full flex flex-col items-center justify-center gap-6">
                  <div className="w-10 h-10 border-t-2 border-yellow-600 rounded-full animate-spin"></div>
                  <span className="text-[10px] text-yellow-700 font-black tracking-[0.5em] uppercase">文章編織中...</span>
                </div>
              ) : (
                <div className="pb-32 lg:pb-0">
                  {state.articleResult && renderArticleContent(state.articleResult)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 維度詳解 Modal */}
      {state.selectedForceKey && state.result?.forces[state.selectedForceKey] && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 lg:p-20 animate-in fade-in duration-300">
          <div className="tang-panel w-full h-full lg:h-auto lg:max-w-4xl flex flex-col overflow-hidden">
            <header className="p-8 border-b border-yellow-700/20 flex justify-between items-center">
              <h2 className={`text-2xl lg:text-4xl font-black serif ${getForceTextColor(state.selectedForceKey)}`}>{state.selectedForceKey}</h2>
              <button onClick={() => setState(prev => ({ ...prev, selectedForceKey: null }))} className="text-yellow-600"><i className="fa-solid fa-xmark text-3xl"></i></button>
            </header>
            <div className="flex-1 overflow-y-auto p-8 lg:p-16 space-y-12">
              <p className="text-xl lg:text-3xl text-zinc-100 serif italic leading-relaxed">{state.result.forces[state.selectedForceKey].detailedAnalysis}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10 border-t border-yellow-900/30">
                <div className="space-y-4">
                  <h5 className="text-[9px] font-black text-yellow-700 tracking-[0.4em] uppercase">實證數據</h5>
                  <p className="text-base text-zinc-400 font-medium italic">{state.result.forces[state.selectedForceKey].empiricalData}</p>
                </div>
                <div className="space-y-4">
                  <h5 className="text-[9px] font-black text-yellow-700 tracking-[0.4em] uppercase">演進路徑</h5>
                  <p className="text-base text-zinc-400 font-medium">{state.result.forces[state.selectedForceKey].futurePath}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="text-center py-12 lg:py-24 text-yellow-700/20 text-[9px] lg:text-[11px] mono uppercase tracking-[1em] border-t border-yellow-900/5">
        格柵思維分析 · 2025 · 盛唐引擎
      </footer>
    </div>
  );
};

export default App;