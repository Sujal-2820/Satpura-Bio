import { useState, useMemo, useEffect } from 'react'
import { useSellerState } from '../../context/SellerContext'
import { useSellerApi } from '../../hooks/useSellerApi'
import * as sellerApi from '../../services/sellerApi'
import { cn } from '../../../../lib/cn'
import { WalletIcon, TrendingUpIcon, TrendingDownIcon } from '../../components/icons'

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'commission', label: 'Commission' },
  { id: 'withdrawal', label: 'Withdrawal' },
]

export function WalletView({ openPanel }) {
  const { dashboard } = useSellerState()
  const { fetchWalletData } = useSellerApi()
  const [activeFilter, setActiveFilter] = useState('all')
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [showTransactionDetail, setShowTransactionDetail] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

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
  }, [fetchWalletData])

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

  const formatDate = (dateString) => {
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
  }

  const getTransactionIcon = (type) => {
    return type === 'commission' ? (
      <TrendingUpIcon className="h-5 w-5" />
    ) : (
      <TrendingDownIcon className="h-5 w-5" />
    )
  }

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
              <p className="seller-wallet-hero__value">{formatCurrency(wallet.balance || 0)}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const balance = wallet.balance || 0
                if (balance < 5000) {
                  // Warning will be shown in parent component
                }
                openPanel('request-withdrawal')
              }}
              className="seller-wallet-hero__cta"
            >
              Withdraw
            </button>
          </div>
          <div className="seller-wallet-hero__stats">
            <div className="seller-wallet-stat">
              <p className="seller-wallet-stat__label">Pending</p>
              <span className="seller-wallet-stat__value">{formatCurrency(wallet.pending || 0)}</span>
            </div>
            <div className="seller-wallet-stat">
              <p className="seller-wallet-stat__label">Total Earned</p>
              <span className="seller-wallet-stat__value">{formatCurrency(wallet.totalEarned || 0)}</span>
            </div>
          </div>
        </div>
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
                      {formatDate(selectedTransaction.date || selectedTransaction.createdAt)}
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
            onClick={() => openPanel('request-withdrawal')}
            className="seller-wallet-action seller-wallet-action--primary"
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

