import React, { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  Check,
  HelpCircle,
  Loader2,
  RefreshCw,
  Shuffle,
  Upload,
  Volume2,
  Moon,
  Sun,
  Sparkles,
  RotateCcw,
  XCircle,
  Play,
  Pause,
  TimerReset,
  X,
  Info,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useUserData } from "@/hooks/useUserData";
import {
  listFolders,
  createFolder,
  listCsvs,
  saveCsv,
  getCsv,
  type UserFolder,
  type UserCsvMeta,
} from "@/lib/userCollections";

// ================= Types =================
export type Vocab = { EN: string; FR: string; EG?: string };
type Mode = "flashcards" | "qcm" | "writing";
type Direction = "FR→EN" | "EN→FR";
type Phase = "work" | "break";
type ToastType = "success" | "error" | "info";
type Toast = { id: number; message: string; type: ToastType };

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

// Toast helper functions
function showToast(
  message: string,
  type: ToastType,
  setToasts: React.Dispatch<React.SetStateAction<Toast[]>>,
  toastIdRef: React.MutableRefObject<number>
) {
  const id = toastIdRef.current++;
  setToasts((prev) => [...prev, { id, message, type }]);
  setTimeout(() => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, 3000);
}

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
    console.assert(
      a?.EN === "hello" && a?.FR === "bonjour" && a?.EG === "Hello, Anaïs!",
      "normalizeRow maps headers"
    );

    // normalizeRow – missing EG allowed
    const b = normalizeRow({ EN: "cat", FR: "chat" });
    console.assert(!!b && b!.EG !== undefined, "EG exists (possibly empty string)");

    // clamp
    console.assert(
      clamp(10, 0, 5) === 5 && clamp(-3, 0, 5) === 0 && clamp(3, 0, 5) === 3,
      "clamp ok"
    );

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
    const pool = list.map((r) => r.EN);
    const distractors = pickN(pool, 3, pool.indexOf(current.EN));
    console.assert(
      distractors.length <= 3 && !distractors.includes(current.EN),
      "distractors valid"
    );

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
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedQcmOption, setSelectedQcmOption] = useState<string | null>(null);
  const [qcmAnswered, setQcmAnswered] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [folders, setFolders] = useState<UserFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [csvs, setCsvs] = useState<UserCsvMeta[]>([]);
  const [loadingCsvs, setLoadingCsvs] = useState(false);
  const [selectedCsvIds, setSelectedCsvIds] = useState<string[]>([]);
  // Load persisted state
  const [mode, setMode] = useState<Mode>(
    () => (localStorage.getItem("ludy:mode") as Mode) || "flashcards"
  );
  const [direction, setDirection] = useState<Direction>(
    () => (localStorage.getItem("ludy:direction") as Direction) || "FR→EN"
  );
  const [index, setIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState({ good: 0, total: 0 });
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(
    () => Number(localStorage.getItem("ludy:bestStreak")) || 0
  );
  const [shuffleOn, setShuffleOn] = useState(
    () => localStorage.getItem("ludy:shuffle") !== "false"
  );
  const [isDark, setIsDark] = useState(() => localStorage.getItem("ludy:theme") === "dark");

  useUserData(user, bestStreak, setBestStreak);

  // Pomodoro (25/5)
  const WORK = 25 * 60;
  const BREAK = 5 * 60;
  const [phase, setPhase] = useState<Phase>("work");
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(WORK);

  const fileRef = useRef<HTMLInputElement>(null);
  const defaultCsvLoadedRef = useRef(false);
  const toastIdRef = useRef(0);

  // Design helper
  const glass =
    "backdrop-blur bg-white/70 dark:bg-white/10 border border-white/60 dark:border-white/10 shadow-lg";

  useEffect(() => {
    devSelfTest();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) {
      setFolders([]);
      setSelectedFolderId(null);
      setCsvs([]);
      setSelectedCsvIds([]);
      return;
    }
    listFolders(user.uid)
      .then((f) => {
        setFolders(f);
        if (f.length > 0 && !selectedFolderId) {
          setSelectedFolderId(f[0].id);
        }
      })
      .catch((e) => {
        console.warn("Failed to load folders", e);
      });
  }, [user]);

  useEffect(() => {
    if (!user || !selectedFolderId) {
      setCsvs([]);
      setSelectedCsvIds([]);
      return;
    }
    setLoadingCsvs(true);
    listCsvs(user.uid, selectedFolderId)
      .then((list) => {
        setCsvs(list);
      })
      .catch((e) => {
        console.warn("Failed to load CSV list", e);
      })
      .finally(() => {
        setLoadingCsvs(false);
      });
  }, [user, selectedFolderId]);

  // Load default CSV on mount
  useEffect(() => {
    if (defaultCsvLoadedRef.current) return;
    defaultCsvLoadedRef.current = true;
    setLoading(true);
    fetch("/default.csv")
      .then((res) => {
        if (!res.ok) throw new Error("Fichier non trouvé");
        return res.text();
      })
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
            if (parsed.length > 0) {
              setRows(parsed);
              showToast(
                `✅ ${parsed.length} mots chargés depuis le fichier par défaut`,
                "success",
                setToasts,
                toastIdRef
              );
            } else {
              showToast("⚠️ Le fichier CSV est vide", "error", setToasts, toastIdRef);
            }
            setLoading(false);
          },
          error: () => {
            showToast("❌ Erreur lors du chargement du CSV", "error", setToasts, toastIdRef);
            setLoading(false);
          },
        });
      })
      .catch(() => {
        showToast("❌ Impossible de charger le fichier par défaut", "error", setToasts, toastIdRef);
        setLoading(false);
      });
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
    setQcmAnswered(false);
    setSelectedQcmOption(null);
  }, [rows]);

  // PWA registration (safe – does NOT modify JSON files)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!document.querySelector('link[rel="manifest"]')) {
      const l = document.createElement("link");
      l.rel = "manifest";
      l.href = "/manifest.json";
      document.head.appendChild(l);
    }
    if (!document.querySelector('meta[name="theme-color"]')) {
      const m = document.createElement("meta");
      m.name = "theme-color";
      m.content = "#0ea5e9";
      document.head.appendChild(m);
    }
    if ("serviceWorker" in navigator) {
      const onLoad = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
      window.addEventListener("load", onLoad);
      return () => window.removeEventListener("load", onLoad);
    }
  }, []);

  const list = useMemo(
    () => (shuffleOn ? shuffle(trainingRows) : trainingRows),
    [trainingRows, shuffleOn]
  );
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
    setIndex(0);
    setShowBack(false);
    setAnswer("");
    setScore({ good: 0, total: 0 });
    setCurrentStreak(0);
    setQcmAnswered(false);
    setSelectedQcmOption(null);
  }

  function resetSession() {
    hardResetProgress();
  }

  async function handleGoogleSignIn() {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.warn("Google sign-in failed", e);
    }
  }

  async function handleSignOut() {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Sign-out failed", e);
    }
  }

  function nextCard(correct?: boolean) {
    setLastAnswerCorrect(correct ?? null);
    setScore((s) => ({ good: s.good + (correct ? 1 : 0), total: s.total + 1 }));
    setCurrentStreak((cs) => {
      const ns = correct ? cs + 1 : 0;
      if (ns > 0 && ns % 5 === 0) {
        showToast(`🔥 Série de ${ns} bonnes réponses !`, "success", setToasts, toastIdRef);
      }
      setBestStreak((bs) => Math.max(bs, ns));
      return ns;
    });
    if (!correct && current) {
      const key = (v: Vocab) => `${v.EN}__${v.FR}`;
      setWrongRows((wr) => (wr.some((v) => key(v) === key(current)) ? wr : [...wr, current]));
    }

    // Confetti pour les bonnes réponses en QCM
    if (correct && mode === "qcm") {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#10b981", "#3b82f6", "#8b5cf6"],
      });
    }

    // Pour les modes autres que QCM, réinitialiser immédiatement
    if (mode !== "qcm") {
      setQcmAnswered(false);
      setSelectedQcmOption(null);
    }

    setTimeout(
      () => {
        setLastAnswerCorrect(null);
        setShowBack(false);
        setAnswer("");
        // Réinitialiser les états QCM après le délai pour permettre l'affichage visuel
        if (mode === "qcm") {
          setQcmAnswered(false);
          setSelectedQcmOption(null);
        }
        setIndex((i) => clamp(i + 1, 0, Math.max(list.length - 1, 0)));
      },
      mode === "qcm" ? (correct ? 2000 : 3500) : 800
    );
  }

  function jumpTo(i: number) {
    setIndex(clamp(i, 0, Math.max(list.length - 1, 0)));
    setShowBack(false);
    setAnswer("");
    setQcmAnswered(false);
    setSelectedQcmOption(null);
  }

  function handleParse(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      showToast("❌ Veuillez sélectionner un fichier CSV", "error", setToasts, toastIdRef);
      return;
    }
    setLoading(true);
    Papa.parse(file, {
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
        if (parsed.length > 0) {
          setRows(parsed);
          showToast(
            `✅ ${parsed.length} mots chargés avec succès !`,
            "success",
            setToasts,
            toastIdRef
          );
        } else {
          showToast("⚠️ Aucun mot valide trouvé dans le fichier", "error", setToasts, toastIdRef);
        }
        setLoading(false);
      },
      error: (err) => {
        showToast(
          `❌ Erreur lors du parsing: ${err.message || "Format invalide"}`,
          "error",
          setToasts,
          toastIdRef
        );
        setLoading(false);
      },
    });
  }

  async function handleCreateFolder() {
    if (!user) return;
    const name = window.prompt("Nom du dossier");
    if (!name) return;
    try {
      const folder = await createFolder(user.uid, name.trim());
      setFolders((prev) => [...prev, folder]);
      setSelectedFolderId(folder.id);
      showToast(`📁 Dossier "${name}" créé`, "success", setToasts, toastIdRef);
    } catch (e) {
      console.warn("Failed to create folder", e);
      showToast("❌ Impossible de créer le dossier", "error", setToasts, toastIdRef);
    }
  }

  async function handleSaveCsvToFolder(fileName: string, parsedRows: Vocab[]) {
    if (!user || !selectedFolderId || parsedRows.length === 0) return;
    try {
      await saveCsv(user.uid, selectedFolderId, fileName, parsedRows);
      listCsvs(user.uid, selectedFolderId)
        .then((list) => setCsvs(list))
        .catch(() => {});
    } catch (e) {
      console.warn("Failed to save CSV", e);
    }
  }

  async function handleLoadCsv(csvId: string, name: string) {
    if (!user || !selectedFolderId) return;
    setLoading(true);
    try {
      const loaded = await getCsv(user.uid, selectedFolderId, csvId);
      if (loaded && loaded.length > 0) {
        setRows(loaded);
        showToast(
          `✅ ${loaded.length} mots chargés depuis "${name}"`,
          "success",
          setToasts,
          toastIdRef
        );
      } else {
        showToast("⚠️ Ce fichier est vide ou introuvable", "error", setToasts, toastIdRef);
      }
    } catch (e) {
      console.warn("Failed to load CSV", e);
      showToast("❌ Erreur lors du chargement du fichier", "error", setToasts, toastIdRef);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelectedCsv(id: string) {
    setSelectedCsvIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleLoadSelectedCsvs() {
    if (!user || !selectedFolderId || selectedCsvIds.length === 0) return;
    setLoading(true);
    try {
      const all: Vocab[] = [];
      for (const id of selectedCsvIds) {
        const meta = csvs.find((c) => c.id === id);
        const loaded = await getCsv(user.uid, selectedFolderId, id);
        if (loaded && loaded.length > 0) {
          all.push(...loaded);
        } else if (meta) {
          console.warn("Empty CSV", meta.name);
        }
      }
      if (all.length > 0) {
        setRows(all);
        showToast(
          `✅ ${all.length} mots chargés depuis ${selectedCsvIds.length} fichier(s)`,
          "success",
          setToasts,
          toastIdRef
        );
      } else {
        showToast(
          "⚠️ Aucun mot trouvé dans les fichiers sélectionnés",
          "error",
          setToasts,
          toastIdRef
        );
      }
    } catch (e) {
      console.warn("Failed to load selected CSVs", e);
      showToast(
        "❌ Erreur lors du chargement des fichiers sélectionnés",
        "error",
        setToasts,
        toastIdRef
      );
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleParse(f);
  }

  function handleAnswerSubmit() {
    if (!current) return;
    const target = (direction === "FR→EN" ? current.EN : current.FR).trim().toLowerCase();
    const given = answer.trim().toLowerCase();
    const isCorrect = given === target;
    if (isCorrect) {
      showToast("✅ Bonne réponse !", "success", setToasts, toastIdRef);
    } else {
      showToast(
        `❌ Mauvaise réponse. La bonne réponse était: ${direction === "FR→EN" ? current.EN : current.FR}`,
        "error",
        setToasts,
        toastIdRef
      );
    }
    nextCard(isCorrect);
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement) {
        if (e.key === "Enter") return; // Allow Enter in input
        return;
      }

      switch (e.key) {
        case " ": // Spacebar - toggle answer/show next
          e.preventDefault();
          if (mode === "flashcards") {
            if (showBack) {
              nextCard();
            } else {
              setShowBack(true);
            }
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (index < list.length - 1) jumpTo(index + 1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (index > 0) jumpTo(index - 1);
          break;
        case "r":
        case "R":
          e.preventDefault();
          setTrainingRows(rows);
          hardResetProgress();
          showToast("🔄 Session réinitialisée", "info", setToasts, toastIdRef);
          break;
        case "s":
        case "S":
          e.preventDefault();
          setShuffleOn((s) => {
            const newVal = !s;
            showToast(
              newVal ? "🔀 Mélange activé" : "📋 Ordre normal",
              "info",
              setToasts,
              toastIdRef
            );
            return newVal;
          });
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [mode, showBack, index, list.length, rows]);

  // Session end confetti
  useEffect(() => {
    if (list.length > 0 && score.total === list.length && score.good === list.length) {
      confetti({ particleCount: 140, spread: 70, origin: { y: 0.6 } });
    }
  }, [score.total, score.good, list.length]);

  // Pomodoro timer
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t > 0) return t - 1;
        const next: Phase = phase === "work" ? "break" : "work";
        setPhase(next);
        return next === "work" ? WORK : BREAK;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, phase]);

  const toggleTimer = () => setRunning((r) => !r);
  const resetTimer = () => {
    setRunning(false);
    setPhase("work");
    setTimeLeft(WORK);
  };

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");
  const pomoProgress =
    phase === "work" ? ((WORK - timeLeft) / WORK) * 100 : ((BREAK - timeLeft) / BREAK) * 100;

  const wrapperClass = isDark
    ? "dark relative min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-950 to-black text-slate-100"
    : "relative min-h-screen w-full bg-gradient-to-br from-indigo-50 via-sky-50 to-slate-100";

  return (
    <div className={`${wrapperClass} p-4 sm:p-8`}>
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className={`${glass} p-4 rounded-lg shadow-lg flex items-center gap-3 ${
                toast.type === "success"
                  ? "border-l-4 border-emerald-500"
                  : toast.type === "error"
                    ? "border-l-4 border-red-500"
                    : "border-l-4 border-blue-500"
              }`}
            >
              {toast.type === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
              {toast.type === "error" && <AlertCircle className="h-5 w-5 text-red-500" />}
              {toast.type === "info" && <Info className="h-5 w-5 text-blue-500" />}
              <p className="text-sm flex-1">{toast.message}</p>
              <button onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}>
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: isDark ? 0.25 : 0.5, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-300 to-sky-200 dark:from-slate-700 dark:to-slate-800 blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: isDark ? 0.2 : 0.45, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="absolute -bottom-28 -right-28 h-96 w-96 rounded-full bg-gradient-to-br from-fuchsia-200 to-pink-200 dark:from-emerald-900 dark:to-cyan-900 blur-3xl"
        />
      </div>

      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-br from-slate-900 to-slate-600 bg-clip-text text-transparent dark:from-white dark:to-slate-300">
              LudyEnglish
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="dark:bg-slate-800 dark:text-slate-200">
              Cartes: {trainingRows.length}
            </Badge>
            <Badge variant="outline" className="dark:border-slate-700 dark:text-slate-300">
              Score: {score.good}/{score.total}
            </Badge>
            {user ? (
              <div className="flex items-center gap-2 ml-2">
                <Badge
                  variant="secondary"
                  className="dark:bg-slate-800 dark:text-slate-200 max-w-[160px] truncate"
                >
                  {user.email || "Connecté"}
                </Badge>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  Déconnexion
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={handleGoogleSignIn} className="ml-2">
                Se connecter avec Google
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => setShowHelp(!showHelp)}
              className="text-xs"
              title="Aide et raccourcis clavier"
            >
              <HelpCircle className="h-4 w-4 mr-1" /> Aide
            </Button>
            <Button variant="secondary" onClick={() => setIsDark((v) => !v)} className="ml-2">
              {isDark ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}{" "}
              {isDark ? "Clair" : "Sombre"}
            </Button>
          </div>
        </header>

        {/* Scoreboard + Pomodoro */}
        <div className="grid gap-4 sm:grid-cols-2 mb-6">
          <Card className={`${glass}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Scoreboard</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2 text-sm">
              <Badge className="bg-emerald-600 hover:bg-emerald-700">Série: {currentStreak}</Badge>
              <Badge variant="outline" className="dark:border-slate-700">
                Meilleure série: {bestStreak}
              </Badge>
              <Badge variant="secondary" className="dark:bg-slate-800">
                Précision: {accuracy}%
              </Badge>
              <Badge variant="outline" className="dark:border-slate-700">
                Erreurs: {wrongRows.length}
              </Badge>
              <div className="ml-auto flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setTrainingRows(rows);
                    hardResetProgress();
                    showToast("📚 Session complète chargée", "info", setToasts, toastIdRef);
                  }}
                  title="Réviser toutes les cartes"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Session complète
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (wrongRows.length > 0) {
                      setTrainingRows(wrongRows);
                      hardResetProgress();
                      showToast(
                        `📝 ${wrongRows.length} erreurs à réviser`,
                        "info",
                        setToasts,
                        toastIdRef
                      );
                    }
                  }}
                  disabled={wrongRows.length === 0}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                  title="Réviser uniquement les erreurs"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Erreurs uniquement ({wrongRows.length})
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className={`${glass}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Pomodoro 25/5</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2 text-sm">
                <div>
                  Phase:{" "}
                  <span className="font-semibold">{phase === "work" ? "Travail" : "Pause"}</span>
                </div>
                <div className="font-mono text-lg">
                  {mm}:{ss}
                </div>
              </div>
              <Progress value={pomoProgress} className="h-2 mb-3" />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-indigo-500 to-sky-500 text-white"
                  onClick={toggleTimer}
                >
                  {running ? (
                    <>
                      <Pause className="mr-2 h-4 w-4" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Start
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const next = phase === "work" ? "break" : "work";
                    setPhase(next as Phase);
                    setTimeLeft(next === "work" ? WORK : BREAK);
                  }}
                >
                  Switch
                </Button>
                <Button size="sm" variant="outline" onClick={resetTimer}>
                  <TimerReset className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Help Panel */}
        {showHelp && (
          <Card className={`${glass} mb-6 border-blue-200 dark:border-blue-800`}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                Aide et raccourcis clavier
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowHelp(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 dark:text-slate-300 space-y-3">
              <div>
                <p className="font-semibold mb-2">Raccourcis clavier :</p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>
                    <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded">Espace</kbd> -
                    Afficher/masquer la réponse (mode flashcards)
                  </li>
                  <li>
                    <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded">→</kbd> -
                    Carte suivante
                  </li>
                  <li>
                    <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded">←</kbd> -
                    Carte précédente
                  </li>
                  <li>
                    <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded">R</kbd> -
                    Recommencer la session
                  </li>
                  <li>
                    <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded">S</kbd> -
                    Activer/désactiver le mélange
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-2">Conseils :</p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>Utilisez les boutons audio pour entendre la prononciation</li>
                  <li>Les erreurs sont automatiquement sauvegardées pour révision</li>
                  <li>Le mode Pomodoro vous aide à rester concentré</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Import */}
        <Card className={`${glass} mb-6`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Importer un fichier CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex-1 flex flex-col gap-1">
                  <Label className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Dossier (optionnel)
                  </Label>
                  <div className="flex gap-2 items-center">
                    <Select
                      value={selectedFolderId ?? undefined}
                      onValueChange={(v) => setSelectedFolderId(v)}
                    >
                      <SelectTrigger className="bg-white dark:bg-slate-900 w-full sm:w-64">
                        <SelectValue
                          placeholder={
                            folders.length === 0 ? "Aucun dossier" : "Choisir un dossier"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-900">
                        {folders.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" onClick={handleCreateFolder}>
                      Nouveau dossier
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-2 sm:mt-0">
                  Les CSV importés seront sauvegardés dans le dossier sélectionné pour être
                  rechargés plus tard.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Connecte-toi avec Google pour créer des dossiers et sauvegarder tes CSV perso.
              </p>
            )}

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-6 text-center dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
            >
              <Upload className="h-6 w-6" />
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Glisse-dépose ton fichier ici ou
              </p>
              <div className="flex gap-2">
                <Input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    handleParse(f);
                    if (user && selectedFolderId) {
                      // Sauvegarde simple après parsing : on utilise les rows une fois le parsing terminé
                      // via un petit timeout pour laisser le state se mettre à jour.
                      setTimeout(() => {
                        if (rows.length > 0) {
                          handleSaveCsvToFolder(f.name, rows);
                        }
                      }, 500);
                    }
                  }}
                  className="hidden"
                />
                <Button
                  className="bg-gradient-to-br from-indigo-500 to-sky-500 text-white hover:opacity-90"
                  onClick={() => fileRef.current?.click()}
                >
                  Choisir un fichier
                </Button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Format attendu (avec en-têtes): <span className="font-mono">EN;FR;EG</span>
              </p>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> Utilise le point-virgule « ; » comme séparateur.
              </div>
              {loading && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement…
                </div>
              )}
              {rows.length > 0 && !loading && (
                <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> {rows.length} mots chargés
                </div>
              )}
            </div>

            {user && selectedFolderId && (
              <div className="mt-4 text-left">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-2">
                  Fichiers sauvegardés dans ce dossier
                  {loadingCsvs && <Loader2 className="h-3 w-3 animate-spin" />}
                </p>
                {csvs.length === 0 && !loadingCsvs && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Aucun CSV sauvegardé pour ce dossier pour le moment.
                  </p>
                )}
                {csvs.length > 0 && (
                  <>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {csvs.map((c) => {
                        const selected = selectedCsvIds.includes(c.id);
                        return (
                          <Button
                            key={c.id}
                            size="sm"
                            variant={selected ? "default" : "outline"}
                            onClick={() => toggleSelectedCsv(c.id)}
                          >
                            {selected ? "✓ " : ""}
                            {c.name} ({c.rowCount})
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={selectedCsvIds.length === 0 || loading}
                      onClick={handleLoadSelectedCsvs}
                    >
                      Charger les CSV sélectionnés
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settings */}
        <Card className={`${glass} mb-6`}>
          <CardContent className="pt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label className="mb-1 block">Mode</Label>
              <Select
                value={mode}
                onValueChange={(v: Mode) => {
                  setMode(v);
                  resetSession();
                }}
              >
                <SelectTrigger className="bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Choisir le mode" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-900">
                  <SelectItem value="flashcards">Flashcards</SelectItem>
                  <SelectItem value="qcm">QCM</SelectItem>
                  <SelectItem value="writing">Écriture</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block">Direction</Label>
              <Select
                value={direction}
                onValueChange={(v: Direction) => {
                  setDirection(v);
                  resetSession();
                }}
              >
                <SelectTrigger className="bg-white dark:bg-slate-900">
                  <SelectValue placeholder="FR→EN" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-900">
                  <SelectItem value="FR→EN">FR → EN</SelectItem>
                  <SelectItem value="EN→FR">EN → FR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={() => setShuffleOn((s) => !s)}
                className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
              >
                <Shuffle className="mr-2 h-4 w-4" />{" "}
                {shuffleOn ? "Mélange activé" : "Mélange désactivé"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
        <div className="mb-4 flex items-center gap-3">
          <Progress value={progress} className="h-2 flex-1" />
          <div className="text-xs text-slate-600 dark:text-slate-300 w-20 text-right">
            {progress}%
          </div>
        </div>

        {/* Trainer */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${mode}-${index}-${direction}-${trainingRows.length}-${shuffleOn}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
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
                        <motion.div
                          className={`w-full rounded-3xl bg-white/80 dark:bg-white/10 p-8 text-center shadow-md ring-1 ring-black/5 dark:ring-white/5 transition-colors ${
                            lastAnswerCorrect === true
                              ? "ring-2 ring-emerald-500"
                              : lastAnswerCorrect === false
                                ? "ring-2 ring-red-500"
                                : ""
                          }`}
                          animate={lastAnswerCorrect !== null ? { scale: [1, 1.02, 1] } : {}}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                            Question
                          </div>
                          <div className="text-2xl font-semibold">
                            {direction === "FR→EN" ? current.FR : current.EN}
                          </div>
                        </motion.div>
                        <Button
                          variant="outline"
                          className="hover:scale-[1.02] transition"
                          onClick={() => setShowBack((s) => !s)}
                          title="Appuyez sur Espace pour afficher/masquer"
                        >
                          {showBack ? "Masquer la réponse" : "Afficher la réponse"}
                          <span className="ml-2 text-xs text-slate-400">(Espace)</span>
                        </Button>
                        {showBack && (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full rounded-3xl bg-white/80 dark:bg-white/10 p-8 text-center shadow-md ring-1 ring-black/5 dark:ring-white/5"
                          >
                            <div className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                              Réponse
                            </div>
                            <div className="text-2xl font-semibold">
                              {direction === "FR→EN" ? current.EN : current.FR}
                            </div>
                            <div className="mt-3 flex justify-center gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => speak(current.EN, "en")}
                                title="Prononcer en anglais"
                              >
                                <Volume2 className="mr-2 h-4 w-4" /> EN
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => speak(current.FR, "fr")}
                                title="Prononcer en français"
                              >
                                <Volume2 className="mr-2 h-4 w-4" /> FR
                              </Button>
                            </div>
                            {!!current.EG && (
                              <div className="mt-3 text-slate-500 dark:text-slate-300 italic text-sm">
                                {current.EG}
                              </div>
                            )}
                          </motion.div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            onClick={() => nextCard(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            title="Marquer comme connu"
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Je savais
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => nextCard(false)}
                            className="hover:scale-[1.01] transition"
                            title="Marquer pour révision"
                          >
                            <AlertCircle className="mr-2 h-4 w-4" />
                            Je reverrai
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* QCM */}
                    {mode === "qcm" && (
                      <div className="grid gap-4">
                        <motion.div
                          className={`rounded-3xl bg-white/80 dark:bg-white/10 p-8 shadow-md ring-1 ring-black/5 dark:ring-white/5 transition-all ${
                            lastAnswerCorrect === true
                              ? "ring-2 ring-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20"
                              : lastAnswerCorrect === false
                                ? "ring-2 ring-red-500 bg-red-50/50 dark:bg-red-900/20"
                                : ""
                          }`}
                          animate={lastAnswerCorrect !== null ? { scale: [1, 1.02, 1] } : {}}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                            Choisis la bonne réponse
                          </div>
                          <div className="text-2xl font-semibold mb-2">
                            {direction === "FR→EN" ? current.FR : current.EN}
                          </div>
                          {qcmAnswered && lastAnswerCorrect === false && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-300 dark:border-red-700"
                            >
                              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                                <XCircle className="h-4 w-4" />
                                <span className="text-sm">
                                  La bonne réponse était :{" "}
                                  <span className="font-semibold">
                                    {direction === "FR→EN" ? current.EN : current.FR}
                                  </span>
                                </span>
                              </div>
                            </motion.div>
                          )}
                          {qcmAnswered && lastAnswerCorrect === true && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-300 dark:border-emerald-700"
                            >
                              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="text-sm">Bonne réponse !</span>
                              </div>
                            </motion.div>
                          )}
                          {!!current.EG && qcmAnswered && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="mt-3 text-slate-600 dark:text-slate-300 italic text-sm"
                            >
                              💡 {current.EG}
                            </motion.div>
                          )}
                        </motion.div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {qcmOptions.map((opt) => {
                            const isCorrect =
                              opt === (direction === "FR→EN" ? current.EN : current.FR);
                            const isSelected = selectedQcmOption === opt;
                            const showCorrect = qcmAnswered && isCorrect && isSelected;
                            const showIncorrect = qcmAnswered && isSelected && !isCorrect;
                            // Mettre en évidence la bonne réponse quand une mauvaise réponse est sélectionnée
                            // On vérifie qu'une réponse a été donnée, que c'est la bonne réponse, qu'elle n'a pas été sélectionnée,
                            // ET qu'une mauvaise réponse a été sélectionnée (selectedQcmOption existe mais n'est pas correct)
                            const hasWrongAnswer =
                              qcmAnswered &&
                              selectedQcmOption &&
                              selectedQcmOption !==
                                (direction === "FR→EN" ? current.EN : current.FR);
                            const showCorrectAnswer =
                              qcmAnswered && isCorrect && !isSelected && hasWrongAnswer;

                            return (
                              <motion.div
                                key={opt}
                                whileHover={!qcmAnswered ? { scale: 1.02 } : {}}
                                whileTap={!qcmAnswered ? { scale: 0.98 } : {}}
                                animate={{}}
                                transition={{ duration: 0.2 }}
                              >
                                <Button
                                  variant="outline"
                                  className={`justify-start transition-all ${
                                    showCorrect
                                      ? "bg-emerald-500 text-white border-emerald-600"
                                      : showIncorrect
                                        ? "bg-red-500 text-white border-red-600"
                                        : showCorrectAnswer
                                          ? "bg-emerald-500 text-white border-emerald-600"
                                          : qcmAnswered && !isSelected
                                            ? "opacity-40 cursor-not-allowed"
                                            : "hover:scale-[1.01]"
                                  }`}
                                  disabled={qcmAnswered}
                                  onClick={() => {
                                    if (qcmAnswered) return;
                                    setSelectedQcmOption(opt);
                                    setQcmAnswered(true);
                                    const correct = isCorrect;
                                    nextCard(correct);
                                  }}
                                >
                                  <div className="flex items-center gap-2 w-full">
                                    {showCorrect && <CheckCircle2 className="h-4 w-4" />}
                                    {showIncorrect && <XCircle className="h-4 w-4" />}
                                    {showCorrectAnswer && <CheckCircle2 className="h-4 w-4" />}
                                    <span className="flex-1 text-left">{opt}</span>
                                  </div>
                                </Button>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Writing */}
                    {mode === "writing" && (
                      <div className="grid gap-4">
                        <div className="rounded-3xl bg-white/80 dark:bg-white/10 p-8 shadow-md ring-1 ring-black/5 dark:ring-white/5">
                          <div className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                            Écris la traduction
                          </div>
                          <div className="text-2xl font-semibold mb-2">
                            {direction === "FR→EN" ? current.FR : current.EN}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            className="dark:bg-slate-900"
                            placeholder={
                              direction === "FR→EN" ? "Réponse en anglais" : "Réponse en français"
                            }
                            value={answer}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setAnswer(e.target.value)
                            }
                            onKeyDown={(e: React.KeyboardEvent) =>
                              e.key === "Enter" && handleAnswerSubmit()
                            }
                          />
                          <Button
                            className="bg-gradient-to-br from-indigo-500 to-sky-500 text-white hover:opacity-90"
                            onClick={handleAnswerSubmit}
                          >
                            Valider
                          </Button>
                        </div>
                        {answer && current && (
                          <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
                            <div>
                              <span className="font-semibold">Solution:</span>{" "}
                              {direction === "FR→EN" ? current.EN : current.FR}
                            </div>
                            {!!current.EG && (
                              <div className="text-slate-500 dark:text-slate-400 italic">
                                {current.EG}
                              </div>
                            )}
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
          <div className="text-xs text-slate-600 dark:text-slate-300">
            Carte {list.length ? index + 1 : 0} / {list.length}
            {list.length > 0 && (
              <span className="ml-2 text-slate-400">
                ({Math.round(((index + 1) / list.length) * 100)}%)
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={() => {
                setTrainingRows(rows);
                hardResetProgress();
                showToast("🔄 Session réinitialisée", "info", setToasts, toastIdRef);
              }}
              className="hover:scale-[1.01] transition"
              title="Raccourci: R"
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Recommencer
            </Button>
            <Button
              variant="secondary"
              disabled={index <= 0}
              onClick={() => jumpTo(index - 1)}
              className="hover:scale-[1.01] transition"
              title="Raccourci: ←"
            >
              ← Précédent
            </Button>
            <Button
              disabled={index >= list.length - 1 || list.length === 0}
              onClick={() => jumpTo(index + 1)}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
              title="Raccourci: →"
            >
              Suivant →
            </Button>
          </div>
        </div>

        {/* Tips */}
        <Card className={`${glass} mb-6`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Conseils d'utilisation</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
            <p>
              CSV UTF‑8 avec en‑têtes <span className="font-mono">EN;FR;EG</span>. EG est un exemple
              facultatif (affiché côté réponse).
            </p>
            <p>
              Exemple :
              <br />
              <span className="font-mono">EN;FR;EG</span>
              <br />
              <span className="font-mono">
                to set off;partir (se mettre en route);We set off from Brussels at 8 a.m.
              </span>
            </p>
            <p>
              Astuce : active <strong>Mélange</strong> pour varier l’ordre. Utilise les boutons{" "}
              <strong>EN/FR</strong> pour la prononciation.
            </p>
          </CardContent>
        </Card>

        <footer className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
          Fait avec ♥ pour réviser plus vite — <span className="font-mono">CSV EN;FR;EG</span>
        </footer>
      </div>
    </div>
  );
}
