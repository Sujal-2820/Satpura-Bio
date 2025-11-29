import { useState, useEffect } from 'react'
import { useSellerState } from '../context/SellerContext'
import { useSellerApi } from '../hooks/useSellerApi'
import { sellerSnapshot } from '../services/sellerData'
import { cn } from '../../../lib/cn'
import { WalletIcon, CloseIcon } from './icons'
import { useToast } from './ToastNotification'
import { ConfirmationModal } from './ConfirmationModal'

export function WithdrawalRequestPanel({ isOpen, onClose, onSuccess, availableBalance: propBalance, bankAccounts: propBankAccounts = [] }) {
  const { dashboard } = useSellerState()
  const { requestWithdrawal, loading, getBankAccounts } = useSellerApi()
  const { success, error: showError } = useToast()
  const [amount, setAmount] = useState('')
  const [bankAccountId, setBankAccountId] = useState('')
  const [bankAccounts, setBankAccounts] = useState(propBankAccounts)
  const [errors, setErrors] = useState({})
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [pendingWithdrawalData, setPendingWithdrawalData] = useState(null)

  const wallet = dashboard?.wallet || sellerSnapshot.wallet
  const availableBalance = propBalance !== undefined 
    ? propBalance 
    : (typeof wallet.balance === 'number' 
      ? wallet.balance 
      : parseFloat(wallet.balance?.replace(/[₹,\s]/g, '') || '0'))
  const minWithdrawal = 5000

  // Fetch bank accounts if not provided
  useEffect(() => {
    if (isOpen && bankAccounts.length === 0) {
      getBankAccounts().then((result) => {
        if (result.data?.bankAccounts) {
          setBankAccounts(result.data.bankAccounts)
          // Auto-select primary account
          const primary = result.data.bankAccounts.find(acc => acc.isPrimary)
          if (primary) {
            setBankAccountId(primary._id || primary.id)
          }
        }
      })
    }
  }, [isOpen, getBankAccounts, bankAccounts.length])

  const validateForm = () => {
    const newErrors = {}

    if (!amount || parseFloat(amount) < minWithdrawal) {
      newErrors.amount = `Minimum withdrawal amount is ₹${minWithdrawal.toLocaleString('en-IN')}`
    } else if (parseFloat(amount) > availableBalance) {
      newErrors.amount = `Amount exceeds available balance (₹${Math.round(availableBalance).toLocaleString('en-IN')})`
    }

    if (!bankAccountId) {
      newErrors.bankAccountId = 'Please select a bank account'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    if (bankAccounts.length === 0) {
      showError('Please add a bank account first')
      return
    }

    const withdrawalData = {
      amount: parseFloat(amount),
      bankAccountId,
    }

    // Get bank account details for confirmation
    const selectedAccount = bankAccounts.find(acc => (acc._id || acc.id) === bankAccountId)
    const bankAccountDetails = selectedAccount ? {
      'Account Holder': selectedAccount.accountHolderName || 'N/A',
      'Account Number': `****${(selectedAccount.accountNumber || '').slice(-4)}`,
      'IFSC Code': selectedAccount.ifscCode || 'N/A',
      'Bank Name': selectedAccount.bankName || 'N/A',
    } : null

    // Show confirmation modal
    setPendingWithdrawalData({
      ...withdrawalData,
      bankAccountDetails,
    })
    setShowConfirmation(true)
  }

  const handleConfirmWithdrawal = async () => {
    if (!pendingWithdrawalData) return

    const result = await requestWithdrawal(pendingWithdrawalData)
    
    if (result.error) {
      showError(result.error.message || 'Failed to submit withdrawal request')
      setShowConfirmation(false)
      setPendingWithdrawalData(null)
      return
    }

    success(`Withdrawal request of ₹${pendingWithdrawalData.amount.toLocaleString('en-IN')} submitted successfully!`)
    onSuccess?.(pendingWithdrawalData)
    
    // Reset form
    setAmount('')
    setBankAccountId('')
    setErrors({})
    setShowConfirmation(false)
    setPendingWithdrawalData(null)
    onClose()
  }

  const handleAmountChange = (value) => {
    const numValue = value.replace(/[^0-9.]/g, '')
    setAmount(numValue)
    if (errors.amount) {
      setErrors((prev) => ({ ...prev, amount: null }))
    }
  }

  if (!isOpen) return null

  return (
    <div className={cn('seller-panel', isOpen && 'is-open')}>
      <div className={cn('seller-panel__overlay', isOpen && 'is-open')} onClick={onClose} />
      <div className={cn('seller-panel__content', isOpen && 'is-open')}>
        <div className="seller-panel__header">
          <div className="seller-panel__header-content">
            <div className="seller-panel__icon">
              <WalletIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="seller-panel__title">Request Withdrawal</h3>
              <p className="seller-panel__subtitle">Transfer funds to your bank account</p>
            </div>
          </div>
          <button type="button" className="seller-panel__close" onClick={onClose} aria-label="Close">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="seller-panel__body">
          <div className="seller-panel__balance-info">
            <div className="seller-panel__balance-item">
              <span className="seller-panel__balance-label">Available Balance</span>
              <span className="seller-panel__balance-value">
                {typeof wallet.balance === 'number' 
                  ? `₹${wallet.balance.toLocaleString('en-IN')}` 
                  : wallet.balance}
              </span>
            </div>
            <div className="seller-panel__balance-item">
              <span className="seller-panel__balance-label">Minimum Withdrawal</span>
              <span className="seller-panel__balance-value">₹{minWithdrawal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="seller-panel__field">
            <label className="seller-panel__label">
              Withdrawal Amount <span className="seller-panel__required">*</span>
            </label>
            <input
              type="text"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="Enter amount"
              className={cn('seller-panel__input', errors.amount && 'is-error')}
            />
            {errors.amount && <span className="seller-panel__error">{errors.amount}</span>}
            {amount && !errors.amount && (
              <span className="seller-panel__hint">
                You will receive ₹{parseFloat(amount || 0).toLocaleString('en-IN')} in your bank account
              </span>
            )}
          </div>

          <div className="seller-panel__field">
            <label className="seller-panel__label">
              Bank Account <span className="seller-panel__required">*</span>
            </label>
            {bankAccounts.length === 0 ? (
              <>
                <div className="seller-panel__info-box" style={{ marginBottom: '0.5rem' }}>
                  <p className="seller-panel__info-text">
                    No bank accounts added. Please add a bank account first.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    // Trigger add bank account panel (will be handled by parent)
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('seller-open-panel', { detail: { panel: 'add-bank-account' } }))
                    }, 300)
                  }}
                  className="seller-panel__button seller-panel__button--secondary"
                  style={{ width: '100%' }}
                >
                  Add Bank Account
                </button>
              </>
            ) : (
              <select
                value={bankAccountId}
                onChange={(e) => {
                  setBankAccountId(e.target.value)
                  if (errors.bankAccountId) {
                    setErrors((prev) => ({ ...prev, bankAccountId: null }))
                  }
                }}
                className={cn('seller-panel__input', errors.bankAccountId && 'is-error')}
              >
                <option value="">Select bank account</option>
                {bankAccounts.map((account) => (
                  <option key={account._id || account.id} value={account._id || account.id}>
                    {account.accountHolderName} - {account.bankName} (****{account.accountNumber?.slice(-4) || 'N/A'})
                    {account.isPrimary ? ' (Primary)' : ''}
                  </option>
                ))}
              </select>
            )}
            {errors.bankAccountId && <span className="seller-panel__error">{errors.bankAccountId}</span>}
          </div>

          <div className="seller-panel__info-box">
            <p className="seller-panel__info-text">
              <strong>Note:</strong> Withdrawal requests are processed within 24-48 hours. You will receive a
              confirmation once the transfer is initiated.
            </p>
          </div>

          <div className="seller-panel__actions">
            <button type="button" onClick={onClose} className="seller-panel__button seller-panel__button--secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="seller-panel__button seller-panel__button--primary"
            >
              {loading ? 'Processing...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => {
          setShowConfirmation(false)
          setPendingWithdrawalData(null)
        }}
        onConfirm={handleConfirmWithdrawal}
        title="Confirm Withdrawal Request"
        message="Please verify all bank account details and withdrawal amount before proceeding. Once submitted, this request will be sent to admin for approval."
        details={pendingWithdrawalData ? {
          'Withdrawal Amount': `₹${pendingWithdrawalData.amount.toLocaleString('en-IN')}`,
          'Available Balance': `₹${Math.round(availableBalance).toLocaleString('en-IN')}`,
          ...(pendingWithdrawalData.bankAccountDetails || {}),
        } : null}
        loading={loading}
      />
    </div>
  )
}

