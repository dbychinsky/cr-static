import type { TradeRecord } from './App'

const STORAGE_KEY = 'trade_records'

/** Сохранение всех записей в localStorage */
export function saveRecords(records: TradeRecord[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
    } catch (e) {
        console.error('Ошибка при сохранении данных:', e)
    }
}

/** Загрузка записей из localStorage */
export function loadRecords(): TradeRecord[] {
    try {
        const data = localStorage.getItem(STORAGE_KEY)
        return data ? JSON.parse(data) : []
    } catch (e) {
        console.error('Ошибка при загрузке данных:', e)
        return []
    }
}
