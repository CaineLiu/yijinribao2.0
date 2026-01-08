
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { cleanReportDataStream, ReportMode } from './services/geminiService.ts';
import { Button } from './components/Button.tsx';
import { DEFAULT_PUBLIC_STAFF, DEFAULT_PRIVATE_STAFF, DEFAULT_IP_STAFF, DEFAULT_IPS } from './constants.ts';

const SettingsIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
const ClipboardIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>;
const CheckIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500"><polyline points="20 6 9 17 4 12"></polyline></svg>;
const TrashIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const KeyIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.778-7.778zM12 2l.792.792c.03.03.05.07.058.113l.43 2.374c.014.078.08.134.158.132l2.583-.06c.044-.001.087.016.117.047l1.397 1.397c.043.03.05.073.047.117l-.06 2.583c-.002.078.054.144.132.158l2.374.43c.043.008.083.028.113.058L22 12l-10 10"></path></svg>;

const PUBLIC_HEADERS = ["日期", "运营人", "IP", "封号", "可用", "剪辑", "审核", "发布", "文案", "总客资"];
const PRIVATE_HEADERS = ["日期", "运营人", "新分配", "新微信", "总客资", "以往未接", "今日未接", "无效", "加微", "签约", "上门/操作", "放款"];

function App() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [activeMode, setActiveMode] = useState<ReportMode>('public');
  const [forcedMode, setForcedMode] = useState<'auto' | ReportMode>('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const progressInterval = useRef<number | null>(null);

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

  const handleProcess = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setError(null);
    setCopied(false);
    setOutputText('');
    setProgress(20);

    progressInterval.current = window.setInterval(() => {
      setProgress(prev => (prev < 90 ? prev + 2 : prev));
    }, 200);

    try {
      await cleanReportDataStream(
        inputText, 
        currentProcessingStaffList, 
        ipList, 
        forcedMode, 
        customApiKey,
        (text, mode) => {
          setOutputText(text);
          setActiveMode(mode);
          setProgress(95);
        }
      );
      if (progressInterval.current) clearInterval(progressInterval.current);
      setProgress(100);
      setTimeout(() => setProgress(0), 800);
    } catch (err: any) {
      if (progressInterval.current) clearInterval(progressInterval.current);
      setError(err.message);
      setProgress(0);
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
               <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-800 tracking-tight leading-none">日报智能清洗</h1>
              <span className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mt-1 inline-block">Enterprise Engine v3.5</span>
            </div>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl transition-all shadow-sm hover:shadow-md hover:border-indigo-200">
            <SettingsIcon />
            <span className="text-xs font-bold">配置中心</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col lg:flex-row gap-8 min-h-0">
        <section className="flex-1 glass-card animate-slide-up bg-white">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">原始文本输入</h2>
            <button onClick={() => setInputText('')} className="text-slate-400 hover:text-rose-500 transition-colors p-1"><TrashIcon /></button>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="在此粘贴非结构化日报..."
            className="input-area flex-1 focus:bg-indigo-50/5 transition-colors"
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
                  {m === 'auto' ? '智能识别' : m === 'public' ? '公域模式' : m === 'private' ? '私域模式' : 'IP团队模式'}
                </button>
              ))}
            </div>
            <Button onClick={handleProcess} isLoading={isLoading} disabled={!inputText.trim()} className="w-full h-14 shadow-indigo-100 shadow-xl">
              立即清洗数据
            </Button>
          </div>
        </section>

        <section className="flex-[1.8] glass-card animate-slide-up bg-white relative">
          {progress > 0 && (
            <div className="absolute top-0 left-0 right-0 z-50 h-1 overflow-hidden">
              <div 
                className="h-full bg-indigo-600 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">清洗结果 (TSV)</h2>
            <button 
              onClick={() => {navigator.clipboard.writeText(outputText); setCopied(true); setTimeout(() => setCopied(false), 2000);}} 
              disabled={!outputText}
              className={`btn-modern py-2 px-4 shadow-sm ${!outputText ? 'opacity-30' : ''} ${copied ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-900 text-white'}`}
            >
              {copied ? <CheckIcon /> : <ClipboardIcon />}
              {copied ? '已复制' : '复制数据'}
            </button>
          </div>

          <div className="flex-1 overflow-auto custom-scroll flex flex-col">
            {error ? (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center animate-slide-up">
                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6">
                   <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-3">服务连接异常</h3>
                <p className="text-sm text-slate-400 mb-8 max-w-sm mx-auto leading-relaxed">
                  {error.includes("API_KEY") ? "未检测到有效的 API Key。请在配置中心检查您的个人密钥是否正确。" : error}
                </p>
                <div className="flex gap-4">
                  <button onClick={() => setIsSettingsOpen(true)} className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all">检查配置中心</button>
                  <Button onClick={handleProcess} className="px-8 shadow-indigo-100 shadow-xl">重新尝试</Button>
                </div>
              </div>
            ) : outputText || isLoading ? (
              <div className="min-w-max">
                <table className="data-table">
                  <thead>
                    <tr>{(activeMode === 'private' ? PRIVATE_HEADERS : PUBLIC_HEADERS).map((h, i) => <th key={i}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {tableData.map((row, rI) => (
                      <tr key={rI} className="hover:bg-indigo-50/30 transition-colors animate-slide-up">
                        {row.map((cell, cI) => <td key={cI}>{cell || '0'}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 p-12 opacity-40">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <ClipboardIcon />
                </div>
                <p className="font-bold tracking-tight">等待输入数据进行清洗...</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)}></div>
          <div className="bg-white rounded-[24px] w-full max-w-2xl shadow-2xl relative overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">配置中心</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-200 rounded-full transition-all">✕</button>
            </div>
            
            <div className="p-8 space-y-8 overflow-y-auto custom-scroll">
              <div className="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                    <KeyIcon /> 个人 API Key (推荐)
                  </label>
                  <input 
                    type="password"
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    placeholder="在此输入您的 Gemini API Key"
                    className="w-full p-4 bg-white border border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 text-sm outline-none transition-all shadow-inner"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`w-2 h-2 rounded-full ${customApiKey ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{customApiKey ? '已识别到自定义密钥' : '未检测到密钥，将尝试使用环境默认密钥'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-500 uppercase">公域团队名单</label>
                  <textarea value={publicStaff} onChange={(e) => setPublicStaff(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl h-24 text-xs outline-none focus:border-indigo-400 transition-all" />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-500 uppercase">私域团队名单</label>
                  <textarea value={privateStaff} onChange={(e) => setPrivateStaff(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl h-24 text-xs outline-none focus:border-indigo-400 transition-all" />
                </div>
              </div>
            </div>
            
            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end shrink-0">
              <Button onClick={() => setIsSettingsOpen(false)} className="px-12 h-12 rounded-xl">完成配置并保存</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
