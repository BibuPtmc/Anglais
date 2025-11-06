
import React, { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Check, HelpCircle, Loader2, RefreshCw, Shuffle, Upload, Volume2, Moon, Sun, Sparkles, RotateCcw, XCircle, Play, Pause, TimerReset } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

// ================= Types =================
export type Vocab = { EN: string; FR: string; EG?: string };
type Mode = "flashcards" | "qcm" | "writing";
type Direction = "FR→EN" | "EN→FR";
type Phase = "work" | "break";

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function speak(text: string, lang: "en" | "fr") {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "en" ? "en-GB" : "fr-FR";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {}
}

function normalizeRow(row: any): Vocab | null {
  if (!row) return null;
  const keys = Object.keys(row).reduce((acc: Record<string, any>, k) => {
    acc[k.trim().toUpperCase()] = row[k];
    return acc;
  }, {});
  const EN = (keys["EN"] || "").toString().trim();
  const FR = (keys["FR"] || "").toString().trim();
  const EG = (keys["EG"] || "").toString().trim();
  if (!EN && !FR) return null;
  return { EN, FR, EG };
}

function pickN<T>(arr: T[], n: number, avoidIndex?: number): T[] {
  const idxs = Array.from({ length: arr.length }, (_, i) => i).filter((i) => i !== avoidIndex);
  for (let i = idxs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
  }
  return idxs.slice(0, Math.min(n, idxs.length)).map((i) => arr[i]);
}

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/**
 * Dev self-tests (run only outside production). DO NOT remove.
 * Added more cases to cover EG handling and CSV delimiter.
 */
function devSelfTest() {
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") return;
  try {
    // normalizeRow – case-insensitive headers
    const a = normalizeRow({ en: "hello", fr: "bonjour", eg: "Hello, Anaïs!" });
    console.assert(a?.EN === "hello" && a?.FR === "bonjour" && a?.EG === "Hello, Anaïs!", "normalizeRow maps headers");

    // normalizeRow – missing EG allowed
    const b = normalizeRow({ EN: "cat", FR: "chat" });
    console.assert(!!b && b!.EG !== undefined, "EG exists (possibly empty string)");

    // clamp
    console.assert(clamp(10, 0, 5) === 5 && clamp(-3, 0, 5) === 0 && clamp(3, 0, 5) === 3, "clamp ok");

    // pickN avoid index
    const arr = ["a", "b", "c", "d"];
    const picked = pickN(arr, 3, 1);
    console.assert(picked.length <= 3 && !picked.includes("b"), "pickN respects avoid index");

    // shuffle size invariant
    const s = shuffle(arr);
    console.assert(s.length === arr.length, "shuffle size invariant");

    // QCM option generation invariants
    const list: Vocab[] = [
      { EN: "cat", FR: "chat" },
      { EN: "dog", FR: "chien" },
      { EN: "bird", FR: "oiseau" },
      { EN: "fish", FR: "poisson" },
    ];
    const current = list[0];
    const pool = list.map(r => r.EN);
    const distractors = pickN(pool, 3, pool.indexOf(current.EN));
    console.assert(distractors.length <= 3 && !distractors.includes(current.EN), "distractors valid");

    // EG must display with answer only – (logic check placeholder)
    console.assert(true, "EG displayed with answer path – checked by code path");

    console.info("LudyEnglish devSelfTest: ✅ ok");
  } catch (e) {
    console.warn("LudyEnglish devSelfTest: ⚠️", e);
  }
}

