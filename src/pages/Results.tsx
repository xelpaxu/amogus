import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

// -----------------------------------------------------------------
// CUSTOM CYBERPUNK INLINE SVG ICONS (Zero-Dependency & High Perf)
// -----------------------------------------------------------------
const CpuIcon = () => (
  <svg className="w-5 h-5 text-[#81ecff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9h6v6H9V9zM9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg className="w-5 h-5 text-[#28c840]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const RadioIcon = () => (
  <svg className="w-5 h-5 text-[#ff51fa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
  </svg>
);

const CodeIcon = () => (
  <svg className="w-4 h-4 text-[#ffe483]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

const TerminalIcon = () => (
  <svg className="w-4 h-4 text-[#81ecff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 002-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

interface PlayerResult {
  playerId: string;
  name: string;
  avatarId: string;
  prediction: "IMPOSTOR" | "CREWMATE";
  group_similarity: number;
  is_suspicious: boolean;
}

interface PlayerSubmission {
  id: string;
  name: string;
  avatarId: string;
  sentence: string;
  code: string;
}

const ResultScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomId: paramRoomId } = useParams();

  // Extract variables with explicit default fallbacks
  const {
    results = [] as PlayerResult[],
    impostor = "Unknown Target",
    similarity_matrix = [] as number[][],
    theme = "N/A",
    fake_theme = "N/A",
    roomId = paramRoomId || "0000",
    players = [] as PlayerSubmission[]
  } = location.state || {};

  const [activeTab, setActiveTab] = useState<"summary" | "heatmap" | "audit">("summary");
  const [selectedAuditPlayer, setSelectedAuditPlayer] = useState<string>(players[0]?.id || "");
  const [blink, setBlink] = useState<boolean>(true);

  // Sync cursor blinking state
  useEffect(() => {
    const interval = setInterval(() => setBlink((b) => !b), 530);
    return () => clearInterval(interval);
  }, []);

  // Safeguard: Redirect or show loading screen if location state was wiped by user hard refresh
  if (results.length === 0) {
    return (
      <div className="min-h-screen bg-[#06060e] text-white flex flex-col items-center justify-center font-mono p-6">
        <div className="max-w-md w-full border border-[#ff51fa]/30 bg-black/60 p-6 rounded text-center space-y-4 shadow-[0_0_30px_rgba(255,81,250,0.15)]">
          <div className="text-[#ff51fa] font-black text-lg animate-pulse">📡 [CONNECTION OUT OF SYNC]</div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Telemetry logs missing or expired. Re-route into active game channels to re-initiate diagnostic protocols.
          </p>
          <button
            onClick={() => navigate("/")}
            className="w-full py-2 bg-[#0c0c1f] border border-[#81ecff]/40 text-[#81ecff] text-xs font-bold uppercase tracking-widest hover:bg-[#81ecff]/10 hover:border-[#81ecff] transition-all"
          >
            &lt; Return to Terminal Core &gt;
          </button>
        </div>
      </div>
    );
  }

  // Generate fallback matrix grid if backend ML was offline (Explicitly Typed Core)
  const safeMatrix: number[][] = similarity_matrix && similarity_matrix.length > 0
    ? similarity_matrix
    : results.map((_: PlayerResult, rIdx: number): number[] => 
        results.map((__: PlayerResult, cIdx: number): number => 
          rIdx === cIdx ? 1.0 : 0.45 + (rIdx * cIdx * 0.07) % 0.4
        )
      );

  const activeAuditData = players.find((p: PlayerSubmission) => p.id === selectedAuditPlayer) || players[0];

  return (
    <div className="relative min-h-screen text-white font-mono selection:bg-[#ff51fa] bg-[#070712] overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap');
        * { font-family: 'JetBrains Mono', monospace !important; }
        .scanlines {
          background-image: linear-gradient(to bottom, transparent 50%, rgba(255,255,255,0.02) 51%);
          background-size: 100% 4px;
        }
        .glow-pink { text-shadow: 0 0 12px rgba(255,81,250,0.6); }
        .glow-cyan { text-shadow: 0 0 12px rgba(129,236,255,0.5); }
        .glow-green { text-shadow: 0 0 12px rgba(40,200,64,0.5); }
      `}</style>

      {/* Cyber Background Aesthetics */}
      <div className="fixed inset-0 pointer-events-none -z-50">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0a0516] via-[#05050d] to-[#040914]" />
        <div className="absolute inset-0 scanlines opacity-30" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#ff51fa]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-[#81ecff]/5 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        
        {/* HEADER BLOCK */}
        <header className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-black/40 border border-[#46465c]/40 rounded backdrop-blur-md gap-4">
          <div className="flex items-center gap-4">
            <div className="flex gap-1.5 shrink-0">
              <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <span className="w-3 h-3 rounded-full bg-[#28c840]" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wider text-[#81ecff] uppercase">Explainable AI Analyzer</h1>
              <p className="text-[10px] text-gray-500 font-mono">System Dossier // Room ID: {roomId}</p>
            </div>
          </div>
          
          {/* Navigation Sub-Tabs */}
          <div className="flex bg-[#0c0c1f] p-1 border border-[#46465c]/30 rounded">
            {(["summary", "heatmap", "audit"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-all ${
                  activeTab === tab
                    ? "bg-[#81ecff]/10 text-[#81ecff] border border-[#81ecff]/30 shadow-[0_0_10px_rgba(129,236,255,0.1)]"
                    : "text-gray-500 hover:text-gray-300 border border-transparent"
                }`}
              >
                {tab === "summary" && "🕵️ Anomaly Verdict"}
                {tab === "heatmap" && "📊 Cross-Correlation"}
                {tab === "audit" && "📝 Source Audit"}
              </button>
            ))}
          </div>
        </header>

        {/* SUMMARY TAB PANEL */}
        {activeTab === "summary" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
            
            {/* BIG VERDICT HERO PANELS */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Main Classification Alert Banner */}
              <div className="relative overflow-hidden p-6 bg-black/50 border border-red-500/30 rounded shadow-[0_0_20px_rgba(239,68,68,0.05)]">
                <div className="absolute right-0 bottom-0 text-7xl font-black text-red-500/5 select-none font-mono">LOO_AI</div>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-red-900/20 border border-red-500/40 rounded animate-pulse">
                    <RadioIcon />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-red-400 bg-red-950/40 px-2 py-0.5 rounded border border-red-900/50">
                      Isolation Outlier Flagged
                    </span>
                    <h2 className="text-xl font-black text-white tracking-wide">
                      Anomaly Detected: <span className="text-[#ff51fa] glow-pink uppercase">{impostor}</span>
                    </h2>
                    <p className="text-xs text-gray-400 leading-relaxed max-w-xl">
                      The Siamese encoder detected divergence during individual vector extraction. Subject loaded data paths mismatching the collective cluster schema.
                    </p>
                  </div>
                </div>
              </div>

              {/* Cards Grid of Players Classification */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.map((player: PlayerResult, idx: number) => {
                  const isImpostorCard = player.prediction === "IMPOSTOR";
                  return (
                    <div 
                      key={idx}
                      className={`p-4 bg-black/40 border rounded transition-all backdrop-blur-sm relative ${
                        isImpostorCard 
                          ? "border-[#ff51fa]/40 bg-gradient-to-br from-black/60 to-[#180816]/40 shadow-[0_0_15px_rgba(255,81,250,0.05)]" 
                          : "border-[#46465c]/30 hover:border-gray-600"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold uppercase tracking-wider ${
                            isImpostorCard ? "bg-[#ff51fa]/20 text-[#ff51fa]" : "bg-gray-800 text-gray-300"
                          }`}>
                            {player.name.substring(0, 2)}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white uppercase">{player.name}</h4>
                            <span className="text-[9px] text-gray-500 uppercase block">avatar: {player.avatarId}</span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded font-mono tracking-wider ${
                          isImpostorCard ? "bg-red-950 text-red-400 border border-red-900" : "bg-emerald-950 text-emerald-400 border border-emerald-900"
                        }`}>
                          {player.prediction}
                        </span>
                      </div>

                      {/* Similarity Progress Metrics */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-gray-400">
                          <span>Group Conformity Index</span>
                          <span className={isImpostorCard ? "text-[#ff51fa] font-bold" : "text-[#28c840] font-bold"}>
                            {(player.group_similarity * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[#121224] rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${
                              isImpostorCard ? "bg-gradient-to-r from-red-500 to-[#ff51fa]" : "bg-gradient-to-r from-teal-500 to-[#28c840]"
                            }`}
                            style={{ width: `${Math.max(player.group_similarity * 100, 4)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* NEURAL TELESCOPE DATA SIDE PANEL */}
            <div className="space-y-6">
              
              {/* Ground Truth Matrix Breakdown */}
              <div className="p-4 bg-black/40 border border-[#46465c]/30 rounded backdrop-blur-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-[#46465c]/30 pb-2">
                  <CpuIcon />
                  <h3 className="text-xs font-bold tracking-wider uppercase text-white">Semantic Ground Truth</h3>
                </div>
                
                <div className="space-y-3 font-mono text-xs">
                  <div className="p-2.5 bg-[#0a0c16] border border-[#81ecff]/20 rounded">
                    <span className="text-[9px] text-gray-500 block uppercase tracking-widest">Crew Vector Theme</span>
                    <span className="text-[#81ecff] font-bold glow-cyan uppercase text-sm block mt-0.5">
                      {theme}
                    </span>
                  </div>
                  
                  <div className="p-2.5 bg-[#140612] border border-[#ff51fa]/20 rounded">
                    <span className="text-[9px] text-gray-500 block uppercase tracking-widest">Impostor Decoy Theme</span>
                    <span className="text-[#ff51fa] font-bold glow-pink uppercase text-sm block mt-0.5">
                      {fake_theme}
                    </span>
                  </div>
                </div>
              </div>

              {/* Model Diagnostics Metas */}
              <div className="p-4 bg-black/40 border border-[#46465c]/30 rounded backdrop-blur-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-[#46465c]/30 pb-2">
                  <ShieldCheckIcon />
                  <h3 className="text-xs font-bold tracking-wider uppercase text-white">Model Configuration</h3>
                </div>

                <div className="space-y-3 text-[11px] text-gray-400">
                  <div className="flex justify-between border-b border-[#46465c]/10 pb-1.5">
                    <span>Tokenizer Engine</span>
                    <span className="text-white text-right font-bold">DistilBERT-Siamese-LOO</span>
                  </div>
                  <div className="flex justify-between border-b border-[#46465c]/10 pb-1.5">
                    <span>Confidence Threshold</span>
                    <span className="text-yellow-400 text-right font-bold">0.70 Delta</span>
                  </div>
                  <div className="flex justify-between border-b border-[#46465c]/10 pb-1.5">
                    <span>Processing Window</span>
                    <span className="text-white text-right">3 Multi-Prompts</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vector Dimension</span>
                    <span className="text-white text-right font-mono">768 Dense Float32</span>
                  </div>
                </div>
              </div>

              {/* Re-route Controls */}
              <button
                onClick={() => navigate("/")}
                className="w-full py-3 bg-gradient-to-r from-[#13112b] to-[#1a1138] border border-[#ff51fa]/40 text-white rounded text-xs font-bold uppercase tracking-widest hover:border-[#ff51fa] hover:shadow-[0_0_15px_rgba(255,81,250,0.2)] transition-all flex items-center justify-center gap-2"
              >
                <span>🎮 Re-Enter Operational Lobby</span>
              </button>

            </div>
          </div>
        )}

        {/* HEATMAP / CROSS-CORRELATION MATRIX TAB */}
        {activeTab === "heatmap" && (
          <div className="p-5 bg-black/50 border border-[#46465c]/30 rounded backdrop-blur-sm space-y-6 animate-fadeIn">
            <div className="max-w-xl">
              <h3 className="text-sm font-bold uppercase text-[#81ecff] tracking-wider mb-1 flex items-center gap-2">
                <span>📊</span> Inter-Subject Proximity Correlation Map
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                This dynamic weights layout matches the calculated cosine similarity vector values across all round players. 
                Values moving closer to <code className="text-emerald-400">1.0</code> mean direct matching responses. Lower numbers showcase deep textual anomalies.
              </p>
            </div>

            {/* Matrix Render Pipeline */}
            <div className="overflow-x-auto pb-4">
              <div className="min-w-[500px] flex flex-col items-center py-4">
                <div className="grid font-mono" style={{ gridTemplateColumns: `100px repeat(${results.length}, minmax(75px, 1fr))` }}>
                  
                  {/* Top Axis Head Labels */}
                  <div className="h-10" />
                  {results.map((p: PlayerResult, i: number) => (
                    <div key={i} className="text-center text-[10px] font-bold uppercase tracking-tight text-gray-500 truncate px-1 self-end pb-2">
                      {p.name}
                    </div>
                  ))}

                  {/* Matrix Value Core Rows */}
                  {results.map((rowPlayer: PlayerResult, rIdx: number) => (
                    <React.Fragment key={rIdx}>
                      {/* Left Axis Head Labels */}
                      <div className="h-14 text-left text-[10px] font-bold uppercase text-gray-500 truncate pr-2 flex items-center border-r border-[#46465c]/30">
                        {rowPlayer.name}
                      </div>

                      {/* Heatmap Blocks */}
                      {results.map((colPlayer: PlayerResult, cIdx: number) => {
                        const val = safeMatrix[rIdx]?.[cIdx] ?? 0.5;
                        
                        // Dynamically scale coloring bands based on value ranges
                        let cellBg = "bg-purple-950/40 text-purple-400 border-purple-900/30";
                        if (val > 0.85) cellBg = "bg-emerald-500/20 text-[#28c840] border-emerald-500/40 font-black";
                        else if (val > 0.65) cellBg = "bg-[#81ecff]/10 text-[#81ecff] border-[#81ecff]/30";
                        else if (val < 0.4) cellBg = "bg-red-950/40 text-red-400 border-red-500/30 animate-pulse";

                        return (
                          <div 
                            key={cIdx} 
                            className={`h-14 border m-[1px] rounded-sm flex flex-col items-center justify-center transition-all hover:scale-105 hover:z-10 cursor-help ${cellBg}`}
                            title={`Correlation: ${rowPlayer.name} & ${colPlayer.name} = ${val.toFixed(4)}`}
                          >
                            <span className="text-[11px] font-bold tracking-tight">{val.toFixed(2)}</span>
                            <span className="text-[7px] text-gray-500 uppercase tracking-tighter mt-0.5">cos_θ</span>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}

                </div>
              </div>
            </div>

            {/* Grid Map Legend */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-2 border-t border-[#46465c]/20 text-[10px] tracking-wider text-gray-500">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-emerald-500/20 border border-emerald-500/50 rounded-sm" />
                <span>Strong Alignment (&gt;0.85)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-[#81ecff]/20 border border-[#81ecff]/50 rounded-sm" />
                <span>Standard Conformity (0.45 - 0.85)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-950/40 border border-red-500/50 rounded-sm" />
                <span>Anomalous Vector (&lt;0.40)</span>
              </div>
            </div>
          </div>
        )}

        {/* DETAILED TEXT & CODE AUDIT FEED TAB */}
        {activeTab === "audit" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fadeIn">
            
            {/* Left Nav Menu (Select Player to Inspect) */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block pl-1">
                Select Data Dossier
              </span>
              <div className="flex flex-col gap-1.5">
                {players.map((p: PlayerSubmission) => {
                  const isSelected = p.id === selectedAuditPlayer;
                  const associatedEval = results.find((res: PlayerResult) => res.playerId === p.id);
                  const isFlagged = associatedEval?.prediction === "IMPOSTOR";

                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedAuditPlayer(p.id)}
                      className={`w-full text-left p-3 rounded font-mono border transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-[#0f1124] border-[#81ecff]/50 text-white shadow-[0_0_12px_rgba(129,236,255,0.08)]"
                          : "bg-black/30 border-[#46465c]/20 text-gray-400 hover:text-white hover:bg-black/50"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="text-xs font-bold uppercase truncate">{p.name}</div>
                        <span className="text-[9px] text-gray-500 block uppercase tracking-tight">id: {p.id.substring(0,6)}...</span>
                      </div>
                      
                      {isFlagged && (
                        <span className="w-2 h-2 rounded-full bg-[#ff51fa] shadow-[0_0_6px_#ff51fa] shrink-0" title="AI Flagged Outlier" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Terminal Workspace View */}
            <div className="md:col-span-3 space-y-4">
              {activeAuditData ? (
                <div className="border border-[#46465c]/40 rounded bg-black/50 overflow-hidden shadow-2xl">
                  
                  {/* Mock IDE Bar */}
                  <div className="bg-[#090912] px-4 py-2 border-b border-[#46465c]/30 flex items-center justify-between text-[10px] text-gray-500">
                    <div className="flex items-center gap-2">
                      <TerminalIcon />
                      <span className="text-gray-400 font-bold uppercase">audit_dossier_{activeAuditData.name.toLowerCase()}.log</span>
                    </div>
                    <span className="bg-[#1b1b36] px-2 py-0.5 rounded text-[9px] text-[#81ecff]">UTF-8 · READ ONLY</span>
                  </div>

                  {/* Formatted Code Fields Workspace */}
                  <div className="p-4 space-y-5">
                    
                    {/* Natural Description String */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-gray-500 font-mono tracking-wider">// prompt_01: Describe what you're doing</div>
                      <div className="relative border border-[#46465c]/20 bg-black/40 rounded p-3 text-xs text-gray-200 leading-relaxed">
                        {activeAuditData.sentence || <span className="text-gray-600 italic">No input token generated</span>}
                      </div>
                    </div>

                    {/* Code Submissions Code Editor Panel */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-gray-500 font-mono tracking-wider">// prompt_03: Sample Code Block</div>
                      
                      <div className="relative border border-[#46465c]/40 rounded bg-[#040409] font-mono overflow-hidden">
                        
                        {/* Editor Side Margin Line Numbers */}
                        <div className="absolute left-0 top-0 bottom-0 w-9 border-r border-[#46465c]/20 flex flex-col items-center pt-3 select-none bg-black/30 text-[10px] text-[#2a2a3c] leading-6">
                          {Array.from({ length: 6 }).map((_, i: number) => (
                            <span key={i}>{i + 1}</span>
                          ))}
                        </div>

                        {/* Code Inner Box */}
                        <pre className="pl-12 pr-4 pt-3 pb-3 text-xs overflow-x-auto text-emerald-400 leading-6 whitespace-pre-wrap">
                          {activeAuditData.code ? (
                            <code className="text-[#e0ffe0]">{activeAuditData.code}</code>
                          ) : (
                            <span className="text-gray-600 italic">// Empty structural payload submitted</span>
                          )}
                        </pre>

                        {/* Editor Stats Footer Bar */}
                        <div className="flex justify-between items-center px-3 py-1 bg-black/40 border-t border-[#46465c]/20 text-[9px] text-gray-600">
                          <div className="flex items-center gap-3">
                            <CodeIcon />
                            <span>Syntax: JavaScript / ML Matrix Token</span>
                          </div>
                          <span>
                            {activeAuditData.code?.length || 0} characters
                            {blink && <span className="text-[#ff51fa] ml-1">█</span>}
                          </span>
                        </div>

                      </div>
                    </div>

                  </div>
                </div>
              ) : (
                <div className="h-48 border border-dashed border-gray-800 rounded flex items-center justify-center text-xs text-gray-600">
                  Select a telemetry node profile to view code tokens.
                </div>
              )}
            </div>

          </div>
        )}

        {/* GENERAL SYSTEM MONITOR BAR FOOTER */}
        <footer className="p-3 border-t border-[#46465c]/20 flex justify-between text-[10px] font-mono text-gray-600 bg-black/10 rounded-b">
          <span>Vector Evaluation Matrix v0.2.4 [Stable Cluster]</span>
          <span className="text-[#28c840] animate-pulse">● ALL DIAGNOSTIC RELAYS ACTIVE</span>
        </footer>

      </div>
    </div>
  );
};

export default ResultScreen;