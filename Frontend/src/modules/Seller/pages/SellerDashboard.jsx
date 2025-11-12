import '../seller.css'

export function SellerDashboard() {
  return (
    <div className="seller-app min-h-screen bg-surface px-6 py-10">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="rounded-3xl border border-muted/60 bg-white/90 p-6 shadow-card">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">IRA Sathi</p>
          <h1 className="mt-2 text-2xl font-semibold text-surface-foreground">Seller Console</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor your referral network, track payouts, and view incentive progress effortlessly.
          </p>
        </header>
        <section className="grid gap-4 md:grid-cols-2">
          {[
            { title: 'Monthly Target', value: '₹28 L', note: '54% achieved' },
            { title: 'Referrals', value: '148 users', note: '12 new this week' },
            { title: 'Pending Withdrawals', value: '₹82,000', note: 'Approval expected in 24h' },
            { title: 'Leaderboard Rank', value: '#5', note: 'You are 2 positions away from top spot' },
          ].map((card) => (
            <div key={card.title} className="rounded-3xl border border-muted/60 bg-white/90 p-5 shadow-card">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.title}</p>
              <p className="mt-2 text-xl font-semibold text-surface-foreground">{card.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{card.note}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}

