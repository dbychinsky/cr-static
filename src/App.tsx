import React, { useEffect, useState } from 'react'
import './App.css'
import { saveRecords, loadRecords } from './Service'

export interface TradeRecord {
    date: string
    broker: string
    profit: number
    loss: number
    difference: number
}

interface MonthlySummary {
    month: string
    broker: string
    profit: number
    loss: number
    difference: number
}

const App: React.FC = () => {
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [broker, setBroker] = useState<string>('Брокер 1')
    const [isProfit, setIsProfit] = useState<boolean>(true)
    const [amount, setAmount] = useState<string>('')
    const [records, setRecords] = useState<TradeRecord[]>([])

    // === Загрузка из localStorage ===
    useEffect(() => {
        const saved = loadRecords()
        if (saved.length) setRecords(saved)
    }, [])

    // === Сохранение при изменении ===
    useEffect(() => {
        saveRecords(records)
    }, [records])

    const handleAdd = () => {
        const num = parseFloat(amount.replace(',', '.'))
        if (isNaN(num)) return alert('Введите число')

        const record: TradeRecord = {
            date,
            broker,
            profit: isProfit ? num : 0,
            loss: !isProfit ? num : 0,
            difference: isProfit ? num : -num,
        }

        setRecords(prev => [...prev, record])
        setAmount('')
    }

    // === 📤 Экспорт данных в файл ===
    const handleExport = () => {
        const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `trade_records_${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    // === 📥 Импорт данных из файла ===
    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = event => {
            try {
                const data = JSON.parse(event.target?.result as string)
                if (!Array.isArray(data)) throw new Error('Неверный формат')
                setRecords(data)
                alert('✅ Данные успешно импортированы!')
            } catch (err) {
                alert('Ошибка при чтении файла')
            }
        }
        reader.readAsText(file)
        e.target.value = '' // очищаем input
    }

    // === Формат даты ===
    const formatDate = (isoDate: string): string => {
        const [year, month, day] = isoDate.split('-')
        return `${day}.${month}.${year}`
    }

    // === Подсчёт итогов ===
    const totalProfit = records.reduce((s, r) => s + r.profit, 0)
    const totalLoss = records.reduce((s, r) => s + r.loss, 0)
    const totalDiff = totalProfit - totalLoss

    // === Группировка по месяцам ===
    const monthlySummary: MonthlySummary[] = []
    const grouped: Record<string, MonthlySummary> = {}

    for (const r of records) {
        const [year, month] = r.date.split('-')
        const key = `${year}-${month}_${r.broker}`
        if (!grouped[key]) {
            grouped[key] = {
                month: `${year}-${month}`,
                broker: r.broker,
                profit: 0,
                loss: 0,
                difference: 0,
            }
        }
        grouped[key].profit += r.profit
        grouped[key].loss += r.loss
        grouped[key].difference += r.difference
    }

    for (const key in grouped) monthlySummary.push(grouped[key])
    monthlySummary.sort((a, b) => a.month.localeCompare(b.month))

    return (
        <div style={{ padding: '2rem', maxWidth: 1000, margin: '0 auto' }}>
            <h1>Учёт прибыли и убытков</h1>

            {/* --- Кнопки импорта/экспорта --- */}
            <div style={{ marginBottom: '1rem' }}>
                <button onClick={handleExport}>📤 Экспорт данных</button>
                <label style={{ marginLeft: '1rem', cursor: 'pointer' }}>
                    📥 Импорт данных
                    <input type="file" accept="application/json" onChange={handleImport} style={{ display: 'none' }} />
                </label>
            </div>

            {/* --- Форма --- */}
            <div style={{ display: 'grid', gap: '1rem', marginBottom: '1rem' }}>
                <label>
                    Дата: <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </label>

                <label>
                    Брокер:{' '}
                    <select value={broker} onChange={e => setBroker(e.target.value)}>
                        <option>Брокер 1</option>
                        <option>Брокер 2</option>
                        <option>Брокер 3</option>
                    </select>
                </label>

                <label>
                    <input type="checkbox" checked={isProfit} onChange={() => setIsProfit(p => !p)} /> Прибыль
                </label>

                <label>
                    Сумма:{' '}
                    <input
                        type="text"
                        placeholder="Напр. 123,45"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                    />
                </label>

                <button onClick={handleAdd}>Добавить</button>
            </div>

            {/* --- Основная таблица --- */}
            {records.length === 0 ? (
                <p>Нет данных</p>
            ) : (
                <>
                    <h2>Все записи</h2>
                    <table border={1} cellPadding={6} style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', marginBottom: '2rem' }}>
                        <thead>
                        <tr>
                            <th>Дата</th>
                            <th>Брокер</th>
                            <th>Прибыль</th>
                            <th>Убыток</th>
                            <th>Разница</th>
                        </tr>
                        </thead>
                        <tbody>
                        {records.map((r, i) => (
                            <tr key={i}>
                                <td>{formatDate(r.date)}</td>
                                <td>{r.broker}</td>
                                <td style={{ color: 'green' }}>{r.profit || '-'}</td>
                                <td style={{ color: 'red' }}>{r.loss || '-'}</td>
                                <td>{r.difference}</td>
                            </tr>
                        ))}
                        </tbody>
                        <tfoot>
                        <tr style={{ fontWeight: 'bold' }}>
                            <td colSpan={2}>Итого:</td>
                            <td style={{ color: 'green' }}>{totalProfit.toFixed(2)}</td>
                            <td style={{ color: 'red' }}>{totalLoss.toFixed(2)}</td>
                            <td>{totalDiff.toFixed(2)}</td>
                        </tr>
                        </tfoot>
                    </table>

                    {/* --- Сводка по месяцам --- */}
                    <h2>Сводка по месяцам и брокерам</h2>
                    <table border={1} cellPadding={6} style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                        <thead>
                        <tr>
                            <th>Месяц</th>
                            <th>Брокер</th>
                            <th>Прибыль</th>
                            <th>Убыток</th>
                            <th>Разница</th>
                        </tr>
                        </thead>
                        <tbody>
                        {monthlySummary.map((m, i) => (
                            <tr key={i}>
                                <td>{m.month.split('-').reverse().join('.')}</td>
                                <td>{m.broker}</td>
                                <td style={{ color: 'green' }}>{m.profit.toFixed(2)}</td>
                                <td style={{ color: 'red' }}>{m.loss.toFixed(2)}</td>
                                <td>{m.difference.toFixed(2)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </>
            )}
        </div>
    )
}

export default App
