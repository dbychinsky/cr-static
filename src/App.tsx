import React, { useEffect, useState } from 'react';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
    Container,
    Typography,
    TextField,
    Button,
    Select,
    MenuItem,
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
    Radio,
    RadioGroup,
    Tooltip,
    IconButton, FormControlLabel,
} from '@mui/material';
import { Delete, Upload, Download, CalendarToday } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ru } from 'date-fns/locale';
import { saveRecords, loadRecords, addRecord } from './Service';
import './dateStyles.css';
import './App.css';
import { styled } from '@mui/material/styles';

export interface TradeRecord {
    id?: number;
    date: string;
    broker: string;
    profit: number;
    loss: number;
    difference: number;
    roi?: number;
}

interface MonthlySummary {
    month: string;
    broker: string;
    profit: number;
    loss: number;
    difference: number;
}

const WhiteCalendarIcon = styled(CalendarToday)({
    color: 'white',
});

const whiteTextField = {
    '& .MuiInputBase-root': { color: 'white' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#ccc' },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#fff' },
    '& .MuiSvgIcon-root': { color: 'white' },
    '& label': { color: '#ccc' },
};

const App: React.FC = () => {
    const getCurrentMonth = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    const [date, setDate] = useState<Date | null>(new Date());
    const [broker, setBroker] = useState('Insider trade');
    const [isProfit, setIsProfit] = useState(true);
    const [amount, setAmount] = useState('');
    const [roi, setRoi] = useState('');
    const [records, setRecords] = useState<TradeRecord[]>([]);
    const [selectedMonth, setSelectedMonth] = useState<Date | null>(new Date());
    const [tab, setTab] = useState(0);
    const [selectedBrokerFilter, setSelectedBrokerFilter] = useState('');

    const formatDate = (iso: string) => {
        if (!iso) return '';
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleDateString('ru-RU');
    };

    useEffect(() => {
        (async () => {
            const saved = await loadRecords();
            setRecords(saved);
        })();
    }, []);

    const handleAdd = async () => {
        if (!date) return alert('Выберите дату');
        const num = parseFloat(amount.replace(',', '.'));
        if (isNaN(num)) return alert('Введите сумму');
        const roiNum = parseFloat(roi.replace(',', '.'));
        if (isNaN(roiNum)) return alert('Введите ROI');

        const iso = date.toISOString().split('T')[0];
        const record: TradeRecord = {
            date: iso,
            broker,
            profit: isProfit ? num : 0,
            loss: !isProfit ? num : 0,
            difference: isProfit ? num : -num,
            roi: isProfit ? roiNum : -roiNum,
        };

        const updated = [...records, record];
        setRecords(updated);
        await addRecord(record);
        setAmount('');
        setRoi('');
    };

    const handleDelete = async (index: number) => {
        const newRecords = records.filter((_, i) => i !== index);
        setRecords(newRecords);
        await saveRecords(newRecords);
    };

    const handleExport = () => {
        const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trade_records_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (!Array.isArray(data)) throw new Error('Неверный формат');
                await saveRecords(data);
                setRecords(data);
                alert('✅ Данные импортированы');
            } catch {
                alert('Ошибка при чтении файла');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // фильтр по выбранному месяцу (если не выбран – текущий)
    const targetMonth = selectedMonth
        ? `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`
        : getCurrentMonth();

    let visibleRecords = records.filter((r) => r.date.startsWith(targetMonth));
    if (selectedBrokerFilter) {
        visibleRecords = visibleRecords.filter((r) => r.broker === selectedBrokerFilter);
    }

    const totalProfit = visibleRecords.reduce((s, r) => s + r.profit, 0);
    const totalLoss = visibleRecords.reduce((s, r) => s + r.loss, 0);
    const totalDiff = totalProfit - totalLoss;
    const totalRoi =
        visibleRecords.length > 0
            ? visibleRecords.reduce((s, r) => s + (r.roi || 0), 0) / visibleRecords.length
            : 0;

    const grouped: Record<string, MonthlySummary> = {};
    for (const r of records) {
        const [year, month] = r.date.split('-');
        const key = `${year}-${month}_${r.broker}`;
        if (!grouped[key]) {
            grouped[key] = { month: `${year}-${month}`, broker: r.broker, profit: 0, loss: 0, difference: 0 };
        }
        grouped[key].profit += r.profit;
        grouped[key].loss += r.loss;
        grouped[key].difference += r.difference;
    }

    const monthlySummary = Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
    const filteredSummary = selectedMonth
        ? monthlySummary.filter(
            (s) => s.month === `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`
        )
        : monthlySummary;

    const uniqueBrokers = Array.from(new Set(records.map((r) => r.broker)));

    const renderDiff = (value: number) => {
        if (value > 0) return <span style={{ color: '#04ad04' }}>+{value.toFixed(2)}</span>;
        if (value < 0) return <span style={{ color: 'red' }}>{value.toFixed(2)}</span>;
        return <span style={{ color: 'white' }}>{value.toFixed(2)}</span>;
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
            <Container maxWidth="md" sx={{ py: 4 }} className="main-wrapper">
                <Typography variant="h4" gutterBottom className="logo">
                    Signal Metrics
                </Typography>

                {/* === Форма === */}
                <Paper sx={{ p: 2, mb: 3 }} className="form">
                    <Stack spacing={2} direction="row" flexWrap="wrap" className="form-inner">
                        <DatePicker
                            label="Date"
                            value={date}
                            onChange={(newDate) => setDate(newDate)}
                            format="dd.MM.yyyy"
                            slots={{ openPickerIcon: WhiteCalendarIcon }}
                            slotProps={{
                                textField: { variant: 'outlined', sx: whiteTextField },
                            }}
                        />

                        <FormControl sx={{ minWidth: 120 }}>
                            <InputLabel>Signal</InputLabel>
                            <Select value={broker} label="Signal" onChange={(e) => setBroker(e.target.value)}>
                                <MenuItem value="Insider trade">Insider trade</MenuItem>
                                <MenuItem value="CB Mark">CB Mark</MenuItem>
                                <MenuItem value="CB Daniil N">CB Daniil N</MenuItem>
                                <MenuItem value="CB Daniil E">CB Daniil E</MenuItem>
                                <MenuItem value="Tuzemoon">Tuzemoon</MenuItem>
                                <MenuItem value="Rocket vallet">Rocket vallet</MenuItem>
                            </Select>
                        </FormControl>

                        <div className="summa">
                            <RadioGroup
                                row
                                value={isProfit ? 'profit' : 'loss'}
                                onChange={(e) => setIsProfit(e.target.value === 'profit')}
                                className="radio-group"
                            >
                                <FormControlLabel
                                    value="profit"
                                    control={<Radio sx={{ color: '#04ad04', '&.Mui-checked': { color: '#04ad04' } }} />}
                                    label={<span style={{ color: isProfit ? '#04ad04' : '#aaa' }}>Profit</span>}
                                />
                                <FormControlLabel
                                    value="loss"
                                    control={<Radio sx={{ color: '#ff3131', '&.Mui-checked': { color: '#ff3131' } }} />}
                                    label={<span style={{ color: !isProfit ? '#ff3131' : '#aaa' }}>Loss</span>}
                                />
                            </RadioGroup>

                            <TextField
                                label="Sum"
                                placeholder="Example. 123,45"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                sx={whiteTextField}
                                className="sum-input"
                            />

                            <TextField
                                label="ROI (%)"
                                placeholder="Example. 2.5"
                                value={roi}
                                onChange={(e) => setRoi(e.target.value)}
                                sx={whiteTextField}
                                className="roi-input"
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
                        className="tabs-head"
                    >
                        <Tab label="Current month" />
                        <Tab label="Monthly summary" />
                    </Tabs>

                    <Box sx={{ p: 2 }}>
                        {tab === 0 && (
                            <>
                                <Stack direction="row" spacing={2} alignItems="center" mb={2} className="filters-current-month">
                                    <FormControl sx={{ minWidth: 180 }} className="custom-select">
                                        <InputLabel>Signal</InputLabel>
                                        <Select
                                            value={selectedBrokerFilter}
                                            label="Signal"
                                            onChange={(e) => setSelectedBrokerFilter(e.target.value)}
                                            className="control"
                                        >
                                            <MenuItem value="">All</MenuItem>
                                            {uniqueBrokers.map((b) => (
                                                <MenuItem key={b} value={b}>
                                                    {b}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    {/* ✅ Month-picker вместо чекбокса «Today» */}
                                    <DatePicker
                                        label="Month"
                                        views={['year', 'month']}
                                        value={selectedMonth}
                                        onChange={(newDate) => setSelectedMonth(newDate)}
                                        format="MM.yyyy"
                                        slots={{ openPickerIcon: WhiteCalendarIcon }}
                                        slotProps={{
                                            textField: { variant: 'outlined', sx: whiteTextField },
                                        }}
                                        className='custom-picker'
                                    />
                                </Stack>

                                <Table className="table">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Date</TableCell>
                                            <TableCell>Signal</TableCell>
                                            <TableCell>Profit</TableCell>
                                            <TableCell>Loss</TableCell>
                                            <TableCell>Diff</TableCell>
                                            <TableCell>
                                                ROI (%)
                                                <Tooltip
                                                    title="ROI (Return on Investment) показывает процент доходности сделки относительно вложенных средств. Считается как прибыль или убыток, делённые на вложение, умноженные на 100."
                                                    arrow
                                                    placement="top"
                                                >
                                                    <IconButton size="small" sx={{ ml: 0.5, color: '#bbb' }}>
                                                        <InfoOutlinedIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>

                                            <TableCell />
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {visibleRecords.map((r, i) => (
                                            <TableRow key={i}>
                                                <TableCell>{formatDate(r.date).slice(0, -8)}</TableCell>
                                                <TableCell>{r.broker}</TableCell>
                                                <TableCell sx={{ color: '#bdd9bf' }}>{r.profit ? r.profit.toFixed(2) : '-'}</TableCell>
                                                <TableCell sx={{ color: '#dba3a3' }}>{r.loss ? `-${r.loss.toFixed(2)}` : '-'}</TableCell>
                                                <TableCell style={{ fontWeight: 'bold' }}>{renderDiff(r.difference)}</TableCell>
                                                <TableCell>{r.roi !== undefined ? `${r.roi > 0 ? '+' : ''}${r.roi.toFixed(2)}%` : '-'}</TableCell>
                                                <TableCell>
                                                    <Button
                                                        className="delete"
                                                        variant="outlined"
                                                        color="error"
                                                        size="small"
                                                        onClick={() => handleDelete(i)}
                                                        startIcon={<Delete />}
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
                                            <TableCell sx={{ color: '#bdd9bf' }}>{totalProfit.toFixed(2)}</TableCell>
                                            <TableCell sx={{ color: '#dba3a3' }}>-{totalLoss.toFixed(2)}</TableCell>
                                            <TableCell>{renderDiff(totalDiff)}</TableCell>
                                            <TableCell>{totalRoi ? `${totalRoi.toFixed(2)}%` : '-'}</TableCell>
                                            <TableCell />
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
                                        onChange={(newDate) => setSelectedMonth(newDate)}
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

                                <Table className="table">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Month</TableCell>
                                            <TableCell>Signal</TableCell>
                                            <TableCell>Profit</TableCell>
                                            <TableCell>Loss</TableCell>
                                            <TableCell>Diff</TableCell>
                                            <TableCell>ROI (%)</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredSummary.map((m, i) => (
                                            <TableRow key={i}>
                                                <TableCell>{formatDate(`${m.month}-01`).slice(3, 5)}</TableCell>
                                                <TableCell>{m.broker}</TableCell>
                                                <TableCell sx={{ color: '#bdd9bf' }}>{m.profit.toFixed(2)}</TableCell>
                                                <TableCell sx={{ color: '#dba3a3' }}>-{m.loss.toFixed(2)}</TableCell>
                                                <TableCell>{renderDiff(m.difference)}</TableCell>
                                                <TableCell>
                                                    {m.profit + m.loss !== 0
                                                        ? `${((m.difference / (m.profit + m.loss)) * 100).toFixed(2)}%`
                                                        : '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow>
                                            <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>
                                                Total:
                                            </TableCell>
                                            <TableCell sx={{ color: '#bdd9bf' }}>
                                                {filteredSummary.reduce((s, m) => s + m.profit, 0).toFixed(2)}
                                            </TableCell>
                                            <TableCell sx={{ color: '#dba3a3' }}>
                                                -{filteredSummary.reduce((s, m) => s + m.loss, 0).toFixed(2)}
                                            </TableCell>
                                            <TableCell>{renderDiff(filteredSummary.reduce((s, m) => s + m.difference, 0))}</TableCell>
                                            <TableCell>
                                                {filteredSummary.length
                                                    ? (
                                                    filteredSummary.reduce(
                                                        (s, m) =>
                                                            s + (m.profit + m.loss === 0 ? 0 : (m.difference / (m.profit + m.loss)) * 100),
                                                        0
                                                    ) / filteredSummary.length
                                                ).toFixed(2) + '%'
                                                    : '-'}
                                            </TableCell>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </>
                        )}
                    </Box>
                </Paper>

                {/* === Импорт/экспорт === */}
                <Stack direction="row" spacing={2} mb={2} className="actionBar">
                    <Button variant="contained" startIcon={<Download />} onClick={handleExport}>
                        Export Data
                    </Button>
                    <Button variant="contained" component="label" startIcon={<Upload />}>
                        Import Data
                        <input type="file" accept="application/json" hidden onChange={handleImport} />
                    </Button>
                </Stack>
            </Container>
        </LocalizationProvider>
    );
};

export default App;