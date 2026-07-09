import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileText, 
  Sparkles, 
  Wand2, 
  Check, 
  Printer, 
  FileSpreadsheet, 
  ArrowDownToLine, 
  Play, 
  RotateCcw,
  Zap
} from "lucide-react";

type AnimState = "idle" | "upload" | "build" | "fill" | "approved" | "printing" | "hamster";

export default function SdgCartoonAnimation() {
  const [state, setState] = useState<AnimState>("idle");
  const [logMsg, setLogMsg] = useState("System idle. Ready to generate.");
  const [printedCount, setPrintedCount] = useState(14022);
  const [currentScenario, setCurrentScenario] = useState(0);

  // Colorful sheets of paper produced during rapid printing
  const [spittedPapers, setSpittedPapers] = useState<{ id: number; color: string; left: number; top: number; rotate: number; scale: number }[]>([]);

  // Sample scenarios for realistic inputs
  const SCENARIOS = [
    {
      templateName: "NDA_Secret_Agent_v9.docx",
      vars: [
        { label: "Agent Name", value: "Bond, James" },
        { label: "Agency", value: "MI6 London" },
        { label: "Specialty", value: "Dry Martinis & Espionage" }
      ],
      resultTitle: "NDA APPROVED",
      log1: "Uploading NDA_Secret_Agent_v9.docx into the Form Funnel...",
      log2: "Analyzing template placeholders... Building responsive form fields!",
      log3: "Sigi is auto-typing values at 42,000 words per minute!",
      log4: "Form verified! Slamming down the APPROVED stamp of authority!",
      log5: "PRINTER OVERLOAD! Spewing encrypted security dossiers!",
      log6: "Phew! Cleaned up the documents. Let's do another!"
    },
    {
      templateName: "Iron_Man_Armor_Lease.docx",
      vars: [
        { label: "Renter", value: "Tony Stark" },
        { label: "Armor Suit", value: "Mark LXXXV (Nanotech)" },
        { label: "Daily Rate", value: "$4,200,000.00" }
      ],
      resultTitle: "LEASE SIGNED",
      log1: "Sucking Iron_Man_Armor_Lease.docx into the digital intake chute...",
      log2: "Deploying armor telemetry inputs and Stark liability waivers...",
      log3: "Filling rocket booster certificates and liability exceptions...",
      log4: "Stark Industries signature acquired! STAMP IT!",
      log5: "WARNING: High pressure! Spitting golden armor blueprints!",
      log6: "All clear! Hamster safely contained. Ready to run again!"
    },
    {
      templateName: "Sorcery_Apprenticeship.docx",
      vars: [
        { label: "Archmage", value: "Doctor Strange" },
        { label: "Dimension", value: "Dark Dimension" },
        { label: "Sanctum", value: "New York City" }
      ],
      resultTitle: "SPELL WAIVER APPROVED",
      log1: "Intaking ancient mystical document... Translating parchment runes...",
      log2: "Casting portal spells... Building web-compatible wizard inputs...",
      log3: "Typing magical parameters into standard React component inputs...",
      log4: "Multiverse seal applied! Approved in 14 dimensions!",
      log5: "KABOOM! Paper storm triggered by mystical document cascade!",
      log6: "Magic storm settled. The system is ready for the next file!"
    }
  ];

  const s = SCENARIOS[currentScenario];

  useEffect(() => {
    let active = true;
    let timerIds: NodeJS.Timeout[] = [];

    const delay = (ms: number) => new Promise((res) => {
      if (active) {
        const id = setTimeout(res, ms);
        timerIds.push(id);
      }
    });

    const runSequence = async () => {
      if (!active) return;

      // 1. Idle state
      setState("idle");
      setLogMsg("Desk Workspace Clear. Drag and drop templates (.docx, .xlsx)...");
      setSpittedPapers([]);
      await delay(2000);

      // 2. Upload Templates
      setState("upload");
      setLogMsg(s.log1);
      await delay(2200);

      // 3. Form Made
      setState("build");
      setLogMsg(s.log2);
      await delay(2200);

      // 4. Form Filled
      setState("fill");
      setLogMsg(s.log3);
      await delay(2400);

      // 5. Approved stamp
      setState("approved");
      setLogMsg(s.log4);
      await delay(1800);

      // 6. Lots of Documents Generated (Crazy Printer Spitting)
      setState("printing");
      setLogMsg(s.log5);

      // Rapidly spit 35 colorful documents out
      const colors = [
        "bg-yellow-300 border-yellow-400 text-yellow-800",
        "bg-pink-300 border-pink-400 text-pink-800",
        "bg-sky-300 border-sky-400 text-sky-800",
        "bg-emerald-300 border-emerald-400 text-emerald-800",
        "bg-purple-300 border-purple-400 text-purple-800",
        "bg-white border-slate-300 text-slate-800"
      ];

      for (let i = 0; i < 35; i++) {
        await delay(60);
        setPrintedCount((p) => p + 1);
        setSpittedPapers((prev) => [
          ...prev,
          {
            id: Math.random(),
            color: colors[Math.floor(Math.random() * colors.length)],
            // Random scatter locations representing a huge pile covering the desk
            left: 10 + Math.random() * 80, // % width
            top: 40 + Math.random() * 40,  // % height
            rotate: (Math.random() - 0.5) * 80, // rot angle
            scale: 0.8 + Math.random() * 0.4
          }
        ]);
      }
      await delay(1000);

      // 7. Hamster pops out of the giant pile
      setState("hamster");
      setLogMsg(s.log6);
      await delay(5000);

      // Loop to next scenario
      if (active) {
        setCurrentScenario((prev) => (prev + 1) % SCENARIOS.length);
      }
    };

    runSequence();

    return () => {
      active = false;
      timerIds.forEach(clearTimeout);
    };
  }, [currentScenario]);

  return (
    <div 
      id="sdg-realistic-desk-animation" 
      className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-2xl relative overflow-hidden select-none"
    >
      {/* Subtle modern header */}
      <div className="flex items-center justify-between relative z-10 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
          </span>
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Document Generation Pipeline
          </span>
        </div>
        
        {/* Total Documents Printed Meter */}
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-950 rounded-lg border border-slate-800">
          <Printer className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span className="text-[10px] font-medium text-slate-400">Printed Count:</span>
          <span className="font-mono text-xs font-black text-emerald-400 tabular-nums">
            {printedCount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Main Interactive Screen Canvas - Office Desk Mockup */}
      <div className="w-full h-[320px] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-xl relative overflow-hidden flex flex-col justify-between p-4">
        
        {/* Dynamic Background Office Desk Items */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] opacity-10 pointer-events-none" />
        
        {/* Left Coffee Cup on Desk */}
        <div className="absolute left-6 bottom-4 w-8 h-10 bg-rose-700/80 rounded-b-lg border-t-4 border-rose-500 flex items-center justify-center text-[10px] text-white font-mono opacity-40 shadow-md">
          ☕
          <div className="absolute -right-2 top-2 w-3 h-5 border-2 border-rose-500 rounded-r-full" />
        </div>

        {/* Right Sticky Notes Stack */}
        <div className="absolute right-6 bottom-6 w-10 h-10 bg-yellow-400/90 rounded border-b-2 border-yellow-500/50 -rotate-6 flex items-center justify-center font-mono text-[8px] text-yellow-900 font-bold opacity-50 shadow-sm">
          💡 DO IT!
        </div>

        {/* Back Monitors on the Desk */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-80 h-16 bg-slate-800/20 border border-slate-700/30 rounded-lg flex justify-around p-1.5 opacity-30 pointer-events-none">
          <div className="w-24 h-full bg-slate-900/60 rounded border border-slate-800" />
          <div className="w-24 h-full bg-slate-900/60 rounded border border-slate-800" />
        </div>

        {/* STAGE CONTAINER (Absolute layering) */}
        <div className="w-full h-full relative">
          
          {/* STAGE 1: UPLOAD & FUNNEL (Only active or transitioning in idle/upload) */}
          <AnimatePresence>
            {(state === "idle" || state === "upload") && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute inset-x-0 top-2 flex flex-col items-center justify-center z-10"
              >
                {/* Flowing files */}
                <div className="flex gap-8 mb-4">
                  {/* DOCX file */}
                  <motion.div
                    animate={state === "upload" ? { 
                      y: [0, 90], 
                      x: [0, 5],
                      scale: [1, 0.4], 
                      opacity: [1, 0] 
                    } : { y: [0, -4, 0] }}
                    transition={state === "upload" ? { duration: 1.8, ease: "easeInOut" } : { repeat: Infinity, duration: 2 }}
                    className="bg-blue-600 text-white p-3 rounded-xl shadow-xl flex flex-col items-center border border-blue-400 w-16"
                  >
                    <FileText className="w-6 h-6 animate-pulse" />
                    <span className="text-[9px] font-black tracking-wider mt-1">.DOCX</span>
                  </motion.div>

                  {/* XLSX file */}
                  <motion.div
                    animate={state === "upload" ? { 
                      y: [0, 90], 
                      x: [0, -5],
                      scale: [1, 0.4], 
                      opacity: [1, 0] 
                    } : { y: [0, -4, 0], delay: 0.3 }}
                    transition={state === "upload" ? { duration: 1.8, delay: 0.3, ease: "easeInOut" } : { repeat: Infinity, duration: 2, delay: 0.3 }}
                    className="bg-emerald-600 text-white p-3 rounded-xl shadow-xl flex flex-col items-center border border-emerald-400 w-16"
                  >
                    <FileSpreadsheet className="w-6 h-6" />
                    <span className="text-[9px] font-black tracking-wider mt-1">.XLSX</span>
                  </motion.div>
                </div>

                {/* The Form Generator Funnel */}
                <div className="flex flex-col items-center">
                  <div className="w-48 h-10 bg-gradient-to-r from-indigo-900 to-slate-900 border-2 border-indigo-500 rounded-b-3xl relative flex items-center justify-center shadow-lg">
                    <span className="text-[9px] font-black tracking-widest text-indigo-300 uppercase">
                      FORM FUNNEL
                    </span>
                    <div className="absolute inset-x-4 bottom-1 h-1 bg-cyan-400/50 rounded-full blur-sm" />
                  </div>
                  {/* Funnel pipe spout */}
                  <div className="w-6 h-6 bg-indigo-600 border-x-2 border-indigo-400" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* STAGE 2: FORM IS MADE & DETECTED */}
          <AnimatePresence>
            {(state === "build" || state === "fill" || state === "approved") && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -40 }}
                className="absolute inset-x-0 top-0 bottom-4 flex items-center justify-center z-15"
              >
                {/* Web Form Preview Board */}
                <div className="w-72 bg-slate-900 border-2 border-indigo-500/80 rounded-xl p-3 shadow-2xl flex flex-col space-y-2.5 relative">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-[9px] font-extrabold text-slate-300 uppercase tracking-wider font-mono">
                        {s.templateName}
                      </span>
                    </div>
                    <span className="text-[8px] font-semibold text-indigo-400 font-mono bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-900/50">
                      Form Auto-Built
                    </span>
                  </div>

                  {/* Form fields rendering & filling */}
                  <div className="space-y-2">
                    {s.vars.map((v, idx) => (
                      <div key={idx} className="space-y-1">
                        <label className="text-[8px] font-extrabold text-slate-400 uppercase tracking-tight block">
                          {v.label}
                        </label>
                        <div className="h-7 bg-slate-950 border border-slate-800 rounded px-2 flex items-center justify-between relative overflow-hidden">
                          {state === "fill" || state === "approved" ? (
                            <motion.span
                              initial={{ width: 0 }}
                              animate={{ width: "100%" }}
                              transition={{ duration: 0.8, delay: idx * 0.4 }}
                              className="text-[10px] font-bold text-indigo-300 font-mono whitespace-nowrap overflow-hidden"
                            >
                              {v.value}
                            </motion.span>
                          ) : (
                            <span className="text-[9px] text-slate-600 italic">Empty field...</span>
                          )}

                          {state === "fill" && (
                            <motion.span 
                              animate={{ opacity: [0, 1, 0] }}
                              transition={{ repeat: Infinity, duration: 0.6 }}
                              className="absolute right-2 text-indigo-400 text-xs"
                            >
                              ✍️
                            </motion.span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Stamp Container */}
                  <AnimatePresence>
                    {state === "approved" && (
                      <motion.div
                        initial={{ scale: 3, rotate: -45, opacity: 0 }}
                        animate={{ scale: 1, rotate: -12, opacity: 1 }}
                        className="absolute inset-0 flex items-center justify-center bg-transparent pointer-events-none z-30"
                      >
                        <div className="border-4 border-rose-500 text-rose-500 bg-slate-950/95 font-black text-sm tracking-widest uppercase px-4 py-2 rounded-lg shadow-2xl rotate-[-12deg] transform animate-pulse border-double">
                          {s.resultTitle}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* STAGE 3: THE COMEDIC CARTOON PRINTER (Active during printing) */}
          <div className="absolute inset-x-0 bottom-4 flex flex-col items-center justify-end z-20">
            {state === "printing" && (
              <motion.div
                animate={{ 
                  y: [-3, 3, -3], 
                  rotate: [-1.5, 1.5, -1.5] 
                }}
                transition={{ repeat: Infinity, duration: 0.12 }}
                className="w-44 bg-gradient-to-b from-slate-700 to-slate-800 border-2 border-indigo-400 rounded-3xl p-3 flex flex-col items-center justify-center shadow-2xl relative"
              >
                {/* Spiral/Dizzy Eyes for crazy overloading printer */}
                <div className="flex gap-4 mb-2">
                  <div className="w-8 h-8 rounded-full bg-white border-2 border-slate-950 flex items-center justify-center relative overflow-hidden">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.3, ease: "linear" }}
                      className="w-6 h-6 border-2 border-dashed border-slate-900 rounded-full"
                    />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white border-2 border-slate-950 flex items-center justify-center relative overflow-hidden">
                    <motion.div 
                      animate={{ rotate: -360 }}
                      transition={{ repeat: Infinity, duration: 0.3, ease: "linear" }}
                      className="w-6 h-6 border-2 border-dashed border-slate-900 rounded-full"
                    />
                  </div>
                </div>

                {/* Shaking Mouth */}
                <div className="w-14 h-3 bg-slate-950 rounded-full animate-bounce" />

                {/* Exhaust Steam puffs */}
                <span className="absolute -top-6 -left-2 text-xl animate-bounce">💨</span>
                <span className="absolute -top-4 -right-2 text-xl animate-bounce delay-100">💨</span>

                <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest mt-1.5 animate-pulse">
                  OVERHEAT ERROR!
                </span>
              </motion.div>
            )}
          </div>

          {/* STAGE 4: DOCUMENT FLOOD RAIN (Spitted paper piles) */}
          {state === "printing" && (
            <div className="absolute inset-0 pointer-events-none z-30">
              {spittedPapers.map((paper) => (
                <motion.div
                  key={paper.id}
                  initial={{ y: 220, x: 140, scale: 0.2, rotate: 0 }}
                  animate={{ 
                    y: paper.top * 2.8, 
                    x: paper.left * 2.8, 
                    rotate: paper.rotate, 
                    scale: paper.scale 
                  }}
                  transition={{ type: "spring", stiffness: 90, damping: 12 }}
                  className={`absolute w-12 h-14 border rounded p-1 shadow-md flex flex-col justify-between ${paper.color}`}
                >
                  <FileText className="w-4 h-4 opacity-70" />
                  <div className="w-full h-1 bg-current opacity-40 rounded" />
                  <span className="text-[5px] font-mono font-bold uppercase tracking-tight block text-right">
                    DOC
                  </span>
                </motion.div>
              ))}
            </div>
          )}

          {/* STAGE 5: THE MOUNTAIN OF PAPERS & HAMSTER */}
          <AnimatePresence>
            {state === "hamster" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-45"
              >
                {/* Draw 25-30 paper sheets overlapping to form a massive heap */}
                <div className="absolute inset-x-0 bottom-0 h-44 bg-slate-900/40 rounded-b-xl relative overflow-hidden border border-slate-800">
                  {/* Cluttered sheets of paper */}
                  {Array.from({ length: 30 }).map((_, idx) => {
                    const rot = (idx * 17) % 120 - 60;
                    const l = (idx * 13) % 85;
                    const t = 10 + (idx * 5) % 35;
                    const colors = [
                      "bg-yellow-300 border-yellow-400 text-yellow-800",
                      "bg-pink-300 border-pink-400 text-pink-800",
                      "bg-sky-300 border-sky-400 text-sky-800",
                      "bg-emerald-300 border-emerald-400 text-emerald-800",
                      "bg-white border-slate-300 text-slate-800"
                    ];
                    const col = colors[idx % colors.length];

                    return (
                      <div
                        key={idx}
                        style={{
                          left: `${l}%`,
                          top: `${t}px`,
                          transform: `rotate(${rot}deg)`,
                        }}
                        className={`absolute w-14 h-16 border rounded p-1 shadow flex flex-col justify-between ${col}`}
                      >
                        <FileText className="w-3 h-3 opacity-60" />
                        <div className="h-0.5 bg-current opacity-30 rounded w-full" />
                        <div className="h-0.5 bg-current opacity-30 rounded w-4/5" />
                        <span className="text-[5px] font-mono text-right block uppercase">OK</span>
                      </div>
                    );
                  })}

                  {/* CUTE HAMSTER popping out with construction hat */}
                  <motion.div
                    initial={{ y: 90 }}
                    animate={{ y: 0 }}
                    transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.8 }}
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-24 bg-amber-100 rounded-t-full border-t-4 border-x-2 border-amber-300 flex flex-col items-center justify-start p-1.5 shadow-2xl z-50"
                  >
                    {/* Hard Hat */}
                    <div className="w-14 h-6 bg-yellow-400 rounded-t-full border-b border-yellow-500 relative flex items-center justify-center shadow-md">
                      <div className="absolute top-0 w-3 h-1.5 bg-yellow-300 rounded-t" />
                      <span className="text-[6px] font-black text-yellow-900 tracking-tighter">SDG ENG</span>
                    </div>

                    {/* Hamster face details */}
                    <div className="flex gap-4 mt-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                    </div>
                    {/* Pink nose */}
                    <div className="w-1.5 h-1 bg-pink-400 rounded-full mt-0.5" />
                    
                    {/* Whiskers */}
                    <div className="absolute left-6 top-14 w-4 h-px bg-slate-400" />
                    <div className="absolute right-6 top-14 w-4 h-px bg-slate-400" />

                    {/* Speech balloon */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1.8, type: "spring" }}
                      className="absolute -top-12 bg-white text-slate-900 text-[8px] font-bold px-2 py-1 rounded-lg shadow-xl border border-slate-200 whitespace-nowrap"
                    >
                      🐹 &quot;Sigi is okay! Clean up complete!&quot;
                    </motion.div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      {/* Terminal Log Console */}
      <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 flex items-start gap-2.5 shadow-inner">
        <div className="flex gap-1.5 mt-1 flex-shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
        </div>
        <div className="flex-1 font-mono text-xs text-slate-300 leading-relaxed min-w-0">
          <span className="text-indigo-400 font-extrabold mr-1.5">&gt;</span>
          <span className="font-extrabold text-indigo-300">PROCESSOR:</span>{" "}
          <span className="text-slate-100">{logMsg}</span>
        </div>
      </div>
    </div>
  );
}
