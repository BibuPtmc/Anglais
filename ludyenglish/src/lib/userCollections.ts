import {
  collection,
  doc,
  getDocs,
  getDoc,
  serverTimestamp,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Vocab } from "@/App";

export interface UserFolder {
  id: string;
  name: string;
}

export interface UserCsvMeta {
  id: string;
  name: string;
  rowCount: number;
}

export async function listFolders(userId: string): Promise<UserFolder[]> {
  const colRef = collection(db, "users", userId, "folders");
  const snap = await getDocs(colRef);
  return snap.docs.map((d) => ({ id: d.id, name: (d.data().name as string) || d.id }));
}

export async function createFolder(userId: string, name: string): Promise<UserFolder> {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "folder";
  const ref = doc(collection(db, "users", userId, "folders"));
  await setDoc(ref, {
    name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id, name };
}

export async function listCsvs(userId: string, folderId: string): Promise<UserCsvMeta[]> {
  const colRef = collection(db, "users", userId, "folders", folderId, "csvs");
  const snap = await getDocs(colRef);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: (data.name as string) || d.id,
      rowCount: (data.rowCount as number) || 0,
    };
  });
}

export async function saveCsv(
  userId: string,
  folderId: string,
  name: string,
  rows: Vocab[]
): Promise<void> {
  const colRef = collection(db, "users", userId, "folders", folderId, "csvs");
  const ref = doc(colRef);
  await setDoc(ref, {
    name,
    rowCount: rows.length,
    data: rows,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
}

export async function getCsv(userId: string, folderId: string, csvId: string): Promise<Vocab[]> {
  const ref = doc(db, "users", userId, "folders", folderId, "csvs", csvId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return [];
  const data = snap.data();
  return (data.data as Vocab[]) || [];
}

export async function deleteCsv(userId: string, folderId: string, csvId: string): Promise<void> {
  const ref = doc(db, "users", userId, "folders", folderId, "csvs", csvId);
  await deleteDoc(ref);
}

export async function deleteFolder(userId: string, folderId: string): Promise<void> {
  // Supprime d'abord tous les CSV du dossier, puis le dossier lui-même
  const csvCol = collection(db, "users", userId, "folders", folderId, "csvs");
  const csvSnap = await getDocs(csvCol);
  const deletions: Promise<void>[] = [];
  for (const d of csvSnap.docs) {
    deletions.push(deleteDoc(d.ref));
  }
  await Promise.all(deletions);
  const folderRef = doc(db, "users", userId, "folders", folderId);
  await deleteDoc(folderRef);
}
