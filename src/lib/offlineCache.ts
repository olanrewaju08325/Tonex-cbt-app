import { supabase } from "./supabase";

const DB_NAME = "tonex_offline_db";
const DB_VERSION = 2;

export function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      let questionsStore;
      if (!db.objectStoreNames.contains("questions")) {
        questionsStore = db.createObjectStore("questions", { keyPath: "id" });
      } else {
        questionsStore = request.transaction!.objectStore("questions");
      }
      
      if (!questionsStore.indexNames.contains("subject_id")) {
        questionsStore.createIndex("subject_id", "subject_id", { unique: false });
      }
      if (!questionsStore.indexNames.contains("topic")) {
        questionsStore.createIndex("topic", "topic", { unique: false });
      }
      if (!questionsStore.indexNames.contains("university_id")) {
        questionsStore.createIndex("university_id", "university_id", { unique: false });
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
      if (!db.objectStoreNames.contains("cached_materials")) {
        db.createObjectStore("cached_materials", { keyPath: "id" });
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
  topic?: string;
}): Promise<any[]> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction("questions", "readonly");
    const store = tx.objectStore("questions");
    
    return new Promise((resolve, reject) => {
      let request;
      if (params.subjectId) {
        try {
          const index = store.index("subject_id");
          request = index.getAll(params.subjectId);
        } catch (e) {
          request = store.getAll();
        }
      } else {
        request = store.getAll();
      }

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        let all = request.result || [];
        
        // Filter by subjectIds if subjectId wasn't used
        if (!params.subjectId && params.subjectIds && params.subjectIds.length > 0) {
          all = all.filter((q) => params.subjectIds!.includes(q.subject_id));
        }

        // Filter by topic
        if (params.topic) {
          all = all.filter((q) => q.topic === params.topic);
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

export async function cacheMaterial(id: string, title: string, blob: Blob) {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction("cached_materials", "readwrite");
    const store = tx.objectStore("cached_materials");
    store.put({ id, title, blob, cached_at: new Date().toISOString() });
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("IndexedDB cache material error:", err);
  }
}

export async function getCachedMaterial(id: string): Promise<any> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction("cached_materials", "readonly");
    const store = tx.objectStore("cached_materials");
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  } catch (err) {
    console.error("IndexedDB get cached material error:", err);
    return null;
  }
}

export async function getCachedMaterialsList(): Promise<string[]> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction("cached_materials", "readonly");
    const store = tx.objectStore("cached_materials");
    return new Promise((resolve, reject) => {
      const request = store.getAllKeys();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve((request.result || []) as string[]);
    });
  } catch (err) {
    console.error("IndexedDB get cached materials keys error:", err);
    return [];
  }
}

export async function removeCachedMaterial(id: string) {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction("cached_materials", "readwrite");
    const store = tx.objectStore("cached_materials");
    store.delete(id);
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("IndexedDB delete cached material error:", err);
  }
}
