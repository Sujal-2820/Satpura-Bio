import { BrowserRouter, Navigate, Route, Routes, Link, useNavigate } from 'react-router-dom'
import { AdminDashboardRoute as AdminDashboardModuleRoute, AdminLogin } from './modules/Admin'
import { UserDashboardPage, UserLogin, UserRegister } from './modules/User'
import {
  VendorRouteContainer,
  VendorLoginPage,
  VendorRegisterPage,
  VendorDashboardPage,
  VendorLanguagePage,
  VendorRolePage,
} from './modules/Vendor'
import { SellerDashboardPage, SellerLogin, SellerRegister, SellerProvider } from './modules/Seller'
import { WebsiteProvider, WebsiteRoutes } from './modules/website'
import { TranslationProvider } from './context/TranslationContext'

function Home() {
  const links = [
    { label: 'Admin Login', to: '/admin/login' },
    { label: 'Admin Dashboard', to: '/admin/dashboard' },
    { label: 'User Login', to: '/user/login' },
    { label: 'User Register', to: '/user/register' },
    { label: 'User Dashboard', to: '/user/dashboard' },
    { label: 'Vendor Language Select', to: '/vendor/language' },
    { label: 'Vendor/Seller Role Select', to: '/vendor/role' },
    { label: 'Vendor Login', to: '/vendor/login' },
    { label: 'Vendor Dashboard', to: '/vendor/dashboard' },
    { label: 'Seller Login', to: '/seller/login' },
    { label: 'Seller Register', to: '/seller/register' },
    { label: 'Seller Dashboard', to: '/seller/dashboard' },
  ]

  return (
    <div className="min-h-screen bg-surface px-6 py-12 text-surface-foreground">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">IRA Sathi</p>
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
  return <UserLogin onSuccess={() => navigate('/user/dashboard')} onSwitchToRegister={() => navigate('/user/register')} />
}

function UserRegisterRoute() {
  const navigate = useNavigate()
  return <UserRegister onSuccess={() => navigate('/user/dashboard')} onSwitchToLogin={() => navigate('/user/login')} />
}

function SellerLoginRoute() {
  const navigate = useNavigate()
  return (
    <SellerProvider>
      <SellerLogin onSubmit={() => navigate('/seller/dashboard')} onSwitchToRegister={() => navigate('/seller/register')} />
    </SellerProvider>
  )
}

function SellerRegisterRoute() {
  const navigate = useNavigate()
  return (
    <SellerProvider>
      <SellerRegister onSubmit={() => navigate('/seller/dashboard')} onSwitchToLogin={() => navigate('/seller/login')} />
    </SellerProvider>
  )
}

function App() {
  return (
    <TranslationProvider>
      <BrowserRouter>
        <Routes>
        {/* Console/Admin Routes - Specific paths first */}
        <Route path="/console" element={<Home />} />
        <Route path="/admin/login" element={<AdminLoginRoute />} />
        <Route path="/admin/dashboard" element={<AdminDashboardRoute />} />
        <Route path="/user/login" element={<UserLoginRoute />} />
        <Route path="/user/register" element={<UserRegisterRoute />} />
        <Route path="/user/dashboard" element={<UserDashboardPage />} />
        <Route path="/vendor" element={<VendorRouteContainer />}>
          <Route path="language" element={<VendorLanguagePage />} />
          <Route path="role" element={<VendorRolePage />} />
          <Route path="login" element={<VendorLoginPage />} />
          <Route path="register" element={<VendorRegisterPage />} />
          <Route path="dashboard" element={<VendorDashboardPage />} />
        </Route>
        <Route path="/seller/login" element={<SellerLoginRoute />} />
        <Route path="/seller/register" element={<SellerRegisterRoute />} />
        <Route path="/seller/dashboard" element={<SellerDashboardPage />} />

        {/* Website Routes - Public E-commerce Site (catch-all for remaining paths) */}
        <Route path="/*" element={
          <WebsiteProvider>
            <WebsiteRoutes />
          </WebsiteProvider>
        } />
        </Routes>
      </BrowserRouter>
    </TranslationProvider>
  )
}

export default App
