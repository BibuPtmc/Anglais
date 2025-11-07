import { useEffect, useState } from 'react';
import { type User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface UserData {
  bestStreak: number;
  totalScore: { good: number; total: number };
  currentStreak: number;
  wrongWordsCount: number;
  wrongWords: Array<{ EN: string; FR: string; EG?: string }>;  // Liste complète des erreurs
  lastUpdated: number;
}

export function useUserData(user: User | null) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);

  // Charger les données utilisateur depuis Firestore
  useEffect(() => {
    if (!user) {
      setUserData(null);
      return;
    }

    const loadUserData = async () => {
      setLoading(true);
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserData);
        } else {
          // Créer un nouveau document utilisateur
          const newUserData: UserData = {
            bestStreak: 0,
            totalScore: { good: 0, total: 0 },
            currentStreak: 0,
            wrongWordsCount: 0,
            wrongWords: [],
            lastUpdated: Date.now(),
          };
          await setDoc(userDocRef, newUserData);
          setUserData(newUserData);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données utilisateur:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  // Fonction pour sauvegarder les données utilisateur
  const saveUserData = async (data: Partial<UserData>) => {
    if (!user) return;

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        ...data,
        lastUpdated: Date.now(),
      });
      setUserData((prev) => (prev ? { ...prev, ...data } : null));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des données utilisateur:', error);
    }
  };

  return { userData, loading, saveUserData };
}
