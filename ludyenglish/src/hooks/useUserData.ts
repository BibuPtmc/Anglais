import { useEffect } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";

interface UserDoc {
  bestStreak?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export function useUserData(
  user: User | null,
  bestStreak: number,
  setBestStreak: (value: number) => void
) {
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const load = async () => {
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (cancelled) return;
        if (snap.exists()) {
          const data = snap.data() as UserDoc;
          if (typeof data.bestStreak === "number" && data.bestStreak > bestStreak) {
            setBestStreak(data.bestStreak);
          }
        } else {
          await setDoc(
            ref,
            {
              bestStreak,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }
      } catch (e) {
        console.warn("Failed to load user data", e);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const save = async () => {
      try {
        const ref = doc(db, "users", user.uid);
        await setDoc(
          ref,
          {
            bestStreak,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (e) {
        console.warn("Failed to save user data", e);
      }
    };

    save();
  }, [user, bestStreak]);
}
