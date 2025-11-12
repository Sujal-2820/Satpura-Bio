import { BrowserRouter, Navigate, Route, Routes, Link, useNavigate } from 'react-router-dom'
import { AdminDashboardRoute as AdminDashboardModuleRoute, AdminLogin } from './modules/Admin'
import { UserDashboard, UserLogin } from './modules/User'
import {
  VendorRouteContainer,
  VendorLoginPage,
  VendorDashboardPage,
  VendorLanguagePage,
  VendorRolePage,
} from './modules/Vendor'
import { SellerDashboard, SellerLogin } from './modules/Seller'

function Home() {
  const links = [
    { label: 'Admin Login', to: '/admin/login' },
    { label: 'Admin Dashboard', to: '/admin/dashboard' },
    { label: 'User Login', to: '/user/login' },
    { label: 'User Dashboard', to: '/user/dashboard' },
    { label: 'Vendor Language Select', to: '/vendor/language' },
    { label: 'Vendor/Seller Role Select', to: '/vendor/role' },
    { label: 'Vendor Login', to: '/vendor/login' },
    { label: 'Vendor Dashboard', to: '/vendor/dashboard' },
    { label: 'Seller Login', to: '/seller/login' },
    { label: 'Seller Dashboard', to: '/seller/dashboard' },
  ]

  return (
    <div className="min-h-screen bg-surface px-6 py-12 text-surface-foreground">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">IRA Sathi Platform</p>
          <h1 className="mt-2 text-3xl font-semibold text-surface-foreground">Access Console Routes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a portal to continue. Authentication is mocked at the moment; each dashboard renders the respective
            module experience.
          </p>
        </header>
        <nav className="grid gap-3 sm:grid-cols-2">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-3xl border border-muted/60 bg-white/90 px-5 py-4 text-sm font-semibold text-brand shadow-card transition hover:border-brand/50 hover:text-brand"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}

function AdminLoginRoute() {
  const navigate = useNavigate()
  return <AdminLogin onSubmit={() => navigate('/admin/dashboard')} />
}

function AdminDashboardRoute() {
  const navigate = useNavigate()
  return <AdminDashboardModuleRoute onExit={() => navigate('/admin/login')} />
}

function UserLoginRoute() {
  const navigate = useNavigate()
  return <UserLogin onSubmit={() => navigate('/user/dashboard')} />
}

function SellerLoginRoute() {
  const navigate = useNavigate()
  return <SellerLogin onSubmit={() => navigate('/seller/dashboard')} />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/admin/login" element={<AdminLoginRoute />} />
        <Route path="/admin/dashboard" element={<AdminDashboardRoute />} />

        <Route path="/user/login" element={<UserLoginRoute />} />
        <Route path="/user/dashboard" element={<UserDashboard />} />

        <Route path="/vendor" element={<VendorRouteContainer />}>
          <Route path="language" element={<VendorLanguagePage />} />
          <Route path="role" element={<VendorRolePage />} />
          <Route path="login" element={<VendorLoginPage />} />
          <Route path="dashboard" element={<VendorDashboardPage />} />
        </Route>

        <Route path="/seller/login" element={<SellerLoginRoute />} />
        <Route path="/seller/dashboard" element={<SellerDashboard />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
