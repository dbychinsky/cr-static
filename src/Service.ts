import type { TradeRecord } from './App'

const DB_NAME = 'TradeDB'
const STORE_NAME = 'records'
const DB_VERSION = 1

/** 🔹 Открывает базу данных и создаёт хранилище при необходимости */
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)

        request.onupgradeneeded = () => {
            const db = request.result
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
            }
        }
    })
}

/** 🔹 Хелпер для ожидания завершения транзакции */
function waitForTransaction(tx: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
    })
}

/** 🔹 Сохраняет все записи (перезаписывает базу) */
export async function saveRecords(records: TradeRecord[]) {
    await clearRecords() // очищаем перед новой записью
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    for (const rec of records) {
        store.add(rec)
    }

    await waitForTransaction(tx)
}

/** 🔹 Загружает все записи из IndexedDB */
export async function loadRecords(): Promise<TradeRecord[]> {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
        const req = store.getAll()
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
    })
}

/** 🔹 Добавление одной записи (удобно при handleAdd) */
export async function addRecord(record: TradeRecord) {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.add(record)
    await waitForTransaction(tx)
}

/** 🔹 Очистка всех записей */
export async function clearRecords() {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.clear()
    await waitForTransaction(tx)
}

/** 🔹 Оценка объёма памяти (IndexedDB не даёт точных данных, возвращаем примерное) */
/** 🔹 Оценка объёма памяти (IndexedDB не даёт точных данных, возвращаем примерное) */
export async function estimateStorage(): Promise<string> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate()
        const quota = estimate.quota || 0
        const usage = estimate.usage || 0
        return `Использовано ${(usage / 1024 / 1024).toFixed(2)} МБ из ${(quota / 1024 / 1024).toFixed(2)} МБ`
    }
    return 'Информация о памяти недоступна'
}

