import { useState, useRef, useEffect, useCallback } from 'react'
import { Package } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { BUTTON_INTENT } from '../hooks/useButtonAction'
import { vendorSnapshot } from '../services/vendorDashboard'
import { useVendorApi } from '../hooks/useVendorApi'

export function ButtonActionPanel({ action, isOpen, onClose, onAction, onShowNotification }) {
  const [uploadedFile, setUploadedFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [orderInfo, setOrderInfo] = useState(null)
  const fileInputRef = useRef(null)
  const { getOrderDetails } = useVendorApi()

  if (!action) return null

  const { intent, title, data, buttonId } = action

  // Initialize formData from fields if they exist
  const initializeFormData = useCallback(() => {
    if (intent === BUTTON_INTENT.UPDATION && data.fields) {
      return data.fields.reduce((acc, field) => {
        acc[field.name] = field.value || ''
        return acc
      }, {})
    }
    return {}
  }, [intent, data])

  const [formData, setFormData] = useState(initializeFormData)

  // Fetch order details if orderId is present
  useEffect(() => {
    if (isOpen && data?.orderId && (buttonId === 'update-order-status' || buttonId === 'order-available' || buttonId === 'order-not-available')) {
      getOrderDetails(data.orderId).then((result) => {
        if (result.data?.order) {
          setOrderInfo(result.data.order)
        }
      }).catch(() => {
        setOrderInfo(null)
      })
    } else {
      setOrderInfo(null)
    }
  }, [isOpen, data?.orderId, buttonId, getOrderDetails])

  // Reset formData when action changes
  useEffect(() => {
    if (action && intent === BUTTON_INTENT.UPDATION) {
      setFormData(initializeFormData())
    }
    setUploadedFile(null)
  }, [buttonId, action, intent, initializeFormData])

  const handleFormChange = (fieldName, value) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }))
    // Clear error for this field when user starts typing
    if (formErrors[fieldName]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[fieldName]
        return newErrors
      })
    }
  }

  const validateField = (field, value) => {
    if (field.required && !value) {
      return `${field.label} is required`
    }
    if (field.type === 'number' && value) {
      const numValue = parseFloat(value)
      if (isNaN(numValue)) {
        return `${field.label} must be a valid number`
      }
      if (field.min !== undefined && numValue < field.min) {
        return `${field.label} must be at least ${field.min}`
      }
      // Check max from field or from data (for dynamic max like availableBalance)
      const maxValue = field.max !== undefined ? field.max : (data?.availableBalance && field.name === 'amount' ? data.availableBalance : undefined)
      if (maxValue !== undefined && numValue > maxValue) {
        return `${field.label} must be at most ₹${Math.round(maxValue).toLocaleString('en-IN')}`
      }
    }
    if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return `${field.label} must be a valid email address`
    }
    return null
  }

  const handleFileUpload = (file) => {
    if (!file) return

    // Validate file type
    if (data.accept) {
      const acceptedTypes = data.accept.split(',').map((type) => type.trim())
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase()
      const fileType = file.type

      const isAccepted = acceptedTypes.some(
        (acceptType) =>
          fileExtension === acceptType ||
          fileType === acceptType ||
          (acceptType.startsWith('.') && fileExtension === acceptType.toLowerCase()),
      )

      if (!isAccepted) {
        onShowNotification?.(
          `File type not supported. Accepted types: ${data.accept}`,
          'error',
        )
        return
      }
    }

    // Validate file size
    if (data.maxSize && file.size > data.maxSize) {
      onShowNotification?.(
        `File size exceeds ${data.maxSize / (1024 * 1024)}MB limit`,
        'error',
      )
      return
    }

    setUploadedFile(file)
    onShowNotification?.('File selected successfully', 'success')
  }

  const handleFileInputChange = (event) => {
    const file = event.target.files?.[0]
    handleFileUpload(file)
  }

  const handleDragOver = (event) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (event) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)

    const file = event.dataTransfer.files?.[0]
    handleFileUpload(file)
  }

  const handleSubmit = () => {
    if (intent === BUTTON_INTENT.UPDATION) {
      // Validate all fields
      const errors = {}
      let hasErrors = false

      data.fields?.forEach((field) => {
        const value = formData[field.name] || field.value || ''
        const error = validateField(field, value)
        if (error) {
          errors[field.name] = error
          hasErrors = true
        }
      })

      if (hasErrors) {
        setFormErrors(errors)
        onShowNotification?.('Please fix the errors in the form', 'error')
        return
      }

      const submissionData = { ...formData }
      // Preserve orderId and other metadata from action.data (passed via openPanel)
      // Always include these if they exist in action.data, even if they're in formData
      if (data?.orderId) {
        submissionData.orderId = data.orderId
      }
      if (data?.itemId) {
        submissionData.itemId = data.itemId
      }
      if (data?.currentStock !== undefined) {
        submissionData.currentStock = data.currentStock
      }
      // Simulate API call
      onAction?.({ type: 'update', data: submissionData, buttonId })
      onShowNotification?.('Changes saved successfully', 'success')
      onClose()
    } else if (intent === BUTTON_INTENT.FILE_UPLOAD) {
      if (!uploadedFile) {
        onShowNotification?.('Please select a file to upload', 'error')
        return
      }
      // Simulate upload
      onAction?.({ type: 'upload', file: uploadedFile, buttonId })
      onShowNotification?.('File uploaded successfully', 'success')
      onClose()
    } else if (intent === BUTTON_INTENT.INSTANT_ACTION) {
      // Include data (like orderId) when confirming instant actions
      onAction?.({ type: 'confirm', buttonId, data: data || {} })
      onShowNotification?.('Action completed successfully', 'success')
      onClose()
    }
  }

  const handleCancel = () => {
    if (intent === BUTTON_INTENT.INSTANT_ACTION) {
      onAction?.({ type: 'cancel', buttonId })
      onShowNotification?.('Action cancelled', 'info')
    }
    onClose()
  }

  // Reset errors when panel closes
  useEffect(() => {
    if (!isOpen) {
      setFormErrors({})
      setUploadedFile(null)
      setIsDragging(false)
    }
  }, [isOpen])

  const renderContent = () => {
    // Helper to render order customer info
    const renderOrderInfo = () => {
      if (!orderInfo && !data?.orderId) return null
      const order = orderInfo || {}
      const customerName = order.userId?.name || order.farmer || 'Unknown'
      const customerPhone = order.userId?.phone || order.customerPhone || 'N/A'
      
      return (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-gray-600" />
            <p className="text-sm font-semibold text-gray-900">
              Order #{order.orderNumber || order.id || data.orderId}
            </p>
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            <p>Customer: {customerName}</p>
            <p>Contact: {customerPhone}</p>
          </div>
        </div>
      )
    }

    switch (intent) {
      case BUTTON_INTENT.UPDATION:
        return (
          <div className="vendor-action-panel__form">
            {renderOrderInfo()}
            {data.fields?.map((field) => (
              <div key={field.name} className="vendor-action-panel__field">
                <label className="vendor-action-panel__label">
                  {field.label}
                  {field.required && <span className="vendor-action-panel__required">*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    className={cn(
                      'vendor-action-panel__input',
                      formErrors[field.name] && 'is-error',
                    )}
                    value={formData[field.name] || field.value || ''}
                    onChange={(e) => handleFormChange(field.name, e.target.value)}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    rows={4}
                  />
                ) : field.type === 'select' ? (
                  (() => {
                    // Get options from field or from additionalData (for dynamic options like bank accounts)
                    let filteredOptions = data.bankAccountOptions && field.name === 'bankAccountId' 
                      ? data.bankAccountOptions 
                      : field.options || []
                    
                    // For status field, filter to only show current and next status
                    if (field.name === 'status' && orderInfo) {
                      const normalizeStatus = (status) => {
                        if (!status) return 'awaiting'
                        const normalized = status.toLowerCase()
                        if (normalized === 'fully_paid') return 'fully_paid'
                        if (normalized === 'delivered') return 'delivered'
                        if (normalized === 'dispatched' || normalized === 'out_for_delivery') return 'dispatched'
                        if (normalized === 'accepted' || normalized === 'processing') return 'accepted'
                        if (normalized === 'awaiting' || normalized === 'pending') return 'awaiting'
                        return 'awaiting'
                      }
                      
                      const currentStatus = normalizeStatus(orderInfo.status)
                      const paymentPreference = orderInfo.paymentPreference || 'partial'
                      const isInGracePeriod = orderInfo.statusUpdateGracePeriod?.isActive
                      
                      // Define status flow based on payment preference
                      const statusFlow = paymentPreference === 'partial'
                        ? ['awaiting', 'accepted', 'dispatched', 'delivered', 'fully_paid']
                        : ['awaiting', 'accepted', 'dispatched', 'delivered']
                      
                      const currentIndex = statusFlow.indexOf(currentStatus)
                      
                      if (currentIndex >= 0 && !isInGracePeriod) {
                        // Only show current status and next status
                        const nextIndex = currentIndex + 1
                        const allowedStatuses = [
                          statusFlow[currentIndex], // Current status
                          ...(nextIndex < statusFlow.length ? [statusFlow[nextIndex]] : []) // Next status if exists
                        ]
                        
                        filteredOptions = field.options.filter((option) => {
                          const optionValue = typeof option === 'object' ? option.value : option
                          return allowedStatuses.includes(optionValue)
                        })
                      } else if (isInGracePeriod) {
                        // During grace period, only show current status (for reverting)
                        filteredOptions = field.options.filter((option) => {
                          const optionValue = typeof option === 'object' ? option.value : option
                          return optionValue === currentStatus
                        })
                      }
                    }
                    
                    return (
                      <select
                        className={cn(
                          'vendor-action-panel__input',
                          formErrors[field.name] && 'is-error',
                        )}
                        value={formData[field.name] || field.value || ''}
                        onChange={(e) => handleFormChange(field.name, e.target.value)}
                      >
                        {filteredOptions.map((option) => {
                          // Handle both string and object options
                          const optionValue = typeof option === 'object' ? option.value : option
                          const optionLabel = typeof option === 'object' ? option.label : option.charAt(0).toUpperCase() + option.slice(1)
                          
                          return (
                            <option key={optionValue} value={optionValue}>
                              {optionLabel}
                            </option>
                          )
                        })}
                      </select>
                    )
                  })()
                ) : field.type === 'file' ? (
                  <div className="vendor-action-panel__file-field">
                    <input
                      ref={field.name === 'attachment' ? fileInputRef : null}
                      type="file"
                      accept={field.accept || '.pdf,.jpg,.jpeg,.png,.doc,.docx'}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleFormChange(field.name, file.name)
                          handleFormChange(`${field.name}_file`, file)
                        }
                      }}
                      className="vendor-action-panel__file-input"
                      style={{ display: 'none' }}
                    />
                    {formData[`${field.name}_file`] ? (
                      <div className="vendor-action-panel__file-preview">
                        <div className="vendor-action-panel__file-info">
                          <span className="vendor-action-panel__file-icon">📄</span>
                          <div className="vendor-action-panel__file-details">
                            <p className="vendor-action-panel__file-name">{formData[field.name]}</p>
                            <p className="vendor-action-panel__file-size">
                              {(formData[`${field.name}_file`].size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              handleFormChange(field.name, '')
                              handleFormChange(`${field.name}_file`, null)
                            }}
                            className="vendor-action-panel__file-remove"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const input = field.name === 'attachment' ? fileInputRef.current : document.createElement('input')
                          input.type = 'file'
                          input.accept = field.accept || '.pdf,.jpg,.jpeg,.png,.doc,.docx'
                          input.onchange = (e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              handleFormChange(field.name, file.name)
                              handleFormChange(`${field.name}_file`, file)
                            }
                          }
                          input.click()
                        }}
                        className="vendor-action-panel__file-select-button"
                      >
                        Choose File
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <input
                      type={field.type}
                      className={cn(
                        'vendor-action-panel__input',
                        formErrors[field.name] && 'is-error',
                      )}
                      value={formData[field.name] || field.value || ''}
                      onChange={(e) => handleFormChange(field.name, e.target.value)}
                      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                      min={field.min}
                      max={field.max !== undefined ? field.max : (data?.availableBalance && field.name === 'amount' ? data.availableBalance : undefined)}
                      required={field.required}
                    />
                    {field.name === 'amount' && data?.availableBalance && (
                      <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                        Available balance: ₹{Math.round(data.availableBalance).toLocaleString('en-IN')}
                      </p>
                    )}
                  </>
                )}
                {formErrors[field.name] && (
                  <span className="vendor-action-panel__error">{formErrors[field.name]}</span>
                )}
              </div>
            ))}
            <div className="vendor-action-panel__actions">
              <button type="button" onClick={onClose} className="vendor-action-panel__button is-secondary">
                Cancel
              </button>
              <button type="button" onClick={handleSubmit} className="vendor-action-panel__button is-primary">
                {data.type === 'admin_request' ? 'Send Request' : 'Update'}
              </button>
            </div>
          </div>
        )

      case BUTTON_INTENT.INFORMATION_DISPLAY:
        return <InformationDisplayContent data={data} buttonId={buttonId} />

      case BUTTON_INTENT.VIEW_ONLY:
        return <ViewOnlyContent data={data} buttonId={buttonId} />

      case BUTTON_INTENT.FILE_UPLOAD:
        return (
          <div className="vendor-action-panel__upload">
            <input
              ref={fileInputRef}
              type="file"
              accept={data.accept}
              onChange={handleFileInputChange}
              className="vendor-action-panel__file-input"
              style={{ display: 'none' }}
            />
            {!uploadedFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  'vendor-action-panel__upload-zone',
                  isDragging && 'is-dragging',
                )}
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="vendor-action-panel__upload-button"
                >
                  <span className="vendor-action-panel__upload-icon">📁</span>
                  <span>Choose File or Drag & Drop</span>
                  <span className="vendor-action-panel__upload-hint">
                    {data.accept ? `Accepted: ${data.accept}` : 'Select file'}
                    {data.maxSize ? ` (Max: ${data.maxSize / (1024 * 1024)}MB)` : ''}
                  </span>
                </button>
              </div>
            ) : (
              <div className="vendor-action-panel__file-preview">
                <div className="vendor-action-panel__file-info">
                  <span className="vendor-action-panel__file-icon">📄</span>
                  <div className="vendor-action-panel__file-details">
                    <p className="vendor-action-panel__file-name">{uploadedFile.name}</p>
                    <p className="vendor-action-panel__file-size">
                      {(uploadedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="vendor-action-panel__file-remove"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
            <div className="vendor-action-panel__actions">
              <button type="button" onClick={onClose} className="vendor-action-panel__button is-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!uploadedFile}
                className="vendor-action-panel__button is-primary"
              >
                Upload
              </button>
            </div>
          </div>
        )

      case BUTTON_INTENT.INSTANT_ACTION:
        return (
          <div className="vendor-action-panel__confirmation">
            {renderOrderInfo()}
            <p className="vendor-action-panel__confirmation-message">{data.message}</p>
            <div className="vendor-action-panel__actions">
              <button type="button" onClick={handleCancel} className="vendor-action-panel__button is-secondary">
                {data.cancelLabel || 'Cancel'}
              </button>
              <button type="button" onClick={handleSubmit} className="vendor-action-panel__button is-primary">
                {data.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        )

      default:
        return <div>Unknown action type</div>
    }
  }

  return (
    <div className={cn('vendor-activity-sheet', isOpen && 'is-open')}>
      <div className={cn('vendor-activity-sheet__overlay', isOpen && 'is-open')} onClick={onClose} />
      <div className={cn('vendor-activity-sheet__panel', isOpen && 'is-open')}>
        <div className="vendor-activity-sheet__header">
          <h4>{title}</h4>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="vendor-activity-sheet__body">{renderContent()}</div>
      </div>
    </div>
  )
}

