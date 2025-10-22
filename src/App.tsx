import React, { useEffect, useState } from 'react'
import {
    Container,
    Typography,
    TextField,
    Button,
    Select,
    MenuItem,
    Checkbox,
    FormControlLabel,
    InputLabel,
    FormControl,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TableFooter,
    Paper,
    Stack,
    Tabs,
    Tab,
    Box,
} from '@mui/material'
import { Delete, Upload, Download, CalendarToday } from '@mui/icons-material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { ru } from 'date-fns/locale'
import { saveRecords, loadRecords, addRecord } from './Service'
import './dateStyles.css'
import './App.css'
import { styled } from '@mui/material/styles'

export interface TradeRecord {
    id?: number
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

const WhiteCalendarIcon = styled(CalendarToday)({
    color: 'white',
})

const whiteTextField = {
    '& .MuiInputBase-root': { color: 'white' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#ccc' },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#fff' },
    '& .MuiSvgIcon-root': { color: 'white' },
    '& label': { color: '#ccc' },
}

const App: React.FC = () => {
    const getCurrentMonth = () => {
        const d = new Date()
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }

    const [date, setDate] = useState<Date | null>(new Date())
    const [broker, setBroker] = useState('Insider trade')
    const [isProfit, setIsProfit] = useState(true)
    const [amount, setAmount] = useState('')
    const [records, setRecords] = useState<TradeRecord[]>([])
    const [selectedMonth, setSelectedMonth] = useState<Date | null>(new Date())
    const [tab, setTab] = useState(0)


    const formatDate = (iso: string) => {
        if (!iso) return ''
        const d = new Date(iso)
        if (isNaN(d.getTime())) return iso
        return d.toLocaleDateString('ru-RU')
    }

    useEffect(() => {
        ;(async () => {
            const saved = await loadRecords()
            setRecords(saved)
        })()
    }, [])

    const handleAdd = async () => {
        if (!date) return alert('Выберите дату')
        const num = parseFloat(amount.replace(',', '.'))
        if (isNaN(num)) return alert('Введите число')

        const iso = date.toISOString().split('T')[0]
        const record: TradeRecord = {
            date: iso,
            broker,
            profit: isProfit ? num : 0,
            loss: !isProfit ? num : 0,
            difference: isProfit ? num : -num,
        }

        const updated = [...records, record]
        setRecords(updated)
        await addRecord(record)
        setAmount('')
    }

    const handleDelete = async (index: number) => {
        const newRecords = records.filter((_, i) => i !== index)
        setRecords(newRecords)
        await saveRecords(newRecords)
    }

    const handleExport = () => {
        const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `trade_records_${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = async event => {
            try {
                const data = JSON.parse(event.target?.result as string)
                if (!Array.isArray(data)) throw new Error('Неверный формат')
                await saveRecords(data)
                setRecords(data)
                alert('✅ Данные импортированы')
            } catch {
                alert('Ошибка при чтении файла')
            }
        }
        reader.readAsText(file)
        e.target.value = ''
    }

    const currentMonth = getCurrentMonth()
    const currentMonthRecords = records.filter(r => r.date.startsWith(currentMonth))
    const totalProfit = currentMonthRecords.reduce((s, r) => s + r.profit, 0)
    const totalLoss = currentMonthRecords.reduce((s, r) => s + r.loss, 0)
    const totalDiff = totalProfit - totalLoss

    const grouped: Record<string, MonthlySummary> = {}
    for (const r of records) {
        const [year, month] = r.date.split('-')
        const key = `${year}-${month}_${r.broker}`
        if (!grouped[key]) {
            grouped[key] = { month: `${year}-${month}`, broker: r.broker, profit: 0, loss: 0, difference: 0 }
        }
        grouped[key].profit += r.profit
        grouped[key].loss += r.loss
        grouped[key].difference += r.difference
    }

    const monthlySummary = Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month))
    const filteredSummary = selectedMonth
        ? monthlySummary.filter(
            s =>
                s.month ===
                `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`,
        )
        : monthlySummary

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
            <Container maxWidth="md" sx={{ py: 4 }} className={"main-wrapper"}>
                <Typography variant="h4" gutterBottom className="logo">
                    Signal Metrics
                </Typography>

                {/* === Форма === */}
                <Paper sx={{ p: 2, mb: 3 }} className="form">
                    <Stack spacing={2} direction="row" flexWrap="wrap" className="form-inner">
                        <DatePicker
                            label="Date"
                            value={date}
                            onChange={newDate => setDate(newDate)}
                            format="dd.MM.yyyy"
                            slots={{ openPickerIcon: WhiteCalendarIcon }}
                            slotProps={{
                                textField: { variant: 'outlined', sx: whiteTextField },
                            }}
                        />

                        <FormControl sx={{ minWidth: 120 }}>
                            <InputLabel>Signal</InputLabel>
                            <Select value={broker} label="Signal" onChange={e => setBroker(e.target.value)}>
                                <MenuItem value="Insider trade">Insider trade</MenuItem>
                                <MenuItem value="CB Mark">CB Mark</MenuItem>
                                <MenuItem value="CB Daniil N">CB Daniil N</MenuItem>
                                <MenuItem value="CB Daniil E">CB Daniil E</MenuItem>
                                <MenuItem value="Tuzemoon">Tuzemoon</MenuItem>
                                <MenuItem value="Rocket vallet">Rocket vallet</MenuItem>
                            </Select>
                        </FormControl>

                        <div className="summa">
                            <FormControlLabel
                                control={<Checkbox checked={isProfit} onChange={() => setIsProfit(p => !p)}/>}
                                label="Profit"
                            />

                            <TextField
                                label="Sum"
                                placeholder="Example. 123,45"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                sx={whiteTextField}
                            />
                        </div>

                        <Button variant="contained" onClick={handleAdd}>
                            ADD
                        </Button>
                    </Stack>
                </Paper>

                {/* === Tabs === */}
                <Paper sx={{ mb: 4 }}>
                    <Tabs
                        value={tab}
                        onChange={(_, newValue) => setTab(newValue)}
                        textColor="primary"
                        indicatorColor="primary"
                        centered
                        className={"tabs-head"}
                    >
                        <Tab label="Current month"/>
                        <Tab label="Monthly summary"/>
                    </Tabs>

                    <Box sx={{ p: 2 }}>
                        {tab === 0 && (
                            <>
                                <Table className={"table"}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Date</TableCell>
                                            <TableCell>Signal</TableCell>
                                            <TableCell>Profit</TableCell>
                                            <TableCell>Loss</TableCell>
                                            <TableCell>Diff</TableCell>
                                            <TableCell/>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {currentMonthRecords.map((r, i) => (
                                            <TableRow key={i}>
                                                <TableCell>{formatDate(r.date).slice(0, -5)}</TableCell>
                                                <TableCell>{r.broker}</TableCell>
                                                <TableCell sx={{ color: 'green' }}>{r.profit || '-'}</TableCell>
                                                <TableCell sx={{ color: 'red' }}>{r.loss || '-'}</TableCell>
                                                <TableCell>{r.difference}</TableCell>
                                                <TableCell>
                                                    <Button
                                                        className={'delete'}
                                                        variant="outlined"
                                                        color="error"
                                                        size="small"
                                                        onClick={() => handleDelete(i)}
                                                        startIcon={<Delete/>}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow>
                                            <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>
                                                Total:
                                            </TableCell>
                                            <TableCell sx={{ color: 'green' }}>{totalProfit.toFixed(2)}</TableCell>
                                            <TableCell sx={{ color: 'red' }}>{totalLoss.toFixed(2)}</TableCell>
                                            <TableCell>{totalDiff.toFixed(2)}</TableCell>
                                            <TableCell/>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </>
                        )}

                        {tab === 1 && (
                            <>
                                <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                                    <DatePicker
                                        label="Filter"
                                        views={['year', 'month']}
                                        value={selectedMonth}
                                        onChange={newDate => setSelectedMonth(newDate)}
                                        format="MM.yyyy"
                                        slots={{ openPickerIcon: WhiteCalendarIcon }}
                                        slotProps={{
                                            textField: { variant: 'outlined', sx: whiteTextField },
                                        }}
                                    />
                                    {selectedMonth && (
                                        <Button onClick={() => setSelectedMonth(null)} color="secondary">
                                            Clear
                                        </Button>
                                    )}
                                </Stack>

                                <Table className={"table"}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Date</TableCell>
                                            <TableCell>Signal</TableCell>
                                            <TableCell>Profit</TableCell>
                                            <TableCell>Loss</TableCell>
                                            <TableCell>Diff</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredSummary.map((m, i) => (
                                            <TableRow key={i}>
                                                <TableCell>{formatDate(`${m.month}-01`).slice(3)}</TableCell>
                                                <TableCell>{m.broker}</TableCell>
                                                <TableCell sx={{ color: 'green' }}>{m.profit.toFixed(2)}</TableCell>
                                                <TableCell sx={{ color: 'red' }}>{m.loss.toFixed(2)}</TableCell>
                                                <TableCell>{m.difference.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </>
                        )}
                    </Box>
                </Paper>

                {/* === Импорт/экспорт === */}
                <Stack direction="row" spacing={2} mb={2} className={"actionBar"}>
                    <Button variant="contained" startIcon={<Download/>} onClick={handleExport}>
                        Export Data
                    </Button>
                    <Button variant="contained" component="label" startIcon={<Upload/>}>
                        Import Data
                        <input type="file" accept="application/json" hidden onChange={handleImport}/>
                    </Button>
                </Stack>
            </Container>
        </LocalizationProvider>
    )
}

export default App
