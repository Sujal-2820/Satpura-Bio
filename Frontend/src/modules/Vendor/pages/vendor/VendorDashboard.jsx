import { useState } from 'react'
import { useVendorDispatch, useVendorState } from '../../context/VendorContext'
import { MobileShell } from '../../components/MobileShell'
import { BottomNavItem } from '../../components/BottomNavItem'
import { MenuList } from '../../components/MenuList'
import {
  BoxIcon,
  CartIcon,
  ChartIcon,
  CreditIcon,
  HomeIcon,
  MenuIcon,
  ReportIcon,
  SparkIcon,
  TruckIcon,
  WalletIcon,
} from '../../components/icons'
import { vendorSnapshot } from '../../services/vendorDashboard'

const NAV_ITEMS = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Orders, sales, and reminders',
    icon: HomeIcon,
  },
  {
    id: 'inventory',
    label: 'Inventory Manager',
    description: 'Current stock status',
    icon: BoxIcon,
  },
  {
    id: 'orders',
    label: 'Order Queue',
    description: 'Confirm availability and delivery',
    icon: CartIcon,
  },
  {
    id: 'credit',
    label: 'Credit Health',
    description: 'Limits, penalties, repayment',
    icon: CreditIcon,
  },
  {
    id: 'reports',
    label: 'Reports',
    description: 'Weekly / monthly performance',
    icon: ReportIcon,
  },
]

export function VendorDashboard({ onLogout }) {
  const { profile } = useVendorState()
  const dispatch = useVendorDispatch()
  const [activeTab, setActiveTab] = useState('overview')

  const handleLogout = () => {
    dispatch({ type: 'AUTH_LOGOUT' })
    onLogout?.()
  }

  const buildMenuItems = (close) => [
    ...NAV_ITEMS.map((item) => ({
      id: item.id,
      label: item.label,
      description: item.description,
      icon: <item.icon className="h-4 w-4" />,
      onSelect: () => {
        setActiveTab(item.id)
        close()
      },
    })),
    {
      id: 'logout',
      label: 'Sign out',
      icon: <MenuIcon className="h-4 w-4" />,
      description: 'Log out from vendor account',
      onSelect: () => {
        handleLogout()
        close()
      },
    },
  ]

  return (
    <MobileShell
      title="Vendor Dashboard"
      subtitle={`Welcome ${profile.name || vendorSnapshot.welcome.name} • ${vendorSnapshot.welcome.region}`}
      navigation={NAV_ITEMS.map((item) => (
        <BottomNavItem
          key={item.id}
          label={item.label}
          active={activeTab === item.id}
          onClick={() => setActiveTab(item.id)}
          icon={<item.icon active={activeTab === item.id} className="h-5 w-5" />}
        />
      ))}
      menuContent={({ close }) => <MenuList items={buildMenuItems(close)} active={activeTab} />}
    >
      <section className="space-y-6">
        {activeTab === 'overview' && <OverviewView />}
        {activeTab === 'inventory' && <InventoryView />}
        {activeTab === 'orders' && <OrdersView />}
        {activeTab === 'credit' && <CreditView />}
        {activeTab === 'reports' && <ReportsView />}
      </section>
    </MobileShell>
  )
}

function OverviewView() {
  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl border border-brand/20 bg-linear-to-r from-brand-soft/70 via-white to-white p-5 shadow-card">
        <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-brand/10" />
        <div className="pointer-events-none absolute -left-12 bottom-0 h-28 w-28 rounded-full bg-accent/10" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-card">
            <SparkIcon className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand shadow-sm">
              Coverage {vendorSnapshot.welcome.coverageKm} km
            </span>
            <h2 className="text-lg font-semibold text-surface-foreground">Stay ahead every morning</h2>
            <p className="text-sm text-muted-foreground">
              Glance through fresh orders, low stock alerts, and credit reminders before the day begins.
            </p>
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {vendorSnapshot.highlights.map((item) => (
          <div key={item.id} className="vendor-card overflow-hidden border border-muted/60 bg-white/95 p-4 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <span className="vendor-pill bg-linear-to-r from-brand-soft/70 to-brand-soft/30 text-brand">{item.trend}</span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-surface-foreground">{item.value}</p>
            <div className="mt-4 h-1 rounded-full bg-linear-to-r from-brand/50 to-transparent" />
          </div>
        ))}
      </div>
    </div>
  )
}

