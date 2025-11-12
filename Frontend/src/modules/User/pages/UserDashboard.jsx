import '../user.css'

export function UserDashboard() {
  return (
    <div className="user-app min-h-screen bg-surface px-6 py-10">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="rounded-3xl border border-muted/60 bg-white/90 p-6 shadow-card">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">IRA Sathi</p>
          <h1 className="mt-2 text-2xl font-semibold text-surface-foreground">User Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your recent orders, explore seasonal offers, and stay updated on deliveries from your associated vendor.
          </p>
        </header>
        <section className="grid gap-4 md:grid-cols-2">
          {[
            { title: 'Pending Deliveries', value: '3', note: 'Arriving within 48 hours' },
            { title: 'Savings Earned', value: '₹4,280', note: 'Cashback from seller referrals' },
            { title: 'Support Tickets', value: '1 open', note: 'Resolution expected tomorrow' },
            { title: 'Linked Seller', value: 'SLR-883', note: 'Priya Nair • Active since Jan 2024' },
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

