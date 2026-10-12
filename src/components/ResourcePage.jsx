import { useCallback, useEffect, useMemo, useState } from 'react'
import { CircleDollarSign, Download, FilePlus2, Pencil, Printer, Search, Trash2, X } from 'lucide-react'
import api, { getErrorMessage } from '../api.js'
import { modules, options } from '../data/modules.js'

function displayValue(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return value.name || value.roomNumber || value.studentId || '—'
  return value
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function downloadCsv(filename, rows, columns) {
  const escape = (value) => {
    const safeValue = String(value ?? '').replace(/^[=+\-@\t\r]/, character => `'${character}`)
    return `"${safeValue.replaceAll('"', '""')}"`
  }
  const content = [columns.map(([, label]) => escape(label)).join(','), ...rows.map(row => columns.map(([key]) => escape(typeof row[key] === 'object' ? displayValue(row[key]) : row[key])).join(','))].join('\r\n')
  const blob = new Blob(['\ufeff', content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function FormField({ field, value, onChange, related }) {
  const [name, label, type, required] = field
  const selectKey = type.startsWith('select:') ? type.slice(7) : null
  const selectItems = selectKey === 'rooms' ? related.rooms : selectKey === 'students' ? related.students : null
  const choices = selectItems
    ? selectItems.map(item => ({ value: item._id, label: selectKey === 'rooms' ? `${item.roomNumber}${item.status === 'Full' ? ' · Full' : item.status === 'Maintenance' ? ' · Maintenance' : ''}` : `${item.name} · ${item.studentId}`, disabled: selectKey === 'rooms' && ['Full', 'Maintenance'].includes(item.status) }))
    : (options[selectKey] || []).map(option => ({ value: option, label: option }))
  const currentValue = value && typeof value === 'object' ? value._id : value || ''
  return <label className={`field-group ${type === 'textarea' ? 'field-wide' : ''}`} htmlFor={`field-${name}`}><span>{label}{required && <i> *</i>}</span>
    {type === 'textarea' ? <textarea id={`field-${name}`} name={name} value={currentValue} onChange={e => onChange(name, e.target.value)} required={required} rows={4} placeholder={`Enter ${label.toLowerCase()}`} />
      : selectKey ? <select id={`field-${name}`} name={name} value={currentValue} onChange={e => onChange(name, e.target.value)} required={required}><option value="">Select {label.toLowerCase()}</option>{choices.map(choice => <option key={choice.value} value={choice.value} disabled={choice.disabled}>{choice.label}</option>)}</select>
        : <input id={`field-${name}`} name={name} type={type} min={type === 'number' ? '0' : undefined} step={type === 'number' ? '0.01' : undefined} value={currentValue} onChange={e => onChange(name, e.target.value)} required={required} placeholder={type === 'month' ? 'YYYY-MM' : `Enter ${label.toLowerCase()}`} />}
  </label>
}

export default function ResourcePage({ resource, user }) {
  const config = modules[resource]
  const isStudent = user?.role === 'student'
  const [items, setItems] = useState([])
  const [related, setRelated] = useState({ rooms: [], students: [] })
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All records')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const canCreate = !isStudent || resource === 'complaints'
  const canEdit = !isStudent && !['fees', 'attendance'].includes(resource)
  const endpoint = `/` + resource

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get(endpoint)
      setItems(data.items || [])
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const fields = config.fields.map(field => field[2]).join(',')
    const needsRooms = fields.includes('select:rooms')
    const needsStudents = fields.includes('select:students') || resource === 'complaints'
    Promise.all([
      needsRooms ? api.get('/rooms').then(r => r.data.items || []) : [],
      needsStudents ? api.get('/students').then(r => r.data.items || []) : [],
    ]).then(([rooms, students]) => setRelated({ rooms, students })).catch(e => setError(getErrorMessage(e)))
  }, [config.fields])

  const filtered = useMemo(() => items.filter(item => {
    const text = query.trim().toLowerCase()
    const matchesSearch = !text || config.searchable.some(key => String(item[key] ?? '').toLowerCase().includes(text))
    const status = item.status || 'Active'
    return matchesSearch && (filter === 'All records' || status === filter)
  }), [items, query, filter, config.searchable])

  function openCreate() {
    setForm(resource === 'complaints' ? { status: 'Open', priority: 'Normal' } : {})
    setModal({ mode: 'create' })
  }
  function openEdit(item) {
    setForm(Object.fromEntries(config.fields.filter(([key]) => !(resource === 'complaints' && key === 'room')).map(([key, , type]) => {
      let value = item[key] && typeof item[key] === 'object' ? item[key]._id : item[key] ?? ''
      if (value && ['date', 'month', 'datetime-local'].includes(type)) {
        const iso = new Date(value).toISOString()
        value = type === 'month' ? iso.slice(0, 7) : type === 'date' ? iso.slice(0, 10) : iso.slice(0, 16)
      }
      return [key, value]
    })))
    setModal({ mode: 'edit', item })
  }
  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (modal.mode === 'payment') await api.post(`${endpoint}/${modal.item._id}/payments`, form)
      else if (modal.mode === 'create') await api.post(endpoint, form)
      else await api.put(`${endpoint}/${modal.item._id}`, form)
      setModal(null)
      await load()
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
    function openPayment(item) {
      setForm({ amount: '', method: '' })
      setModal({ mode: 'payment', item })
    }
  }
  async function remove(item) {
    const name = item.name || item.roomNumber || item.title || item.subject || config.singular
    if (!window.confirm(`Are you sure you want to ${resource === 'students' ? 'deactivate' : 'delete'} ${name}? This action cannot be undone.`)) return
    try {
      await api.delete(`${endpoint}/${item._id}`)
      await load()
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }
  function printReceipt(item) {
    const receipt = window.open('', '_blank', 'width=760,height=720')
    if (!receipt) {
      setError('Please allow pop-ups to print a fee receipt.')
      return
    }
    const safe = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
    receipt.document.write(`<html><head><title>JMR fee receipt</title><style>body{font:15px Arial,sans-serif;color:#182746;padding:44px}.top{border-bottom:2px solid #d4af37;padding-bottom:22px}h1{margin:0;font-size:22px}small{letter-spacing:2px;color:#99792c}.box{margin-top:36px;padding:24px;border:1px solid #e1e5ec;border-radius:12px}p{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #eee}.total{font-size:23px;font-weight:bold;color:#99792c}@media print{button{display:none}}</style></head><body><div class="top"><small>JERRY MANUEL RESIDENCE</small><h1>Hostel fee receipt</h1></div><div class="box"><p><span>Resident</span><strong>${safe(displayValue(item.studentName || item.student))}</strong></p><p><span>Billing month</span><strong>${safe(item.month || '')}</strong></p><p><span>Payment method</span><strong>${safe(item.paymentMethod || 'Recorded payment')}</strong></p><p><span>Date</span><strong>${safe(formatDate(item.updatedAt))}</strong></p><p class="total"><span>Amount received</span><strong>₹${Number(item.paidAmount || 0).toLocaleString('en-IN')}</strong></p></div><p>Thank you. Keep this receipt for your records.</p><button onclick="window.print()">Print receipt</button></body></html>`)
    receipt.document.close()
    receipt.focus()
    setTimeout(() => receipt.print(), 300)
  }

  const filters = resource === 'students' ? ['All records', 'Active', 'Inactive'] : resource === 'rooms' ? ['All records', 'Available', 'Full', 'Maintenance'] : resource === 'complaints' ? ['All records', 'Open', 'In progress', 'Resolved'] : resource === 'fees' ? ['All records', 'Paid', 'Partially paid', 'Pending', 'Overdue'] : []
  return <div className="resource-page"><div className="page-heading resource-heading"><div><span className="eyebrow"><span className="eyebrow-line" />JMR MANAGEMENT</span><h1>{config.title}</h1><p>{config.description}</p></div><div className="heading-actions"><button className="button button-soft" onClick={() => downloadCsv(`${resource}-jmr.csv`, filtered, config.columns)}><Download size={16} /> Export CSV</button>{canCreate && <button className="button button-navy" onClick={openCreate}><FilePlus2 size={16} /> {resource === 'complaints' && isStudent ? 'New request' : `Add ${config.singular}`}</button>}</div></div>
    <section className="panel table-panel"><div className="table-toolbar"><div className="table-count"><strong>{filtered.length}</strong> {filtered.length === 1 ? 'record' : 'records'} <span>·</span> {isStudent ? 'Your account' : 'All JMR records'}</div><div className="table-controls"><label className="search-box"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={`Search ${config.title.toLowerCase()}…`} aria-label={`Search ${config.title}`} /><kbd>⌘ K</kbd></label>{filters.length > 0 && <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)} aria-label="Filter records">{filters.map(status => <option key={status}>{status}</option>)}</select>}</div></div>
      {error && <div className="inline-error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={14} /></button></div>}
      <div className="table-scroll"><table className="data-table"><thead><tr>{config.columns.map(([, label]) => <th key={label}>{label}</th>)}<th className="actions-column">Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan={config.columns.length + 1} className="table-state"><span className="spinner spinner-navy" /> Loading {config.title.toLowerCase()}…</td></tr> : filtered.length ? filtered.map((item, index) => <tr key={item._id || index}>{config.columns.map(([key]) => <td key={key}>{key.toLowerCase().includes('date') || key === 'createdAt' || key === 'checkIn' || key === 'checkOut' ? formatDate(item[key]) : key === 'amount' || key === 'paidAmount' || key === 'balance' ? `₹${Number(item[key] || 0).toLocaleString('en-IN')}` : key === 'status' ? <span className={`status-chip ${String(item[key]).toLowerCase().replaceAll(' ', '-')}`}>{item[key] || 'Active'}</span> : displayValue(item[key])}</td>)}<td><div className="row-actions">{resource === 'fees' && !isStudent && Number(item.balance) > 0 && <button className="row-action" title="Record payment" aria-label="Record payment" onClick={() => openPayment(item)}><CircleDollarSign size={15} /></button>}{resource === 'fees' && Number(item.paidAmount) > 0 && <button className="row-action" title="Print receipt" aria-label="Print receipt" onClick={() => printReceipt(item)}><Printer size={15} /></button>}{canEdit && <button className="row-action" title="Edit" aria-label={`Edit ${config.singular}`} onClick={() => openEdit(item)}><Pencil size={15} /></button>}{!isStudent && <button className="row-action row-action-danger" title={resource === 'students' ? 'Deactivate' : 'Delete'} aria-label={resource === 'students' ? 'Deactivate student' : 'Delete record'} onClick={() => remove(item)}><Trash2 size={15} /></button>}</div></td></tr>) : <tr><td colSpan={config.columns.length + 1} className="table-empty"><div className="empty-table-icon"><FilePlus2 size={21} /></div><strong>{query || filter !== 'All records' ? 'No matching records' : 'Nothing here just yet'}</strong><span>{query || filter !== 'All records' ? 'Try adjusting your search or filter.' : `Add your first ${config.singular} to get started.`}</span></td></tr>}</tbody></table></div>
      <div className="table-footer"><span>Showing {filtered.length} of {items.length} records</span><span>Data updated live from JMR records</span></div>
    </section>
    {modal && <div className="modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && setModal(null)}><section className="form-modal" role="dialog" aria-modal="true" aria-labelledby="form-title"><div className="modal-heading"><div><span className="eyebrow"><span className="eyebrow-line" />JMR RECORD</span><h2 id="form-title">{modal.mode === 'payment' ? 'Record a payment' : modal.mode === 'create' ? `Add ${config.singular}` : `Update ${config.singular}`}</h2></div><button className="icon-button modal-close" onClick={() => setModal(null)} aria-label="Close form"><X size={19} /></button></div>{modal.mode === 'payment' && <div className="payment-context"><strong>{modal.item.studentName} · {modal.item.month}</strong><span>Outstanding balance: ₹{Number(modal.item.balance).toLocaleString('en-IN')}</span></div>}<form onSubmit={submit}><div className="form-grid">{(modal.mode === 'payment' ? [['amount', 'Payment received (₹)', 'number', true], ['method', 'Payment method', 'select:paymentMethods', true]] : resource === 'complaints' && modal.mode === 'create' && !isStudent ? [['student', 'Resident', 'select:students', true], ...config.fields] : config.fields).filter(field => !(isStudent && resource === 'complaints' && ['status', 'response'].includes(field[0])) && !(modal.mode === 'edit' && field[0] === 'password') && !(modal.mode === 'edit' && resource === 'complaints' && field[0] === 'room')).map(field => <FormField key={field[0]} field={field} value={form[field[0]]} onChange={(key, value) => setForm(previous => ({ ...previous, [key]: value }))} related={related} />)}</div>{error && <div className="form-error" role="alert">{error}</div>}<div className="modal-actions"><button className="button button-soft" type="button" onClick={() => setModal(null)}>Cancel</button><button className="button button-navy" type="submit" disabled={saving}>{saving ? <span className="spinner" /> : modal.mode === 'payment' ? 'Save payment' : modal.mode === 'create' ? 'Save record' : 'Save changes'}</button></div></form></section></div>}
  </div>
}
