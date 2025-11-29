import { useState, useMemo, useEffect } from 'react'
import { useSellerState } from '../../context/SellerContext'
import { useSellerApi } from '../../hooks/useSellerApi'
import * as sellerApi from '../../services/sellerApi'
import { cn } from '../../../../lib/cn'
import { WalletIcon, TrendingUpIcon, TrendingDownIcon, SparkIcon, ChartIcon, CreditIcon, BankIcon, PlusIcon, EditIcon, TrashIcon } from '../../components/icons'

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'commission', label: 'Commission' },
  { id: 'withdrawal', label: 'Withdrawal' },
]

export function WalletView({ openPanel }) {
  const { dashboard } = useSellerState()
  const { fetchWalletData, getCommissionSummary, getBankAccounts } = useSellerApi()
  const [activeFilter, setActiveFilter] = useState('all')
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [showTransactionDetail, setShowTransactionDetail] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [commissionSummary, setCommissionSummary] = useState({
    totalCommission: 0,
    thisMonthCommission: 0,
    availableBalance: 0,
    pendingWithdrawal: 0,
    commissionByRate: { low: 0, high: 0 },
    lastCommissionDate: null,
  })
  const [bankAccounts, setBankAccounts] = useState([])

  const wallet = dashboard.wallet || {}

  // Format currency
  const formatCurrency = (amount) => {
    if (typeof amount === 'number') {
      return amount >= 100000 ? `₹${(amount / 100000).toFixed(1)} L` : `₹${amount.toLocaleString('en-IN')}`
    }
    return amount || '₹0'
  }

  // Fetch wallet data on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch wallet balance (stored in context)
        await fetchWalletData()
        
        // Fetch commission summary
        const summaryResult = await getCommissionSummary()
        if (summaryResult.data) {
          setCommissionSummary(summaryResult.data)
        }
        
        // Fetch bank accounts
        const bankAccountsResult = await getBankAccounts()
        if (bankAccountsResult.data?.bankAccounts) {
          setBankAccounts(bankAccountsResult.data.bankAccounts)
        }
        
        // Fetch transactions (commissions)
        const transactionsResult = await sellerApi.getWalletTransactions({ limit: 50 })
        
        // Fetch withdrawal requests
        const withdrawalsResult = await sellerApi.getWithdrawalRequests({ limit: 50 })
        
        const allTransactions = []
        
        // Add commission transactions
        if (transactionsResult.success && transactionsResult.data?.transactions) {
          const commissionTransactions = transactionsResult.data.transactions.map((txn) => {
            const userId = txn.userId?._id || txn.userId
            const userName = txn.userId?.name || 'User'
            const orderNumber = txn.orderId?.orderNumber || 'N/A'
            
            return {
              id: txn._id || txn.id,
              type: 'commission',
              transactionType: 'commission',
              amount: txn.commissionAmount || 0,
              description: `Commission for order ${orderNumber}`,
              note: `Commission earned from ${userName}`,
              reason: `Order ${orderNumber}`,
              status: txn.status === 'credited' ? 'Completed' : txn.status || 'Completed',
              date: txn.createdAt || txn.creditedAt,
              createdAt: txn.createdAt || txn.creditedAt,
              userId: userId,
              userName: userName,
              orderId: txn.orderId?._id || txn.orderId,
              orderNumber: orderNumber,
              commissionRate: txn.commissionRate || 0,
              orderAmount: txn.orderAmount || 0,
            }
          })
          allTransactions.push(...commissionTransactions)
        }
        
        // Add withdrawal transactions
        if (withdrawalsResult.success && withdrawalsResult.data?.withdrawals) {
          const withdrawalTransactions = withdrawalsResult.data.withdrawals.map((wd) => ({
            id: wd._id || wd.id,
            type: 'withdrawal',
            transactionType: 'withdrawal',
            amount: -(wd.amount || 0), // Negative for withdrawals
            description: `Withdrawal request`,
            note: wd.notes || `Withdrawal of ₹${wd.amount}`,
            reason: `Withdrawal request`,
            status: wd.status === 'approved' ? 'Completed' : wd.status === 'rejected' ? 'Rejected' : 'Pending',
            date: wd.createdAt,
            createdAt: wd.createdAt,
            withdrawalId: wd._id || wd.id,
            paymentMethod: wd.paymentMethod || 'bank_transfer',
          }))
          allTransactions.push(...withdrawalTransactions)
        }
        
        // Sort by date (newest first)
        allTransactions.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
        
        setTransactions(allTransactions)
      } catch (error) {
        console.error('Failed to fetch wallet data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [fetchWalletData, getCommissionSummary, getBankAccounts])

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    if (activeFilter === 'all') {
      return transactions
    }
    return transactions.filter((txn) => {
      const type = txn.type || txn.transactionType
      return type === activeFilter || (activeFilter === 'commission' && type === 'credit') || (activeFilter === 'withdrawal' && type === 'debit')
    })
  }, [transactions, activeFilter])


  const getTransactionIcon = (type) => {
    return type === 'commission' ? (
      <TrendingUpIcon className="h-5 w-5" />
    ) : (
      <TrendingDownIcon className="h-5 w-5" />
    )
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return dateString
    }
  }

  const commissionMetrics = [
    { label: 'Total Commission', value: formatCurrency(commissionSummary.totalCommission || wallet.totalEarned || 0), icon: WalletIcon, tone: 'success' },
    { label: 'Available Balance', value: formatCurrency(commissionSummary.availableBalance || wallet.balance || 0), icon: SparkIcon, tone: 'success' },
    { label: 'Pending Withdrawal', value: formatCurrency(commissionSummary.pendingWithdrawal || wallet.pending || 0), icon: CreditIcon, tone: 'warn' },
    { label: 'This Month', value: formatCurrency(commissionSummary.thisMonthCommission || 0), icon: ChartIcon, tone: 'teal' },
  ]

  return (
    <div className="seller-wallet space-y-6">
      {/* Wallet Hero Card */}
      <section id="seller-wallet-hero" className="seller-wallet-hero">
        <div className="seller-wallet-hero__card">
          <div className="seller-wallet-hero__header">
            <div>
              <h2 className="seller-wallet-hero__title">Wallet</h2>
              <p className="seller-wallet-hero__subtitle">Your earnings & balance</p>
            </div>
            <div className="seller-wallet-hero__badge">
              <WalletIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="seller-wallet-hero__balance">
            <div>
              <p className="seller-wallet-hero__label">Available Balance</p>
              <p className="seller-wallet-hero__value">{formatCurrency(commissionSummary.availableBalance || wallet.balance || 0)}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const balance = commissionSummary.availableBalance || wallet.balance || 0
                if (balance < 5000) {
                  // Warning will be shown in parent component
                }
                openPanel('request-withdrawal', { availableBalance: balance, bankAccounts })
              }}
              className="seller-wallet-hero__cta"
              disabled={bankAccounts.length === 0}
            >
              Withdraw
            </button>
          </div>
          <div className="seller-wallet-hero__stats">
            <div className="seller-wallet-stat">
              <p className="seller-wallet-stat__label">Pending</p>
              <span className="seller-wallet-stat__value">{formatCurrency(commissionSummary.pendingWithdrawal || wallet.pending || 0)}</span>
            </div>
            <div className="seller-wallet-stat">
              <p className="seller-wallet-stat__label">Total Earned</p>
              <span className="seller-wallet-stat__value">{formatCurrency(commissionSummary.totalCommission || wallet.totalEarned || 0)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Commission Summary Metrics */}
      <section id="commission-metrics" className="seller-section">
        <div className="seller-section__header">
          <div>
            <h3 className="seller-section__title">Commission Summary</h3>
          </div>
        </div>
        <div className="seller-wallet-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {commissionMetrics.map((metric) => {
            const Icon = metric.icon
            return (
              <div key={metric.label} className="seller-wallet-metric-card" style={{ padding: '1rem', background: '#fff', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div style={{ 
                    padding: '0.5rem', 
                    borderRadius: '0.375rem', 
                    background: metric.tone === 'warn' ? '#fef3c7' : metric.tone === 'teal' ? '#d1fae5' : '#dcfce7',
                    color: metric.tone === 'warn' ? '#d97706' : metric.tone === 'teal' ? '#059669' : '#16a34a'
                  }}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>{metric.label}</p>
                </div>
                <span style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827' }}>{metric.value}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* Commission Rate Breakdown */}
      {(commissionSummary.commissionByRate?.low > 0 || commissionSummary.commissionByRate?.high > 0) && (
        <section id="commission-breakdown" className="seller-section">
          <div className="seller-section__header">
            <div>
              <h3 className="seller-section__title">Commission by Rate</h3>
              <p className="seller-section__subtitle">Breakdown of commissions by rate tier</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: '#fff', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>2% Commission (Up to ₹50,000)</p>
              <p style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827' }}>{formatCurrency(commissionSummary.commissionByRate.low || 0)}</p>
            </div>
            <div style={{ padding: '1rem', background: '#fff', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>3% Commission (Above ₹50,000)</p>
              <p style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827' }}>{formatCurrency(commissionSummary.commissionByRate.high || 0)}</p>
            </div>
          </div>
        </section>
      )}

      {/* Bank Account Management */}
      <section id="bank-accounts" className="seller-section">
        <div className="seller-section__header">
          <div>
            <h3 className="seller-section__title">Bank Accounts</h3>
            <p className="seller-section__subtitle">Manage your bank accounts for withdrawals</p>
          </div>
          <button
            type="button"
            onClick={() => openPanel('add-bank-account')}
            className="seller-wallet-action seller-wallet-action--secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
          >
            <PlusIcon className="h-4 w-4" />
            Add Account
          </button>
        </div>
        {bankAccounts.length === 0 ? (
          <div className="seller-wallet-empty">
            <BankIcon className="seller-wallet-empty__icon" />
            <p className="seller-wallet-empty__text">No bank accounts added yet</p>
            <p className="seller-wallet-empty__subtext">Please add a bank account to receive withdrawals</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {bankAccounts.map((account) => (
              <div key={account._id || account.id} style={{ padding: '1rem', background: '#fff', borderRadius: '0.5rem', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', background: '#f3f4f6', borderRadius: '0.375rem' }}>
                  <BankIcon className="h-5 w-5" style={{ color: '#6b7280' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: '0 0 0.25rem 0' }}>{account.accountHolderName}</p>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 0.25rem 0' }}>**** {account.accountNumber?.slice(-4) || 'N/A'}</p>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>{account.bankName} ({account.ifscCode})</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => openPanel('edit-bank-account', { account })}
                    style={{ padding: '0.5rem', background: '#f3f4f6', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                  >
                    <EditIcon className="h-4 w-4" style={{ color: '#6b7280' }} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openPanel('delete-bank-account', { accountId: account._id || account.id })}
                    style={{ padding: '0.5rem', background: '#fee2e2', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                  >
                    <TrashIcon className="h-4 w-4" style={{ color: '#dc2626' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Filter Tabs */}
      <section id="seller-wallet-filters" className="seller-section">
        <div className="seller-filter-tabs">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={cn('seller-filter-tab', activeFilter === tab.id && 'is-active')}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* Transactions List */}
      <section id="seller-wallet-transactions" className="seller-section">
        <div className="seller-section__header">
          <div>
            <h3 className="seller-section__title">Transaction History</h3>
            <p className="seller-section__subtitle">{filteredTransactions.length} transactions</p>
          </div>
        </div>
        {loading ? (
          <div className="seller-wallet-empty">
            <WalletIcon className="seller-wallet-empty__icon" />
            <p className="seller-wallet-empty__text">Loading transactions...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="seller-wallet-empty">
            <WalletIcon className="seller-wallet-empty__icon" />
            <p className="seller-wallet-empty__text">No transactions found</p>
            <p className="seller-wallet-empty__subtext">
              {activeFilter === 'all'
                ? 'Your transaction history will appear here'
                : `No ${activeFilter} transactions yet`}
            </p>
          </div>
        ) : (
          <div className="seller-wallet-transactions">
            {filteredTransactions.map((transaction) => {
              const type = transaction.type || transaction.transactionType || 'commission'
              const isCredit = type === 'commission' || type === 'credit' || (transaction.amount && transaction.amount > 0)
              const amount = typeof transaction.amount === 'number'
                ? (isCredit ? `+₹${transaction.amount.toLocaleString('en-IN')}` : `-₹${Math.abs(transaction.amount).toLocaleString('en-IN')}`)
                : transaction.amount || '₹0'
              const description = transaction.description || transaction.note || transaction.reason || 'Transaction'
              const status = transaction.status || 'Completed'
              const date = transaction.date || transaction.createdAt || new Date().toISOString()
              
              return (
                <div
                  key={transaction.id || transaction._id}
                  className="seller-transaction-card"
                  onClick={() => {
                    setSelectedTransaction(transaction)
                    setShowTransactionDetail(true)
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="seller-transaction-card__icon">
                    <div
                      className={cn(
                        'seller-transaction-icon',
                        isCredit ? 'is-credit' : 'is-debit',
                      )}
                    >
                      {getTransactionIcon(type)}
                    </div>
                  </div>
                  <div className="seller-transaction-card__info">
                    <div className="seller-transaction-card__row">
                      <h4 className="seller-transaction-card__description">{description}</h4>
                      <span
                        className={cn(
                          'seller-transaction-card__amount',
                          amount.startsWith('+') ? 'is-credit' : 'is-debit',
                        )}
                      >
                        {amount}
                      </span>
                    </div>
                    <div className="seller-transaction-card__meta">
                      <span
                        className={cn(
                          'seller-transaction-card__type',
                          isCredit ? 'is-commission' : 'is-withdrawal',
                        )}
                      >
                        {isCredit ? 'Commission' : 'Withdrawal'}
                      </span>
                      <span className="seller-transaction-card__date">{formatDate(date)}</span>
                      <span
                        className={cn(
                          'seller-transaction-card__status',
                          status === 'Completed' || status === 'completed' ? 'is-completed' : 'is-pending',
                        )}
                      >
                        {status}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Transaction Detail Sheet */}
      {selectedTransaction && showTransactionDetail && (
        <div className={cn('seller-activity-sheet', showTransactionDetail && 'is-open')}>
          <div
            className={cn('seller-activity-sheet__overlay', showTransactionDetail && 'is-open')}
            onClick={() => {
              setShowTransactionDetail(false)
              setTimeout(() => setSelectedTransaction(null), 260)
            }}
          />
          <div className={cn('seller-activity-sheet__panel', showTransactionDetail && 'is-open')}>
            <div className="seller-activity-sheet__header">
              <h4>Transaction Details</h4>
              <button
                type="button"
                onClick={() => {
                  setShowTransactionDetail(false)
                  setTimeout(() => setSelectedTransaction(null), 260)
                }}
              >
                Close
              </button>
            </div>
            <div className="seller-activity-sheet__body">
              <div className="seller-transaction-detail">
                <div className="seller-transaction-detail__header">
                  <div
                    className={cn(
                      'seller-transaction-icon',
                      (selectedTransaction.type === 'commission' || selectedTransaction.type === 'credit') ? 'is-credit' : 'is-debit',
                    )}
                  >
                    {getTransactionIcon(selectedTransaction.type || selectedTransaction.transactionType)}
                  </div>
                  <div className="seller-transaction-detail__info">
                    <h3 className="seller-transaction-detail__description">
                      {selectedTransaction.description || selectedTransaction.note || 'Transaction'}
                    </h3>
                    <span
                      className={cn(
                        'seller-transaction-detail__amount',
                        (selectedTransaction.amount && selectedTransaction.amount.toString().startsWith('+')) || (typeof selectedTransaction.amount === 'number' && selectedTransaction.amount > 0) ? 'is-credit' : 'is-debit',
                      )}
                    >
                      {typeof selectedTransaction.amount === 'number'
                        ? (selectedTransaction.amount > 0 ? `+₹${selectedTransaction.amount.toLocaleString('en-IN')}` : `-₹${Math.abs(selectedTransaction.amount).toLocaleString('en-IN')}`)
                        : selectedTransaction.amount || '₹0'}
                    </span>
                  </div>
                </div>
                <div className="seller-transaction-detail__meta">
                  <div className="seller-transaction-detail__meta-item">
                    <span className="seller-transaction-detail__meta-label">Type</span>
                    <span
                      className={cn(
                        'seller-transaction-card__type',
                        (selectedTransaction.type === 'commission' || selectedTransaction.type === 'credit') ? 'is-commission' : 'is-withdrawal',
                      )}
                    >
                      {(selectedTransaction.type === 'commission' || selectedTransaction.type === 'credit') ? 'Commission' : 'Withdrawal'}
                    </span>
                  </div>
                  <div className="seller-transaction-detail__meta-item">
                    <span className="seller-transaction-detail__meta-label">Status</span>
                    <span
                      className={cn(
                        'seller-transaction-card__status',
                        (selectedTransaction.status === 'Completed' || selectedTransaction.status === 'completed') ? 'is-completed' : 'is-pending',
                      )}
                    >
                      {selectedTransaction.status || 'Completed'}
                    </span>
                  </div>
                  <div className="seller-transaction-detail__meta-item">
                    <span className="seller-transaction-detail__meta-label">Date</span>
                    <span className="seller-transaction-detail__meta-value">
                      {(() => {
                        const dateString = selectedTransaction.date || selectedTransaction.createdAt
                        if (!dateString) return 'N/A'
                        try {
                          const date = new Date(dateString)
                          const now = new Date()
                          const diff = now - date
                          const minutes = Math.floor(diff / 60000)
                          const hours = Math.floor(diff / 3600000)
                          const days = Math.floor(diff / 86400000)

                          if (minutes < 1) return 'Just now'
                          if (minutes < 60) return `${minutes}m ago`
                          if (hours < 24) return `${hours}h ago`
                          if (days < 7) return `${days}d ago`
                          return date.toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        } catch {
                          return dateString
                        }
                      })()}
                    </span>
                  </div>
                  <div className="seller-transaction-detail__meta-item">
                    <span className="seller-transaction-detail__meta-label">Transaction ID</span>
                    <span className="seller-transaction-detail__meta-value">{selectedTransaction.id || selectedTransaction._id || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <section id="seller-wallet-actions" className="seller-section">
        <div className="seller-wallet-actions">
            <button
              type="button"
              onClick={() => openPanel('request-withdrawal', { availableBalance: commissionSummary.availableBalance || wallet.balance || 0, bankAccounts })}
              className="seller-wallet-action seller-wallet-action--primary"
              disabled={bankAccounts.length === 0}
            >
              <WalletIcon className="h-5 w-5" />
              Request Withdrawal
            </button>
          <button
            type="button"
            onClick={() => openPanel('view-performance')}
            className="seller-wallet-action seller-wallet-action--secondary"
          >
            <TrendingUpIcon className="h-5 w-5" />
            View Earnings
          </button>
        </div>
      </section>
    </div>
  )
}

