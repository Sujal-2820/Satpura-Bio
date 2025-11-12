import { useMemo, useState } from 'react'
import { AdminProvider } from '../context/AdminContext'
import { AdminLayout } from '../components/AdminLayout'
import { Sidebar } from '../components/Sidebar'
import { DashboardPage } from '../pages/Dashboard'
import { ProductsPage } from '../pages/Products'
import { VendorsPage } from '../pages/Vendors'
import { SellersPage } from '../pages/Sellers'
import { UsersPage } from '../pages/Users'
import { OrdersPage } from '../pages/Orders'
import { FinancePage } from '../pages/Finance'
import { AnalyticsPage } from '../pages/Analytics'

const routeConfig = [
  { id: 'dashboard', element: DashboardPage },
  { id: 'products', element: ProductsPage },
  { id: 'vendors', element: VendorsPage },
  { id: 'sellers', element: SellersPage },
  { id: 'users', element: UsersPage },
  { id: 'orders', element: OrdersPage },
  { id: 'finance', element: FinancePage },
  { id: 'analytics', element: AnalyticsPage },
]

export function AdminDashboardRoute({ onExit }) {
  const [activeRoute, setActiveRoute] = useState('dashboard')

  const ActivePage = useMemo(() => {
    const match = routeConfig.find((route) => route.id === activeRoute)
    return match?.element ?? DashboardPage
  }, [activeRoute])

  return (
    <AdminProvider>
      <AdminLayout
        sidebar={(props) => <Sidebar active={activeRoute} onNavigate={setActiveRoute} {...props} />}
        onExit={onExit}
      >
        <ActivePage />
      </AdminLayout>
    </AdminProvider>
  )
}

