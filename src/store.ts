export interface Note {
  id: string;
  text: string;
  created: number;
  updated: number;
}

export interface NoteStore {
  get(id: string): Promise<Note | undefined>;
  put(note: Note): Promise<void>;
  remove(id: string): Promise<void>;
  list(): Promise<Note[]>;
}

const STORE = "notes";

const settle = <T>(req: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const done = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

export async function openStore(
  factory: IDBFactory = indexedDB,
  name = "notes",
): Promise<NoteStore> {
  const req = factory.open(name, 1);
  req.onupgradeneeded = () => {
    req.result.createObjectStore(STORE, { keyPath: "id" });
  };
  const db = await settle(req);
  const tx = (mode: IDBTransactionMode) => db.transaction(STORE, mode).objectStore(STORE);
  return {
    get: (id) => settle(tx("readonly").get(id) as IDBRequest<Note | undefined>),
    async put(note) {
      const store = tx("readwrite");
      store.put(note);
      await done(store.transaction);
    },
    async remove(id) {
      const store = tx("readwrite");
      store.delete(id);
      await done(store.transaction);
    },
    async list() {
      const all = await settle(tx("readonly").getAll() as IDBRequest<Note[]>);
      return all.sort((a, b) => b.updated - a.updated);
    },
  };
}
