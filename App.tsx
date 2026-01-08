
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { cleanReportData, ReportMode } from './services/geminiService.ts';
import { Button } from './components/Button.tsx';
import { DEFAULT_PUBLIC_STAFF, DEFAULT_PRIVATE_STAFF, DEFAULT_IP_STAFF, DEFAULT_IPS } from './constants.ts';

const SettingsIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
const ClipboardIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>;
const CheckIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500"><polyline points="20 6 9 17 4 12"></polyline></svg>;
const TrashIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const MagicIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>;
const AlertIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;

const PUBLIC_HEADERS = ["日期", "运营人", "IP", "封号", "可用", "剪辑", "审核", "发布", "文案", "总客资"];
const PRIVATE_HEADERS = ["日期", "运营人", "新分配", "新微信", "总客资", "以往未接", "今日未接", "无效", "加微", "签约", "上门/操作", "放款"];

function App() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [activeMode, setActiveMode] = useState<ReportMode>('public');
  const [forcedMode, setForcedMode] = useState<'auto' | ReportMode>('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Separate staff lists for each team
  const [publicStaff, setPublicStaff] = useState(() => localStorage.getItem('report_public_staff') || DEFAULT_PUBLIC_STAFF);
  const [privateStaff, setPrivateStaff] = useState(() => localStorage.getItem('report_private_staff') || DEFAULT_PRIVATE_STAFF);
  const [ipStaff, setIpStaff] = useState(() => localStorage.getItem('report_ip_staff') || DEFAULT_IP_STAFF);
  const [ipList, setIpList] = useState(() => localStorage.getItem('report_ip_list') || DEFAULT_IPS);

  useEffect(() => {
    localStorage.setItem('report_public_staff', publicStaff);
    localStorage.setItem('report_private_staff', privateStaff);
    localStorage.setItem('report_ip_staff', ipStaff);
    localStorage.setItem('report_ip_list', ipList);
  }, [publicStaff, privateStaff, ipStaff, ipList]);

  // Determine which staff list to send to Gemini based on forced mode or guess
  const currentProcessingStaffList = useMemo(() => {
    if (forcedMode === 'public') return publicStaff;
    if (forcedMode === 'private') return privateStaff;
    if (forcedMode === 'ip') return ipStaff;
    // For auto mode, send all as reference
    return `${publicStaff}, ${privateStaff}, ${ipStaff}`;
  }, [forcedMode, publicStaff, privateStaff, ipStaff]);

  const handleProcess = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setError(null);
    setCopied(false);
    try {
      const { text, mode } = await cleanReportData(inputText, currentProcessingStaffList, ipList, forcedMode);
      setOutputText(text);
      setActiveMode(mode);
    } catch (err: any) {
      setError(err.message || "清洗引擎连接超时，请重试。");
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

  // Missing staff calculation based on active mode
  const missingStaff = useMemo(() => {
    if (!outputText) return [];
    const activeStaffList = activeMode === 'private' ? privateStaff : activeMode === 'ip' ? ipStaff : publicStaff;
    
    const normalize = (s: string) => s.replace(/[\s\t\n\r,，。、]/g, '').trim();
    const expectedNames = activeStaffList.split(/[，,、\s]+/).map(n => n.trim()).filter(Boolean);
    const presentNormalized = new Set(tableData.map(row => normalize(row[1] || '')));
    
    return expectedNames.filter(name => !presentNormalized.has(normalize(name)));
  }, [tableData, activeMode, publicStaff, privateStaff, ipStaff, outputText]);

  const handleCopy = useCallback(() => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [outputText]);

  return (
    <div className="app-wrapper">
      <nav className="app-nav">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-xl">
              <MagicIcon />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-800 tracking-tight leading-none">日报智能清洗</h1>
              <span className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mt-1 inline-block">Enterprise Engine v3.0</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 shadow-inner overflow-hidden">
              {(['auto', 'public', 'private', 'ip'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setForcedMode(m)}
                  className={`px-3 py-2 text-[11px] font-extrabold rounded-lg transition-all whitespace-nowrap ${
                    forcedMode === m ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {m === 'auto' ? '智能识别' : m === 'public' ? '公域团队' : m === 'private' ? '私域团队' : 'IP团队'}
                </button>
              ))}
            </div>
            <button onClick={() => setIsSettingsOpen(true)} className="p-3 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 rounded-xl transition-all shadow-sm shrink-0">
              <SettingsIcon />
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8 min-h-0">
        <section className="flex-1 glass-card animate-slide-up bg-white">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">原始输入内容</h2>
            <button onClick={() => setInputText('')} className="text-slate-400 hover:text-rose-500 transition-colors">
              <TrashIcon />
            </button>
          </div>
          <div className="flex-1 relative overflow-hidden">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="在此粘贴非结构化的日报文本..."
              className="input-area focus:bg-indigo-50/10 transition-colors h-full"
            />
          </div>
          <div className="p-6 bg-slate-50/50 border-t border-slate-100">
            <Button onClick={handleProcess} isLoading={isLoading} disabled={!inputText.trim()} className="w-full h-12">
              开始解析数据
            </Button>
          </div>
        </section>

        <section className="flex-[1.6] glass-card animate-slide-up bg-white">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <div className="flex items-center gap-3">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">清洗结果 (TSV)</h2>
              {outputText && (
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  activeMode === 'private' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                }`}>
                  {activeMode === 'public' ? '公域团队' : activeMode === 'private' ? '私域团队' : 'IP团队'}
                </span>
              )}
            </div>
            <button onClick={handleCopy} disabled={!outputText} className={`btn-modern py-2 px-4 shadow-sm ${copied ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-900 text-white'}`}>
              {copied ? <CheckIcon /> : <ClipboardIcon />}
              {copied ? '已复制' : '复制 TSV'}
            </button>
          </div>

          {outputText && !error && (
            <div className="px-6 py-3 border-b border-slate-100">
              {missingStaff.length > 0 ? (
                <div className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-2xl px-4 py-2.5">
                  <div className="flex items-center gap-3 text-amber-700">
                    <AlertIcon />
                    <p className="text-sm font-bold tracking-tight">差 {missingStaff.length} 人：{missingStaff.join('、')}</p>
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(`今日未交：${missingStaff.join('、')}`); alert('已复制话术'); }} className="text-[10px] font-bold bg-white px-3 py-1.5 rounded-xl border border-amber-200 text-amber-600">一键催交</button>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-2.5 text-emerald-700">
                  <CheckIcon />
                  <p className="text-sm font-bold tracking-tight">🎉 团队全员已提交日报！</p>
                </div>
              )}
            </div>
          )}

          <div className="flex-1 overflow-auto custom-scroll">
            {error ? (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                <h3 className="text-lg font-extrabold text-slate-800 mb-2">解析失败</h3>
                <p className="text-sm text-slate-400 mb-4">{error}</p>
                <Button onClick={handleProcess} variant="outline">重试</Button>
              </div>
            ) : outputText ? (
              <div className="min-w-max">
                <table className="data-table">
                  <thead>
                    <tr>{(activeMode === 'private' ? PRIVATE_HEADERS : PUBLIC_HEADERS).map((h, i) => <th key={i}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {tableData.map((row, rI) => <tr key={rI}>{row.map((cell, cI) => <td key={cI}>{cell || '-'}</td>)}</tr>)}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 p-12">
                <p className="font-extrabold text-slate-400 tracking-wide text-sm">等待处理原始日报内容...</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsSettingsOpen(false)}></div>
          <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl relative overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">配置中心</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-slate-100 rounded-full transition-all">✕</button>
            </div>
            <div className="p-10 space-y-8 overflow-y-auto custom-scroll">
              <div className="space-y-4">
                <label className="text-sm font-black text-slate-800 flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                   公域团队名单
                </label>
                <textarea value={publicStaff} onChange={(e) => setPublicStaff(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl h-24 focus:outline-none font-medium text-sm" />
              </div>
              <div className="space-y-4">
                <label className="text-sm font-black text-slate-800 flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                   私域团队名单
                </label>
                <textarea value={privateStaff} onChange={(e) => setPrivateStaff(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl h-24 focus:outline-none font-medium text-sm" />
              </div>
              <div className="space-y-4">
                <label className="text-sm font-black text-slate-800 flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                   IP 团队名单
                </label>
                <textarea value={ipStaff} onChange={(e) => setIpStaff(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl h-24 focus:outline-none font-medium text-sm" />
              </div>
              <div className="space-y-4">
                <label className="text-sm font-black text-slate-800 flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                   IP / 账号资产库 (公域/IP模式匹配用)
                </label>
                <textarea value={ipList} onChange={(e) => setIpList(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl h-24 focus:outline-none font-medium text-sm" />
              </div>
            </div>
            <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
              <Button onClick={() => setIsSettingsOpen(false)} className="px-12 h-14 rounded-2xl">保存配置</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