function InventoryView() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-surface-foreground">Inventory Overview</h2>
      <p className="text-sm text-muted-foreground">
        Update stock after physical delivery. Admin notifications trigger when levels fall below threshold.
      </p>
      <div className="space-y-3">
        {vendorSnapshot.inventory.map((item) => (
          <div key={item.id} className="vendor-card relative overflow-hidden border border-muted/50 bg-white/95 p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-linear-to-br from-brand-soft to-brand">
                <BoxIcon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-surface-foreground">{item.name}</p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      item.status === 'Healthy'
                        ? 'bg-brand-soft text-brand'
                        : item.status === 'Low'
                        ? 'bg-accent/20 text-accent'
                        : 'bg-accent/30 text-accent'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Stock: {item.stock}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="rounded-2xl bg-[#f2f5f1] px-3 py-2 font-medium text-surface-foreground">
                Purchase: {item.purchase}
              </div>
              <div className="rounded-2xl bg-[#f2f0f5] px-3 py-2 font-medium text-surface-foreground">
                Selling: {item.selling}
              </div>
            </div>
            <button className="mt-3 w-full rounded-2xl border border-brand/40 bg-brand-soft/70 py-2 text-xs font-semibold text-brand">
              Update stock quantity
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function OrdersView() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-surface-foreground">Orders Queue</h2>
      <p className="text-sm text-muted-foreground">
        Confirm availability or provide reason for unavailability. Payment status is shown for quick review.
      </p>
      <div className="space-y-3">
        {vendorSnapshot.orders.map((order) => (
          <div key={order.id} className="vendor-card border border-muted/50 bg-white/95 p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-linear-to-br from-accent/40 to-accent/10 text-accent">
                <TruckIcon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-surface-foreground">{order.farmer}</p>
                  <p className="text-xs font-semibold text-brand">{order.payment}</p>
                </div>
                <p className="text-xs text-muted-foreground">{order.value}</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Status: {order.status}</p>
            <p className="mt-2 rounded-2xl bg-brand-soft/50 px-3 py-2 text-xs font-semibold text-brand">Next: {order.next}</p>
            <div className="mt-3 flex gap-2">
              <button className="flex-1 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground">
                Available
              </button>
              <button className="flex-1 rounded-full border border-accent/50 bg-white px-4 py-2 text-xs font-semibold text-accent">
                Not available
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CreditView() {
  const credit = vendorSnapshot.credit
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-surface-foreground">Credit Health</h2>
      <div className="vendor-card border border-brand/30 bg-linear-to-br from-brand-soft/50 via-white to-white p-5 shadow-card">
        <div className="grid grid-cols-2 gap-3 text-sm font-semibold text-surface-foreground">
          <div>
            <p className="text-xs text-muted-foreground">Credit limit</p>
            <p className="mt-1 text-lg">{credit.limit}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="mt-1 text-lg">{credit.remaining}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Used</p>
            <p className="mt-1 text-lg">{credit.used}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Due date</p>
            <p className="mt-1 text-lg">{credit.due}</p>
          </div>
        </div>
        <p className="mt-4 rounded-2xl bg-white px-4 py-2 text-xs font-semibold text-brand">{credit.penalty}</p>
      </div>
      <div className="vendor-card flex items-start gap-3 border border-brand/20 bg-white/95 p-4 shadow-card">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-linear-to-br from-brand-soft to-brand text-white">
          <WalletIcon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-surface-foreground">Need to reorder?</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Minimum purchase value ₹50,000. Credit order requests go to Admin for approval before stock updates.
          </p>
          <button className="mt-3 w-full rounded-full border border-brand/50 bg-white py-2 text-xs font-semibold text-brand">
            Place credit purchase request
          </button>
        </div>
      </div>
    </div>
  )
}

function ReportsView() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-surface-foreground">Reports & Insights</h2>
      <p className="text-sm text-muted-foreground">
        Glance through weekly, monthly summaries and export for your records. More detailed analytics planned soon.
      </p>
      <div className="space-y-3">
        {vendorSnapshot.reports.map((report) => (
          <div key={report.label} className="vendor-card flex items-center gap-3 border border-muted/50 bg-white/95 px-4 py-3 shadow-card">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-linear-to-br from-brand-soft to-brand/70 text-brand-foreground">
              <ChartIcon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-surface-foreground">{report.label}</p>
                <p className="text-base font-semibold text-brand">{report.value}</p>
              </div>
              <p className="text-xs text-muted-foreground">{report.meta}</p>
            </div>
          </div>
        ))}
      </div>
      <button className="w-full rounded-full bg-brand px-4 py-3 text-xs font-semibold text-brand-foreground">
        Export latest report
      </button>
    </div>
  )
}

