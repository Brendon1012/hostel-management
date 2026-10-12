import { useEffect, useState } from 'react'
import { Download, Printer, Users, BedDouble, CalendarCheck, WalletCards, MessageSquareWarning, ContactRound } from 'lucide-react'
import api, { getErrorMessage } from '../api.js'
import { downloadCsv } from './ResourcePage.jsx'

const reports = [
  { key: 'students', title: 'Resident directory', description: 'Resident profiles, contacts, and room assignments.', icon: Users, columns: [['studentId', 'Student ID'], ['name', 'Name'], ['email', 'Email'], ['phone', 'Phone'], ['department', 'Department'], ['roomNumber', 'Room']] },
  { key: 'rooms', title: 'Room occupancy', description: 'Capacity, availability, and current room assignments.', icon: BedDouble, columns: [['roomNumber', 'Room'], ['type', 'Type'], ['capacity', 'Capacity'], ['occupiedBeds', 'Occupied'], ['status', 'Status']] },
  { key: 'fees', title: 'Fee collection', description: 'Billed amounts, receipts, and outstanding balances.', icon: WalletCards, columns: [['studentName', 'Resident'], ['month', 'Month'], ['amount', 'Billed ₹'], ['paidAmount', 'Paid ₹'], ['balance', 'Balance ₹'], ['status', 'Status']] },
  { key: 'attendance', title: 'Attendance register', description: 'Daily resident attendance records and status.', icon: CalendarCheck, columns: [['studentName', 'Resident'], ['date', 'Date'], ['status', 'Status']] },
  { key: 'complaints', title: 'Complaints tracker', description: 'Service requests and their current resolution status.', icon: MessageSquareWarning, columns: [['subject', 'Subject'], ['studentName', 'Resident'], ['category', 'Category'], ['priority', 'Priority'], ['status', 'Status']] },
  { key: 'visitors', title: 'Visitor register', description: 'Visitor history and check-in / check-out details.', icon: ContactRound, columns: [['visitorName', 'Visitor'], ['studentName', 'Resident'], ['purpose', 'Purpose'], ['checkIn', 'Check-in'], ['checkOut', 'Check-out']] },
]

export default function ReportsPage() {
  const [counts, setCounts] = useState({})
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    Promise.all(reports.map(async report => {
      const { data } = await api.get(`/${report.key}`)
      return [report.key, data.items || []]
    })).then(results => { if (active) setCounts(Object.fromEntries(results)) }).catch(e => { if (active) setError(getErrorMessage(e)) })
    return () => { active = false }
  }, [])
  return <div className="resource-page"><div className="page-heading"><div><span className="eyebrow"><span className="eyebrow-line" />INSIGHTS & EXPORTS</span><h1>Reports</h1><p>Useful records, ready when you are.</p></div><button className="button button-soft" onClick={() => window.print()}><Printer size={16} /> Print overview</button></div>{error && <div className="inline-error" role="alert">{error}</div>}<div className="reports-grid">{reports.map(({ key, title, description, icon: Icon, columns }) => { const rows = counts[key] || []; return <article className="report-card panel" key={key}><div className="report-icon"><Icon size={19} /></div><span className="report-count">{rows.length} records</span><h2>{title}</h2><p>{description}</p><div className="report-card-footer"><span>LIVE JMR DATA</span><button disabled={!Object.hasOwn(counts, key)} onClick={() => downloadCsv(`jmr-${key}-report.csv`, rows, columns)}><Download size={15} /> Export CSV</button></div></article> })}</div></div>
}
