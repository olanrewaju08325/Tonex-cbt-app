import { supabase } from "./supabase";

const DB_NAME = "tonex_offline_db";
const DB_VERSION = 1;

export function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("questions")) {
        db.createObjectStore("questions", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("subjects")) {
        db.createObjectStore("subjects", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("universities")) {
        db.createObjectStore("universities", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("pending_sessions")) {
        db.createObjectStore("pending_sessions", { keyPath: "local_id", autoIncrement: true });
      }
    };
  });
}

export async function cacheQuestions(questions: any[]) {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction("questions", "readwrite");
    const store = tx.objectStore("questions");
    questions.forEach((q) => {
      // Stripping subjects object mapping so it matches simple schema locally
      const { subjects, universities, ...qData } = q;
      store.put(qData);
    });
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("IndexedDB cache questions error:", err);
  }
}

export async function cacheSubjects(subjects: any[]) {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction("subjects", "readwrite");
    const store = tx.objectStore("subjects");
    subjects.forEach((s) => store.put(s));
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("IndexedDB cache subjects error:", err);
  }
}

export async function getOfflineSubjects(): Promise<any[]> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction("subjects", "readonly");
    const store = tx.objectStore("subjects");
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  } catch (err) {
    console.error("IndexedDB get subjects error:", err);
    return [];
  }
}

export async function cacheUniversities(universities: any[]) {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction("universities", "readwrite");
    const store = tx.objectStore("universities");
    universities.forEach((u) => store.put(u));
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("IndexedDB cache universities error:", err);
  }
}

export async function getOfflineUniversities(): Promise<any[]> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction("universities", "readonly");
    const store = tx.objectStore("universities");
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  } catch (err) {
    console.error("IndexedDB get universities error:", err);
    return [];
  }
}

export async function getOfflineQuestions(params: {
  subjectId?: string;
  subjectIds?: string[];
  universityId: string | null;
  limit?: number;
}): Promise<any[]> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction("questions", "readonly");
    const store = tx.objectStore("questions");
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        let all = request.result || [];
        
        // Filter by subject
        if (params.subjectId) {
          all = all.filter((q) => q.subject_id === params.subjectId);
        } else if (params.subjectIds && params.subjectIds.length > 0) {
          all = all.filter((q) => params.subjectIds!.includes(q.subject_id));
        }
        
        // Filter by university
        if (params.universityId) {
          all = all.filter((q) => q.university_id === params.universityId);
        }
        
        // Shuffling and limiting
        if (params.subjectIds && params.subjectIds.length > 0 && params.limit) {
          let finalQs: any[] = [];
          for (const sId of params.subjectIds) {
            let qs = all.filter(q => q.subject_id === sId);
            qs = qs.sort(() => Math.random() - 0.5);
            finalQs = finalQs.concat(qs.slice(0, params.limit));
          }
          resolve(finalQs);
        } else {
          all = all.sort(() => Math.random() - 0.5);
          if (params.limit) {
            all = all.slice(0, params.limit);
          }
          resolve(all);
        }
      };
    });
  } catch (err) {
    console.error("IndexedDB get questions error:", err);
    return [];
  }
}

export async function queueOfflineSession(session: any) {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction("pending_sessions", "readwrite");
    const store = tx.objectStore("pending_sessions");
    store.add({ ...session, queued_at: new Date().toISOString() });
    
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("IndexedDB queue session error:", err);
  }
}

export async function getPendingSessions(): Promise<any[]> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction("pending_sessions", "readonly");
    const store = tx.objectStore("pending_sessions");
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  } catch (err) {
    console.error("IndexedDB get pending sessions error:", err);
    return [];
  }
}

export async function removePendingSession(localId: number) {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction("pending_sessions", "readwrite");
    const store = tx.objectStore("pending_sessions");
    store.delete(localId);
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("IndexedDB delete pending session error:", err);
  }
}

export async function syncOfflineSessions(userId: string): Promise<number> {
  const pending = await getPendingSessions();
  if (pending.length === 0) return 0;
  
  let syncedCount = 0;
  
  for (const session of pending) {
    try {
      const { answers, local_id, queued_at, ...sessionInfo } = session;
      
      // Submit session to Supabase
      const { data: serverSession, error: sessionError } = await supabase
        .from('exam_sessions')
        .insert({ ...sessionInfo, user_id: userId })
        .select()
        .single();
        
      if (sessionError) throw sessionError;
      
      // Submit answers
      const answersToInsert = answers.map((ans: any) => ({
        session_id: serverSession.id,
        question_id: ans.question_id,
        selected_answer: ans.selected_answer,
        is_correct: ans.is_correct,
      }));
      
      const { error: answersError } = await supabase
        .from('exam_answers')
        .insert(answersToInsert);
        
      if (answersError) throw answersError;
      
      // Increment daily usage
      if (sessionInfo.subject_id) {
        await supabase.rpc('increment_daily_usage', {
          p_user_id: userId,
          p_subject_id: sessionInfo.subject_id,
          p_count: sessionInfo.total_questions
        });
      }
      
      // Success: delete from offline queue
      await removePendingSession(local_id);
      syncedCount++;
    } catch (err) {
      console.error("Failed to sync offline session", session, err);
      // Stop syncing remaining sessions if connection is still broken
      break;
    }
  }
  
  return syncedCount;
}
