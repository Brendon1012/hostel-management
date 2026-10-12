import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ArrowUpRight, BedDouble, Bell, CalendarCheck, ChartNoAxesCombined, ChevronDown, ChevronLeft, ChevronRight, ContactRound, HeartHandshake, LayoutDashboard, LogOut, Megaphone, Menu, MessageSquareWarning, Utensils, Users, WalletCards, X } from 'lucide-react'
import Brand from './Brand.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { adminNavigation, studentNavigation } from '../data/modules.js'

const navigationIcons = { LayoutDashboard, Users, BedDouble, WalletCards, CalendarCheck, MessageSquareWarning, Utensils, ContactRound, Megaphone, ChartNoAxesCombined }

export default function PortalLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isStudent = user?.role === 'student'
  const items = isStudent ? studentNavigation : adminNavigation
  const current = items.find(item => item.path === location.pathname)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  async function signOut() {
    try {
      await logout()
    } catch (error) {
      console.error('The server could not revoke this session. The browser token was removed.', error)
    } finally {
      navigate('/', { replace: true })
    }
  }

  return <div className={`portal ${collapsed ? 'portal-collapsed' : ''} ${mobileOpen ? 'portal-mobile-open' : ''}`}>
    {mobileOpen && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
    <aside className="sidebar">
      <div className="sidebar-brand"><Link to="/portal"><Brand light compact={collapsed} /></Link><button className="collapse-button" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}</button><button className="mobile-close" aria-label="Close menu" onClick={() => setMobileOpen(false)}><X size={18} /></button></div>
      <div className="sidebar-label">{!collapsed && <>{isStudent ? 'YOUR SPACE' : 'RESIDENCE'}</>}</div>
      <nav className="sidebar-nav">{items.map((item, index) => {
        if (item.section) return !collapsed && <span className="nav-section" key={item.label}>{item.label}</span>
        const Icon = navigationIcons[item.icon] || LayoutDashboard
        return <NavLink key={item.path} to={item.path} end={item.path === '/portal'} onClick={() => setMobileOpen(false)} className={({ isActive }) => `side-link ${isActive ? 'side-link-active' : ''}`} title={collapsed ? item.label : undefined}><Icon size={18} strokeWidth={1.7} /><span>{item.label}</span>{item.resource === 'complaints' && !collapsed && <span className="nav-tiny-dot" />}</NavLink>
      })}</nav>
      {!collapsed && <div className="sidebar-help"><div className="help-icon"><HeartHandshake size={18} /></div><strong>We’re here for you.</strong><p>Need a hand with anything at JMR?</p><a href="mailto:hello@jmr-residence.in">Contact support <ArrowUpRight size={13} /></a></div>}
      <button onClick={signOut} className="side-link sidebar-logout" title="Sign out"><LogOut size={18} /><span>Sign out</span></button>
    </aside>

    <div className="portal-main"><header className="topbar"><div className="topbar-left"><button className="mobile-menu-button" aria-label="Open menu" onClick={() => setMobileOpen(true)}><Menu size={20} /></button><div className="breadcrumb"><span>JMR Portal</span><ChevronRight size={14} /><strong>{current?.label || (location.pathname.endsWith('/reports') ? 'Reports' : isStudent ? 'My dashboard' : 'Overview')}</strong></div></div><div className="topbar-right"><div className="portal-date">{new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())}</div><button className="notification-button" aria-label="Notifications" onClick={() => navigate(isStudent ? '/portal/announcements' : '/portal/complaints')}><Bell size={18} /><i /></button><div className="topbar-divider" /><button className="profile-menu" onClick={() => navigate(isStudent ? '/portal/student' : '/portal')}><span className="avatar">{(user?.name || 'J')[0].toUpperCase()}</span><span className="profile-copy"><strong>{user?.name || 'JMR Admin'}</strong><small>{isStudent ? 'Resident' : 'Administrator'}</small></span><ChevronDown size={15} /></button></div></header><main className="portal-content"><Outlet /></main></div>
  </div>
}
