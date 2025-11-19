import { useState } from 'react'

export function SellerLogin({ onSubmit }) {
  const [form, setForm] = useState({ email: '', password: '' })

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit?.(form)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-6 py-12">
      <div className="w-full max-w-sm rounded-3xl border border-muted/60 bg-white/90 p-6 shadow-card">
        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">IRA Partner Sign in</p>
          <h1 className="mt-2 text-2xl font-semibold text-surface-foreground">Access your IRA Partner console</h1>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label htmlFor="seller-email" className="text-xs font-semibold text-muted-foreground">
              Email
            </label>
            <input
              id="seller-email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              className="w-full rounded-2xl border border-muted/60 bg-surface px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="seller-password" className="text-xs font-semibold text-muted-foreground">
              Password
            </label>
            <input
              id="seller-password"
              name="password"
              type="password"
              required
              value={form.password}
              onChange={handleChange}
              className="w-full rounded-2xl border border-muted/60 bg-surface px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>
          <button type="submit" className="w-full rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground">
            Login
          </button>
        </form>
      </div>
    </div>
  )
}