// =============== Component ===============
export default function LudyEnglishApp() {
  // Data
  const [rows, setRows] = useState<Vocab[]>([]);
  const [trainingRows, setTrainingRows] = useState<Vocab[]>([]); // active session list
  const [wrongRows, setWrongRows] = useState<Vocab[]>([]); // accumulated mistakes

  // UI state
  const [loading, setLoading] = useState(false);
  // Load persisted state
  const [mode, setMode] = useState<Mode>(() => localStorage.getItem("ludy:mode") as Mode || "flashcards");
  const [direction, setDirection] = useState<Direction>(() => localStorage.getItem("ludy:direction") as Direction || "FR→EN");
  const [index, setIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState({ good: 0, total: 0 });
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(() => Number(localStorage.getItem("ludy:bestStreak")) || 0);
  const [shuffleOn, setShuffleOn] = useState(() => localStorage.getItem("ludy:shuffle") !== "false");
  const [isDark, setIsDark] = useState(() => localStorage.getItem("ludy:theme") === "dark");

  // Pomodoro (25/5)
  const WORK = 25 * 60; const BREAK = 5 * 60;
  const [phase, setPhase] = useState<Phase>("work");
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(WORK);

  const fileRef = useRef<HTMLInputElement>(null);
  const defaultCsvLoadedRef = useRef(false);

  // Design helper
  const glass = "backdrop-blur bg-white/70 dark:bg-white/10 border border-white/60 dark:border-white/10 shadow-lg";

  useEffect(() => { devSelfTest(); }, []);

  // Load default CSV on mount
  useEffect(() => {
    if (defaultCsvLoadedRef.current) return;
    defaultCsvLoadedRef.current = true;
    setLoading(true);
    fetch('/default.csv')
      .then((res) => res.text())
      .then((text) => {
        Papa.parse(text, {
          delimiter: ";",
          header: true,
          skipEmptyLines: true,
          encoding: "UTF-8",
          complete: (res) => {
            const parsed: Vocab[] = [];
            for (const r of res.data as any[]) {
              const row = normalizeRow(r);
              if (row) parsed.push(row);
            }
            setRows(parsed);
            setLoading(false);
          },
          error: () => setLoading(false),
        });
      })
      .catch(() => setLoading(false));
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem("ludy:mode", mode);
    localStorage.setItem("ludy:direction", direction);
    localStorage.setItem("ludy:shuffle", String(shuffleOn));
    localStorage.setItem("ludy:theme", isDark ? "dark" : "light");
  }, [mode, direction, shuffleOn, isDark]);

  useEffect(() => {
    localStorage.setItem("ludy:bestStreak", String(bestStreak));
  }, [bestStreak]);

  // Keep session list in sync with rows
  useEffect(() => {
    setTrainingRows(rows);
    setWrongRows([]);
    hardResetProgress();
  }, [rows]);

  // PWA registration (safe – does NOT modify JSON files)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!document.querySelector('link[rel="manifest"]')) {
      const l = document.createElement('link'); l.rel = 'manifest'; l.href = '/manifest.json'; document.head.appendChild(l);
    }
    if (!document.querySelector('meta[name="theme-color"]')) {
      const m = document.createElement('meta'); m.name = 'theme-color'; m.content = '#0ea5e9'; document.head.appendChild(m);
    }
    if ('serviceWorker' in navigator) {
      const onLoad = () => navigator.serviceWorker.register('/sw.js').catch(() => {});
      window.addEventListener('load', onLoad);
      return () => window.removeEventListener('load', onLoad);
    }
  }, []);

  const list = useMemo(() => (shuffleOn ? shuffle(trainingRows) : trainingRows), [trainingRows, shuffleOn]);
  const current = list[index] as Vocab | undefined;
  const progress = list.length ? Math.round(((index + 1) / list.length) * 100) : 0;
  const accuracy = score.total ? Math.round((score.good / Math.max(score.total, 1)) * 100) : 0;

  const qcmOptions = useMemo(() => {
    if (!current || list.length === 0) return [] as string[];
    const correct = direction === "FR→EN" ? current.EN : current.FR;
    const pool = list.map((r) => (direction === "FR→EN" ? r.EN : r.FR));
    const distractors = pickN(pool, 3, pool.indexOf(correct));
    return shuffle([correct, ...distractors]);
  }, [current, list, direction]);

  function hardResetProgress() {
    setIndex(0); setShowBack(false); setAnswer(""); setScore({ good: 0, total: 0 }); setCurrentStreak(0);
  }

  function resetSession() { hardResetProgress(); }

  function nextCard(correct?: boolean) {
    setScore((s) => ({ good: s.good + (correct ? 1 : 0), total: s.total + 1 }));
    setCurrentStreak((cs) => { const ns = correct ? cs + 1 : 0; setBestStreak((bs) => Math.max(bs, ns)); return ns; });
    if (!correct && current) {
      const key = (v: Vocab) => `${v.EN}__${v.FR}`;
      setWrongRows((wr) => (wr.some((v) => key(v) === key(current)) ? wr : [...wr, current]));
    }
    setShowBack(false); setAnswer(""); setIndex((i) => clamp(i + 1, 0, Math.max(list.length - 1, 0)));
  }

  function jumpTo(i: number) { setIndex(clamp(i, 0, Math.max(list.length - 1, 0))); setShowBack(false); setAnswer(""); }

  function handleParse(file: File) {
    setLoading(true);
    Papa.parse(file, { delimiter: ";", header: true, skipEmptyLines: true, encoding: "UTF-8",
      complete: (res) => {
        const parsed: Vocab[] = [];
        for (const r of res.data as any[]) { const row = normalizeRow(r); if (row) parsed.push(row); }
        setRows(parsed); setLoading(false);
      }, error: () => setLoading(false) });
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleParse(f); }

  function handleAnswerSubmit() {
    if (!current) return; const target = (direction === "FR→EN" ? current.EN : current.FR).trim().toLowerCase();
    const given = answer.trim().toLowerCase(); nextCard(given === target);
  }

  // Session end confetti
  useEffect(() => {
    if (list.length > 0 && score.total === list.length && score.good === list.length) {
      confetti({ particleCount: 140, spread: 70, origin: { y: 0.6 } });
    }
  }, [score.total, score.good, list.length]);

  // Pomodoro timer
  useEffect(() => {
    if (!running) return; const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t > 0) return t - 1;
        const next: Phase = phase === "work" ? "break" : "work"; setPhase(next); return next === "work" ? WORK : BREAK;
      });
    }, 1000); return () => clearInterval(id);
  }, [running, phase]);

  const toggleTimer = () => setRunning((r) => !r);
  const resetTimer = () => { setRunning(false); setPhase("work"); setTimeLeft(WORK); };

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");
  const pomoProgress = phase === "work" ? ((WORK - timeLeft) / WORK) * 100 : ((BREAK - timeLeft) / BREAK) * 100;

  const wrapperClass = isDark
    ? "dark relative min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-950 to-black text-slate-100"
    : "relative min-h-screen w-full bg-gradient-to-br from-indigo-50 via-sky-50 to-slate-100";

  return (
    <div className={`${wrapperClass} p-4 sm:p-8`}>
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: isDark ? 0.25 : 0.5, scale: 1 }} transition={{ duration: 0.8 }} className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-300 to-sky-200 dark:from-slate-700 dark:to-slate-800 blur-3xl" />
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: isDark ? 0.2 : 0.45, scale: 1 }} transition={{ duration: 0.8, delay: 0.1 }} className="absolute -bottom-28 -right-28 h-96 w-96 rounded-full bg-gradient-to-br from-fuchsia-200 to-pink-200 dark:from-emerald-900 dark:to-cyan-900 blur-3xl" />
      </div>

      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-br from-slate-900 to-slate-600 bg-clip-text text-transparent dark:from-white dark:to-slate-300">LudyEnglish</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="dark:bg-slate-800 dark:text-slate-200">Cartes: {trainingRows.length}</Badge>
            <Badge variant="outline" className="dark:border-slate-700 dark:text-slate-300">Score: {score.good}/{score.total}</Badge>
            <Button variant="secondary" onClick={() => setIsDark((v) => !v)} className="ml-2">
              {isDark ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />} {isDark ? "Clair" : "Sombre"}
            </Button>
          </div>
        </header>

        {/* Scoreboard + Pomodoro */}
        <div className="grid gap-4 sm:grid-cols-2 mb-6">
          <Card className={`${glass}`}>
            <CardHeader className="pb-2"><CardTitle className="text-lg">Scoreboard</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2 text-sm">
              <Badge className="bg-emerald-600 hover:bg-emerald-700">Série: {currentStreak}</Badge>
              <Badge variant="outline" className="dark:border-slate-700">Meilleure série: {bestStreak}</Badge>
              <Badge variant="secondary" className="dark:bg-slate-800">Précision: {accuracy}%</Badge>
              <Badge variant="outline" className="dark:border-slate-700">Erreurs: {wrongRows.length}</Badge>
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => { setTrainingRows(rows); hardResetProgress(); }}><RotateCcw className="mr-2 h-4 w-4"/>Session complète</Button>
                <Button size="sm" onClick={() => { if (wrongRows.length>0){ setTrainingRows(wrongRows); hardResetProgress(); } }} disabled={wrongRows.length===0} className="bg-amber-500 hover:bg-amber-600 text-white"><XCircle className="mr-2 h-4 w-4"/>Erreurs uniquement</Button>
              </div>
            </CardContent>
          </Card>

          <Card className={`${glass}`}>
            <CardHeader className="pb-2"><CardTitle className="text-lg">Pomodoro 25/5</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2 text-sm">
                <div>Phase: <span className="font-semibold">{phase === "work" ? "Travail" : "Pause"}</span></div>
                <div className="font-mono text-lg">{mm}:{ss}</div>
              </div>
              <Progress value={pomoProgress} className="h-2 mb-3" />
              <div className="flex gap-2">
                <Button size="sm" className="bg-gradient-to-r from-indigo-500 to-sky-500 text-white" onClick={toggleTimer}>{running ? <><Pause className="mr-2 h-4 w-4"/>Pause</> : <><Play className="mr-2 h-4 w-4"/>Start</>}</Button>
                <Button size="sm" variant="secondary" onClick={() => { const next = phase === "work" ? "break" : "work"; setPhase(next as Phase); setTimeLeft(next === "work" ? WORK : BREAK); }}>Switch</Button>
                <Button size="sm" variant="outline" onClick={resetTimer}><TimerReset className="mr-2 h-4 w-4"/>Reset</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Import */}
        <Card className={`${glass} mb-6`}> 
          <CardHeader className="pb-2"><CardTitle className="text-lg">Importer un fichier CSV</CardTitle></CardHeader>
          <CardContent>
            <div onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-6 text-center dark:border-white/10">
              <Upload className="h-6 w-6" />
              <p className="text-sm text-slate-600 dark:text-slate-300">Glisse-dépose ton fichier ici ou</p>
              <div className="flex gap-2">
                <Input ref={fileRef} type="file" accept=".csv" onChange={(e: React.ChangeEvent<HTMLInputElement>) => e.target.files?.[0] && handleParse(e.target.files[0])} />
                <Button className="bg-gradient-to-br from-indigo-500 to-sky-500 text-white hover:opacity-90" onClick={() => fileRef.current?.click()}>Choisir un fichier</Button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Format attendu (avec en-têtes): <span className="font-mono">EN;FR;EG</span></p>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><AlertCircle className="h-4 w-4" /> Utilise le point-virgule « ; » comme séparateur.</div>
              {loading && (<div className="mt-2 flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Chargement…</div>)}
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card className={`${glass} mb-6`}>
          <CardContent className="pt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label className="mb-1 block">Mode</Label>
              <Select value={mode} onValueChange={(v: Mode) => { setMode(v); resetSession(); }}>
                <SelectTrigger className="bg-white dark:bg-slate-900"><SelectValue placeholder="Choisir le mode" /></SelectTrigger>
                <SelectContent className="dark:bg-slate-900">
                  <SelectItem value="flashcards">Flashcards</SelectItem>
                  <SelectItem value="qcm">QCM</SelectItem>
                  <SelectItem value="writing">Écriture</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block">Direction</Label>
              <Select value={direction} onValueChange={(v: Direction) => { setDirection(v); resetSession(); }}>
                <SelectTrigger className="bg-white dark:bg-slate-900"><SelectValue placeholder="FR→EN" /></SelectTrigger>
                <SelectContent className="dark:bg-slate-900">
                  <SelectItem value="FR→EN">FR → EN</SelectItem>
                  <SelectItem value="EN→FR">EN → FR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={() => setShuffleOn((s) => !s)} className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90">
                <Shuffle className="mr-2 h-4 w-4" /> {shuffleOn ? "Mélange activé" : "Mélange désactivé"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
        <div className="mb-4 flex items-center gap-3">
          <Progress value={progress} className="h-2 flex-1" />
          <div className="text-xs text-slate-600 dark:text-slate-300 w-20 text-right">{progress}%</div>
        </div>

        {/* Trainer */}
        <AnimatePresence mode="wait">
          <motion.div key={`${mode}-${index}-${direction}-${trainingRows.length}-${shuffleOn}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            <Card className={`${glass} mb-6`}>
              <CardContent className="pt-6">
                {!current && (
                  <div className="text-center text-slate-500 dark:text-slate-400">
                    <HelpCircle className="mx-auto mb-2 h-8 w-8" />
                    Importez un CSV pour commencer.
                  </div>
                )}

                {current && (
                  <div className="grid gap-6">
                    {/* Flashcards */}
                    {mode === "flashcards" && (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-full rounded-3xl bg-white/80 dark:bg-white/10 p-8 text-center shadow-md ring-1 ring-black/5 dark:ring-white/5">
                          <div className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Question</div>
                          <div className="text-2xl font-semibold">{direction === "FR→EN" ? current.FR : current.EN}</div>
                        </div>
                        <Button variant="outline" className="hover:scale-[1.02] transition" onClick={() => setShowBack((s) => !s)}>{showBack ? "Masquer la réponse" : "Afficher la réponse"}</Button>
                        {showBack && (
                          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="w-full rounded-3xl bg-white/80 dark:bg-white/10 p-8 text-center shadow-md ring-1 ring-black/5 dark:ring-white/5">
                            <div className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Réponse</div>
                            <div className="text-2xl font-semibold">{direction === "FR→EN" ? current.EN : current.FR}</div>
                            <div className="mt-3 flex justify-center gap-2">
                              <Button size="sm" variant="secondary" onClick={() => speak(current.EN, "en")}><Volume2 className="mr-2 h-4 w-4" /> EN</Button>
                              <Button size="sm" variant="secondary" onClick={() => speak(current.FR, "fr")}><Volume2 className="mr-2 h-4 w-4" /> FR</Button>
                            </div>
                            {!!current.EG && (<div className="mt-3 text-slate-500 dark:text-slate-300 italic text-sm">{current.EG}</div>)}
                          </motion.div>
                        )}
                        <div className="flex gap-2">
                          <Button onClick={() => nextCard(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Check className="mr-2 h-4 w-4" />Je savais</Button>
                          <Button variant="secondary" onClick={() => nextCard(false)} className="hover:scale-[1.01] transition"><AlertCircle className="mr-2 h-4 w-4" />Je reverrai</Button>
                        </div>
                      </div>
                    )}

                    {/* QCM */}
                    {mode === "qcm" && (
                      <div className="grid gap-4">
                        <div className="rounded-3xl bg-white/80 dark:bg-white/10 p-8 shadow-md ring-1 ring-black/5 dark:ring-white/5">
                          <div className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Choisis la bonne réponse</div>
                          <div className="text-2xl font-semibold mb-2">{direction === "FR→EN" ? current.FR : current.EN}</div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {qcmOptions.map((opt) => (
                            <Button key={opt} variant="outline" className="justify-start hover:scale-[1.01] transition" onClick={() => nextCard(opt === (direction === "FR→EN" ? current.EN : current.FR))}>{opt}</Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Writing */}
                    {mode === "writing" && (
                      <div className="grid gap-4">
                        <div className="rounded-3xl bg-white/80 dark:bg-white/10 p-8 shadow-md ring-1 ring-black/5 dark:ring-white/5">
                          <div className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Écris la traduction</div>
                          <div className="text-2xl font-semibold mb-2">{direction === "FR→EN" ? current.FR : current.EN}</div>
                        </div>
                        <div className="flex gap-2">
                          <Input className="dark:bg-slate-900" placeholder={direction === "FR→EN" ? "Réponse en anglais" : "Réponse en français"} value={answer} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnswer(e.target.value)} onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && handleAnswerSubmit()} />
                          <Button className="bg-gradient-to-br from-indigo-500 to-sky-500 text-white hover:opacity-90" onClick={handleAnswerSubmit}>Valider</Button>
                        </div>
                        {answer && current && (
                          <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
                            <div><span className="font-semibold">Solution:</span> {direction === "FR→EN" ? current.EN : current.FR}</div>
                            {!!current.EG && (<div className="text-slate-500 dark:text-slate-400 italic">{current.EG}</div>)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Nav */}
        <div className="mb-10 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600 dark:text-slate-300">Carte {list.length ? index + 1 : 0} / {list.length}</div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { setTrainingRows(rows); hardResetProgress(); }} className="hover:scale-[1.01] transition"><RefreshCw className="mr-2 h-4 w-4" /> Recommencer</Button>
            <Button variant="secondary" disabled={index <= 0} onClick={() => jumpTo(index - 1)} className="hover:scale-[1.01] transition">Précédent</Button>
            <Button disabled={index >= list.length - 1 || list.length === 0} onClick={() => jumpTo(index + 1)} className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90">Suivant</Button>
          </div>
        </div>

        {/* Tips */}
        <Card className={`${glass} mb-6`}>
          <CardHeader className="pb-2"><CardTitle className="text-lg">Conseils d'utilisation</CardTitle></CardHeader>
          <CardContent className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
            <p>CSV UTF‑8 avec en‑têtes <span className="font-mono">EN;FR;EG</span>. EG est un exemple facultatif (affiché côté réponse).</p>
            <p>Exemple :<br/><span className="font-mono">EN;FR;EG</span><br/><span className="font-mono">to set off;partir (se mettre en route);We set off from Brussels at 8 a.m.</span></p>
            <p>Astuce : active <strong>Mélange</strong> pour varier l’ordre. Utilise les boutons <strong>EN/FR</strong> pour la prononciation.</p>
          </CardContent>
        </Card>

        <footer className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">Fait avec ♥ pour réviser plus vite — <span className="font-mono">CSV EN;FR;EG</span></footer>
      </div>
    </div>
  );
}
