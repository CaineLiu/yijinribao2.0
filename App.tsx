
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { cleanReportData, ReportMode } from './services/geminiService.ts';
import { Button } from './components/Button.tsx';
import { DEFAULT_PUBLIC_STAFF, DEFAULT_PRIVATE_STAFF, DEFAULT_IP_STAFF, DEFAULT_IPS, EXAMPLE_PROMPT_1 } from './constants.ts';

const SettingsIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
const ClipboardIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>;
const DownloadIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
const CheckIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500"><polyline points="20 6 9 17 4 12"></polyline></svg>;
const TrashIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const KeyIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.778-7.778zM12 2l.792.792c.03.03.05.07.058.113l.43 2.374c.014.078.08.134.158.132l2.583-.06c.044-.001.087.016.117.047l1.397 1.397c.03.03.048.073.047.117l-.06 2.583c-.002.078.054.144.132.158l2.374.43c.043.008.083.028.113.058L22 12l-10 10"></path></svg>;

const PUBLIC_HEADERS = ["日期", "运营人", "IP", "封号", "可用", "剪辑", "审核", "发布", "文案", "总客资"];
const PRIVATE_HEADERS = ["日期", "运营人", "新分配", "新微信", "总客资", "以往未接", "今日未接", "无效", "加微", "签约", "上门/操作", "放款"];

const LOADING_STEPS = [
  "正在初始化清洗引擎...",
  "正在识别数据模式...",
  "正在执行智能文本校对...",
  "正在提取运营人指标...",
  "正在格式化 TSV 数据表...",
  "正在进行最后的合规性检查...",
  "清洗即将完成..."
];