// Information Display Content Component
function InformationDisplayContent({ data, buttonId }) {
  const renderContentByType = () => {
    switch (data.type) {
      case 'credit_info':
      case 'credit_details':
        const credit = vendorSnapshot.credit
        return (
          <div className="vendor-info-display">
            <div className="vendor-info-display__section">
              <h5 className="vendor-info-display__section-title">Credit Summary</h5>
              <div className="vendor-info-display__metrics">
                <div className="vendor-info-display__metric">
                  <span className="vendor-info-display__metric-label">Total Limit</span>
                  <span className="vendor-info-display__metric-value">{credit.limit}</span>
                </div>
                <div className="vendor-info-display__metric">
                  <span className="vendor-info-display__metric-label">Used</span>
                  <span className="vendor-info-display__metric-value">{credit.used}</span>
                </div>
                <div className="vendor-info-display__metric">
                  <span className="vendor-info-display__metric-label">Remaining</span>
                  <span className="vendor-info-display__metric-value">{credit.remaining}</span>
                </div>
                <div className="vendor-info-display__metric">
                  <span className="vendor-info-display__metric-label">Due Date</span>
                  <span className="vendor-info-display__metric-value">{credit.due}</span>
                </div>
              </div>
              <div className="vendor-info-display__status">
                <span className="vendor-info-display__status-badge">{credit.penalty}</span>
              </div>
            </div>
          </div>
        )

      case 'payouts':
        return (
          <div className="vendor-info-display">
            <div className="vendor-info-display__section">
              <h5 className="vendor-info-display__section-title">Recent Payouts</h5>
              <div className="vendor-info-display__list">
                {[
                  { date: '2024-01-15', amount: '₹86,200', status: 'Completed' },
                  { date: '2024-01-08', amount: '₹42,500', status: 'Completed' },
                  { date: '2024-01-01', amount: '₹21,500', status: 'Pending' },
                ].map((payout, index) => (
                  <div key={index} className="vendor-info-display__item">
                    <div>
                      <p className="vendor-info-display__item-label">Date</p>
                      <p className="vendor-info-display__item-value">{payout.date}</p>
                    </div>
                    <div>
                      <p className="vendor-info-display__item-label">Amount</p>
                      <p className="vendor-info-display__item-value">{payout.amount}</p>
                    </div>
                    <div>
                      <p className="vendor-info-display__item-label">Status</p>
                      <span className={cn('vendor-info-display__item-badge', payout.status === 'Completed' ? 'is-success' : 'is-pending')}>
                        {payout.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'reorder':
        return (
          <div className="vendor-info-display">
            <div className="vendor-info-display__section">
              <h5 className="vendor-info-display__section-title">Reorder Information</h5>
              <div className="vendor-info-display__content">
                <p>Items requiring reorder based on current stock levels and safety buffers.</p>
                <div className="vendor-info-display__metrics">
                  <div className="vendor-info-display__metric">
                    <span className="vendor-info-display__metric-label">Critical Items</span>
                    <span className="vendor-info-display__metric-value">5</span>
                  </div>
                  <div className="vendor-info-display__metric">
                    <span className="vendor-info-display__metric-label">Low Stock Items</span>
                    <span className="vendor-info-display__metric-value">12</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 'stock_report':
        return (
          <div className="vendor-info-display">
            <div className="vendor-info-display__section">
              <h5 className="vendor-info-display__section-title">Stock Report Summary</h5>
              <div className="vendor-info-display__metrics">
                <div className="vendor-info-display__metric">
                  <span className="vendor-info-display__metric-label">Total SKUs</span>
                  <span className="vendor-info-display__metric-value">{vendorSnapshot.inventory.length}</span>
                </div>
                <div className="vendor-info-display__metric">
                  <span className="vendor-info-display__metric-label">Average Stock Health</span>
                  <span className="vendor-info-display__metric-value">74%</span>
                </div>
                <div className="vendor-info-display__metric">
                  <span className="vendor-info-display__metric-label">Reorder Points</span>
                  <span className="vendor-info-display__metric-value">8</span>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return <div className="vendor-info-display">Information will be displayed here.</div>
    }
  }

  return renderContentByType()
}

// View Only Content Component
function ViewOnlyContent({ data, buttonId }) {
  const renderContentByType = () => {
    switch (data.type) {
      case 'sla_policy':
        return (
          <div className="vendor-view-only">
            <div className="vendor-view-only__section">
              <h5 className="vendor-view-only__section-title">SLA Policy</h5>
              <div className="vendor-view-only__content">
                <div className="vendor-view-only__policy-item">
                  <h6>Order Confirmation</h6>
                  <p>Vendors must confirm order availability within 2 hours of order placement.</p>
                </div>
                <div className="vendor-view-only__policy-item">
                  <h6>Processing Time</h6>
                  <p>Orders should be processed and ready for dispatch within 24 hours of confirmation.</p>
                </div>
                <div className="vendor-view-only__policy-item">
                  <h6>Delivery Commitment</h6>
                  <p>On-time delivery rate should maintain above 90% for optimal performance rating.</p>
                </div>
                <div className="vendor-view-only__policy-item">
                  <h6>Penalties</h6>
                  <p>Late confirmations or deliveries may result in performance penalties and credit limit adjustments.</p>
                </div>
              </div>
            </div>
          </div>
        )

      case 'suppliers':
        return (
          <div className="vendor-view-only">
            <div className="vendor-view-only__section">
              <h5 className="vendor-view-only__section-title">Supplier List</h5>
              <div className="vendor-view-only__list">
                {['Admin Hub', 'Central Warehouse', 'Regional Distributor'].map((supplier, index) => (
                  <div key={index} className="vendor-view-only__item">
                    <div>
                      <p className="vendor-view-only__item-name">{supplier}</p>
                      <p className="vendor-view-only__item-meta">Primary supplier • Fast delivery</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'profile':
        return (
          <div className="vendor-view-only">
            <div className="vendor-view-only__section">
              <h5 className="vendor-view-only__section-title">Profile & Settings</h5>
              <div className="vendor-view-only__content">
                <div className="vendor-view-only__profile-item">
                  <span className="vendor-view-only__profile-label">Account Status</span>
                  <span className="vendor-view-only__profile-value is-success">Active</span>
                </div>
                <div className="vendor-view-only__profile-item">
                  <span className="vendor-view-only__profile-label">KYC Status</span>
                  <span className="vendor-view-only__profile-value is-success">Verified</span>
                </div>
                <div className="vendor-view-only__profile-item">
                  <span className="vendor-view-only__profile-label">Documentation</span>
                  <span className="vendor-view-only__profile-value">Up to date</span>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return <div className="vendor-view-only">View-only content will be displayed here.</div>
    }
  }

  return renderContentByType()
}

