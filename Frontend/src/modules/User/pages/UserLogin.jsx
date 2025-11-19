import { useState } from 'react'

export function UserLogin({ onSubmit }) {
  const [form, setForm] = useState({ phone: '', otp: '', sellerId: '' })
  const [step, setStep] = useState('phone')
  const [showSellerId, setShowSellerId] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const requestOtp = (event) => {
    event.preventDefault()
    setStep('otp')
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit?.(form)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-6 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">User Access</p>
          <h1 className="mt-2 text-2xl font-semibold text-surface-foreground">Welcome back to IRA Sathi</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in with your registered mobile number.</p>
        </div>
        <div className="rounded-3xl border border-muted/60 bg-white/90 p-6 shadow-card">
          {step === 'phone' ? (
            <form className="space-y-4" onSubmit={requestOtp}>
              <div className="space-y-1.5">
                <label htmlFor="user-phone" className="text-xs font-semibold text-muted-foreground">
                  Mobile Number
                </label>
                <input
                  id="user-phone"
                  name="phone"
                  type="tel"
                  required
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+91 90000 00000"
                  className="w-full rounded-2xl border border-muted/60 bg-surface px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
                />
              </div>
              <button type="submit" className="w-full rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground">
                Send OTP
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label htmlFor="user-otp" className="text-xs font-semibold text-muted-foreground">
                  Enter OTP
                </label>
                <input
                  id="user-otp"
                  name="otp"
                  type="text"
                  required
                  value={form.otp}
                  onChange={handleChange}
                  placeholder="4 digit code"
                  maxLength={4}
                  className="w-full rounded-2xl border border-muted/60 bg-surface px-4 py-3 text-sm tracking-[0.3em] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
                />
              </div>
              
              {/* IRA Partner ID Input (Optional) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="user-seller-id" className="text-xs font-semibold text-muted-foreground">
                    IRA Partner ID (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSellerId(!showSellerId)}
                    className="text-xs text-brand hover:underline"
                  >
                    {showSellerId ? 'Hide' : 'Have an IRA Partner ID?'}
                  </button>
                </div>
                {showSellerId && (
                  <input
                    id="user-seller-id"
                    name="sellerId"
                    type="text"
                    value={form.sellerId}
                    onChange={handleChange}
                    placeholder="Enter IRA Partner ID (e.g., SLR-1001)"
                    className="w-full rounded-2xl border border-muted/60 bg-surface px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
                  />
                )}
                {showSellerId && (
                  <p className="text-xs text-muted-foreground">
                    Enter the IRA Partner ID shared by your local IRA Partner to link your purchases for cashback
                  </p>
                )}
              </div>
              
              <button type="submit" className="w-full rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground">
                Login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