function App() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [activeMode, setActiveMode] = useState<ReportMode>('public');
  const [forcedMode, setForcedMode] = useState<'auto' | ReportMode>('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState(LOADING_STEPS[0]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const progressInterval = useRef<number | null>(null);
  const stepInterval = useRef<number | null>(null);

  const [publicStaff, setPublicStaff] = useState(() => localStorage.getItem('report_public_staff') || DEFAULT_PUBLIC_STAFF);
  const [privateStaff, setPrivateStaff] = useState(() => localStorage.getItem('report_private_staff') || DEFAULT_PRIVATE_STAFF);
  const [ipStaff, setIpStaff] = useState(() => localStorage.getItem('report_ip_staff') || DEFAULT_IP_STAFF);
  const [ipList, setIpList] = useState(() => localStorage.getItem('report_ip_list') || DEFAULT_IPS);
  const [customApiKey, setCustomApiKey] = useState(() => localStorage.getItem('report_custom_api_key') || '');

  useEffect(() => {
    localStorage.setItem('report_public_staff', publicStaff);
    localStorage.setItem('report_private_staff', privateStaff);
    localStorage.setItem('report_ip_staff', ipStaff);
    localStorage.setItem('report_ip_list', ipList);
    localStorage.setItem('report_custom_api_key', customApiKey);
  }, [publicStaff, privateStaff, ipStaff, ipList, customApiKey]);

  const currentProcessingStaffList = useMemo(() => {
    if (forcedMode === 'public') return publicStaff;
    if (forcedMode === 'private') return privateStaff;
    if (forcedMode === 'ip') return ipStaff;
    return `${publicStaff}, ${privateStaff}, ${ipStaff}`;
  }, [forcedMode, publicStaff, privateStaff, ipStaff]);

  const startLoadingSimulation = () => {
    setProgress(0);
    setLoadingText(LOADING_STEPS[0]);
    
    // 进度条模拟：先快后慢
    progressInterval.current = window.setInterval(() => {
      setProgress(prev => {
        if (prev < 30) return prev + 2;
        if (prev < 70) return prev + 0.5;
        if (prev < 92) return prev + 0.1;
        return prev;
      });
    }, 100);

    // 文案切换模拟
    let step = 0;
    stepInterval.current = window.setInterval(() => {
      step = (step + 1) % LOADING_STEPS.length;
      setLoadingText(LOADING_STEPS[step]);
    }, 2500);
  };

  const stopLoadingSimulation = (success = true) => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    if (stepInterval.current) clearInterval(stepInterval.current);
    if (success) {
      setProgress(100);
      setTimeout(() => setProgress(0), 1000);
    } else {
      setProgress(0);
    }
  };

  const handleProcess = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setError(null);
    setCopied(false);
    startLoadingSimulation();

    try {
      const { text, mode } = await cleanReportData(
        inputText, 
        currentProcessingStaffList, 
        ipList, 
        forcedMode, 
        customApiKey
      );
      setOutputText(text);
      setActiveMode(mode);
      stopLoadingSimulation(true);
    } catch (err: any) {
      setError(err.message || "清洗引擎连接失败。");
      stopLoadingSimulation(false);
    } finally {
      setIsLoading(false);
    }
  };

  const tableData = useMemo(() => {
    if (!outputText) return [];
    return outputText.split('\n')
      .map(line => line.split('\t').map(cell => cell.trim()))
      .filter(cells => cells.length > 1);
  }, [outputText]);

  return (
    <div className="app-wrapper">
      <nav className="app-nav">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-xl">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-800 tracking-tight leading-none">日报智能清洗</h1>
              <span className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mt-1 inline-block">Enterprise Engine v3.2</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl transition-all shadow-sm">
              <SettingsIcon />
              <span className="text-xs font-bold hidden sm:inline">配置中心</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col lg:flex-row gap-8 min-h-0">
        <section className="flex-1 glass-card animate-slide-up bg-white">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">原始文本输入</h2>
            <button onClick={() => setInputText('')} className="text-slate-400 hover:text-rose-500 transition-colors"><TrashIcon /></button>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="在此粘贴日报..."
            className="input-area flex-1 focus:bg-indigo-50/10 transition-colors"
          />
          <div className="p-6 bg-slate-50 border-t border-slate-100">
             <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 custom-scroll">
              {(['auto', 'public', 'private', 'ip'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setForcedMode(m)}
                  className={`px-4 py-2 text-[11px] font-black rounded-xl border transition-all whitespace-nowrap ${
                    forcedMode === m ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {m === 'auto' ? '智能识别' : m === 'public' ? '公域' : m === 'private' ? '私域' : 'IP团队'}
                </button>
              ))}
            </div>
            <Button onClick={handleProcess} isLoading={isLoading} disabled={!inputText.trim()} className="w-full h-14 shadow-indigo-200 shadow-xl">
              立即清洗数据
            </Button>
          </div>
        </section>

        <section className="flex-[1.8] glass-card animate-slide-up bg-white relative">
          {/* 可视化进度条 */}
          {progress > 0 && (
            <div className="absolute top-0 left-0 right-0 z-50 overflow-hidden h-1">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 transition-all duration-300 ease-out"
                style={{ width: `${progress}%`, backgroundSize: '200% 100%', animation: 'shimmer 2s infinite linear' }}
              />
            </div>
          )}

          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30 shrink-0">
            <div className="flex items-center gap-3">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">清洗结果 (TSV)</h2>
              {outputText && !isLoading && (
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[10px] font-black uppercase tracking-widest">
                  清洗完成
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button disabled={!outputText} className={`p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:border-indigo-400 hover:text-indigo-600 transition-all ${!outputText ? 'opacity-30 cursor-not-allowed' : ''}`}>
                <DownloadIcon />
              </button>
              <button 
                onClick={() => {navigator.clipboard.writeText(outputText); setCopied(true); setTimeout(() => setCopied(false), 2000);}} 
                disabled={!outputText}
                className={`btn-modern py-2.5 px-4 shadow-sm ${!outputText ? 'opacity-30 cursor-not-allowed' : ''} ${copied ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-900 text-white'}`}
              >
                {copied ? <CheckIcon /> : <ClipboardIcon />}
                {copied ? '已复制' : '复制数据'}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto custom-scroll flex flex-col">
            {error ? (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                </div>
                <h3 className="text-lg font-extrabold text-slate-800 mb-2">服务连接异常</h3>
                <p className="text-sm text-slate-400 mb-8 max-w-sm mx-auto leading-relaxed">{error}</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button onClick={() => setIsSettingsOpen(true)} variant="outline">检查配置中心</Button>
                  <Button onClick={handleProcess}>重新尝试</Button>
                </div>
              </div>
            ) : isLoading ? (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center animate-pulse">
                <div className="w-20 h-20 relative flex items-center justify-center mb-6">
                   <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                   <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                   <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-indigo-600"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"></path></svg>
                </div>
                <h3 className="text-lg font-extrabold text-slate-800 mb-2 tracking-tight">{loadingText}</h3>
                <p className="text-xs text-slate-400 font-medium">正在调配 Gemini 3.0 超大规模模型能力...</p>
              </div>
            ) : outputText ? (
              <div className="min-w-max">
                <table className="data-table">
                  <thead>
                    <tr>{(activeMode === 'private' ? PRIVATE_HEADERS : PUBLIC_HEADERS).map((h, i) => <th key={i}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {tableData.map((row, rI) => <tr key={rI} className="hover:bg-slate-50/50 transition-colors">{row.map((cell, cI) => <td key={cI}>{cell || '-'}</td>)}</tr>)}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 p-12 opacity-50">
                <ClipboardIcon />
                <p className="mt-4 font-bold tracking-tight">清洗结果将在此呈现</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)}></div>
          <div className="bg-white rounded-[24px] w-full max-w-2xl shadow-2xl relative overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">配置中心</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-white rounded-full transition-all border border-transparent hover:border-slate-200">✕</button>
            </div>
            
            <div className="p-8 space-y-8 overflow-y-auto custom-scroll">
              <div className="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                    <KeyIcon /> 个人 API Key (可选)
                  </label>
                  <input 
                    type="password"
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    placeholder="输入您的 Gemini Key"
                    className="w-full p-3 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-sm outline-none"
                  />
                  <p className="text-[10px] text-indigo-400 italic font-medium leading-relaxed">留空则使用系统内置 Key。部署在 Zeabur 后通常可直接访问。</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-500 uppercase">公域团队名单</label>
                    <textarea value={publicStaff} onChange={(e) => setPublicStaff(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl h-24 text-sm focus:bg-white transition-all outline-none" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-500 uppercase">私域团队名单</label>
                    <textarea value={privateStaff} onChange={(e) => setPrivateStaff(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl h-24 text-sm focus:bg-white transition-all outline-none" />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-500 uppercase">账号资产库 (IP/公域匹配用)</label>
                  <textarea value={ipList} onChange={(e) => setIpList(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl h-24 text-sm focus:bg-white transition-all outline-none" />
                </div>
              </div>
            </div>
            
            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
              <span className="text-[10px] text-slate-400 font-medium">🛡️ 配置信息仅保存在您的浏览器本地缓存中</span>
              <Button onClick={() => setIsSettingsOpen(false)} className="w-full sm:w-auto px-12 h-12 rounded-xl">确认并保存</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
