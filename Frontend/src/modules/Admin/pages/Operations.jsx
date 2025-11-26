import { useState, useEffect, useCallback } from 'react'
import { Settings, Truck, Package, Bell, Plus, Edit2, Trash2, AlertCircle, Recycle } from 'lucide-react'
import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { Modal } from '../components/Modal'
import { LogisticsSettingsModal } from '../components/LogisticsSettingsModal'
import { OrderEscalationModal } from '../components/OrderEscalationModal'
import { NotificationForm } from '../components/NotificationForm'
import { useAdminState } from '../context/AdminContext'
import { useAdminApi } from '../hooks/useAdminApi'
import { useToast } from '../components/ToastNotification'
import { cn } from '../../../lib/cn'

const notificationColumns = [
  { Header: 'Title', accessor: 'title' },
  { Header: 'Target', accessor: 'targetAudience' },
  { Header: 'Priority', accessor: 'priority' },
  { Header: 'Status', accessor: 'isActive' },
  { Header: 'Created', accessor: 'createdAt' },
  { Header: 'Actions', accessor: 'actions' },
]

const escalationColumns = [
  { Header: 'Order ID', accessor: 'id' },
  { Header: 'Vendor', accessor: 'vendor' },
  { Header: 'Order Value', accessor: 'value' },
  { Header: 'Escalated', accessor: 'escalatedAt' },
  { Header: 'Status', accessor: 'status' },
  { Header: 'Actions', accessor: 'actions' },
]

export function OperationsPage() {
  const { orders: ordersState } = useAdminState()
  const {
    getLogisticsSettings,
    updateLogisticsSettings,
    getEscalatedOrders,
    fulfillOrderFromWarehouse,
    revertEscalation,
    getNotifications,
    createNotification,
    updateNotification,
    deleteNotification,
    loading,
  } = useAdminApi()
  const { success, error: showError, warning: showWarning } = useToast()

  const [logisticsSettings, setLogisticsSettings] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [escalatedOrders, setEscalatedOrders] = useState([])
  
  // Modal states
  const [logisticsModalOpen, setLogisticsModalOpen] = useState(false)
  const [notificationFormOpen, setNotificationFormOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState(null)
  const [escalationModalOpen, setEscalationModalOpen] = useState(false)
  const [selectedOrderForEscalation, setSelectedOrderForEscalation] = useState(null)
  const [revertModalOpen, setRevertModalOpen] = useState(false)
  const [selectedOrderForRevert, setSelectedOrderForRevert] = useState(null)
  const [revertReason, setRevertReason] = useState('')

  // Fetch data
  const fetchData = useCallback(async () => {
    // Fetch logistics settings
    const logisticsResult = await getLogisticsSettings()
    if (logisticsResult.data) {
      setLogisticsSettings(logisticsResult.data)
    }

    // Fetch notifications
    const notificationsResult = await getNotifications()
    if (notificationsResult.data?.notifications) {
      setNotifications(notificationsResult.data.notifications)
    }

    // Fetch escalated orders
    const escalatedResult = await getEscalatedOrders()
    if (escalatedResult.data?.orders) {
      setEscalatedOrders(escalatedResult.data.orders)
    }
  }, [getLogisticsSettings, getNotifications, getEscalatedOrders])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSaveLogisticsSettings = async (settings) => {
    try {
      const result = await updateLogisticsSettings(settings)
      if (result.data) {
        setLogisticsModalOpen(false)
        fetchData()
        success('Logistics settings updated successfully!', 3000)
      } else if (result.error) {
        const errorMessage = result.error.message || 'Failed to update logistics settings'
        if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
          showWarning(errorMessage, 5000)
        } else {
          showError(errorMessage, 5000)
        }
      }
    } catch (error) {
      showError(error.message || 'Failed to update logistics settings', 5000)
    }
  }

  const handleSaveNotification = async (notificationData) => {
    try {
      let result
      if (selectedNotification) {
        result = await updateNotification(selectedNotification.id, notificationData)
      } else {
        result = await createNotification(notificationData)
      }
      if (result.data) {
        setNotificationFormOpen(false)
        setSelectedNotification(null)
        fetchData()
        success(selectedNotification ? 'Notification updated successfully!' : 'Notification created successfully!', 3000)
      } else if (result.error) {
        const errorMessage = result.error.message || 'Failed to save notification'
        if (errorMessage.includes('validation') || errorMessage.includes('required')) {
          showWarning(errorMessage, 5000)
        } else {
          showError(errorMessage, 5000)
        }
      }
    } catch (error) {
      showError(error.message || 'Failed to save notification', 5000)
    }
  }

  const handleDeleteNotification = async (notificationId) => {
    if (window.confirm('Are you sure you want to delete this notification?')) {
      try {
        const result = await deleteNotification(notificationId)
        if (result.data) {
          fetchData()
          success('Notification deleted successfully!', 3000)
        } else if (result.error) {
          const errorMessage = result.error.message || 'Failed to delete notification'
          showError(errorMessage, 5000)
        }
      } catch (error) {
        showError(error.message || 'Failed to delete notification', 5000)
      }
    }
  }

  const handleFulfillFromWarehouse = async (orderId, fulfillmentData) => {
    try {
      const result = await fulfillOrderFromWarehouse(orderId, fulfillmentData)
      if (result.data) {
        setEscalationModalOpen(false)
        setSelectedOrderForEscalation(null)
        fetchData()
        success('Order fulfilled from warehouse successfully!', 3000)
      } else if (result.error) {
        const errorMessage = result.error.message || 'Failed to fulfill order'
        if (errorMessage.includes('stock') || errorMessage.includes('unavailable') || errorMessage.includes('cannot')) {
          showWarning(errorMessage, 6000)
        } else {
          showError(errorMessage, 5000)
        }
      }
    } catch (error) {
      showError(error.message || 'Failed to fulfill order', 5000)
    }
  }

  const handleRevertEscalation = async () => {
    if (!revertReason.trim()) {
      showError('Please provide a reason for reverting the escalation')
      return
    }

    try {
      const result = await revertEscalation(selectedOrderForRevert.id, { reason: revertReason.trim() })
      if (result.data) {
        setRevertModalOpen(false)
        setSelectedOrderForRevert(null)
        setRevertReason('')
        fetchData()
        success('Escalation reverted successfully. Order assigned back to vendor.', 3000)
      } else if (result.error) {
        showError(result.error.message || 'Failed to revert escalation', 5000)
      }
    } catch (error) {
      showError(error.message || 'Failed to revert escalation', 5000)
    }
  }

  const formatCurrency = (value) => {
    if (typeof value === 'string') {
      return value
    }
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)} L`
    }
    return `₹${value.toLocaleString('en-IN')}`
  }

  const notificationTableColumns = notificationColumns.map((column) => {
    if (column.accessor === 'targetAudience') {
      return {
        ...column,
        Cell: (row) => {
          const audience = row.targetAudience || 'all'
          const labels = {
            all: 'All Users',
            sellers: 'Sellers',
            vendors: 'Vendors',
            users: 'Users',
          }
          return <span className="text-sm font-bold text-gray-900">{labels[audience] || audience}</span>
        },
      }
    }
    if (column.accessor === 'priority') {
      return {
        ...column,
        Cell: (row) => {
          const priority = row.priority || 'normal'
          const tones = {
            urgent: 'neutral',
            high: 'warning',
            normal: 'success',
            low: 'neutral',
          }
          return <StatusBadge tone={tones[priority] || 'neutral'}>{priority}</StatusBadge>
        },
      }
    }
    if (column.accessor === 'isActive') {
      return {
        ...column,
        Cell: (row) => {
          return <StatusBadge tone={row.isActive ? 'success' : 'neutral'}>{row.isActive ? 'Active' : 'Inactive'}</StatusBadge>
        },
      }
    }
    if (column.accessor === 'actions') {
      return {
        ...column,
        Cell: (row) => {
          return (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedNotification(row)
                  setNotificationFormOpen(true)
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700"
                title="Edit notification"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteNotification(row.id)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-red-600 transition-all hover:border-red-500 hover:bg-red-50"
                title="Delete notification"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )
        },
      }
    }
    return column
  })

  const escalationTableColumns = escalationColumns.map((column) => {
    if (column.accessor === 'status') {
      return {
        ...column,
        Cell: (row) => {
          return <StatusBadge tone="warning">Escalated</StatusBadge>
        },
      }
    }
    if (column.accessor === 'value') {
      return {
        ...column,
        Cell: (row) => {
          return <span className="text-sm font-bold text-gray-900">{formatCurrency(row.value || row.orderValue || 0)}</span>
        },
      }
    }
    if (column.accessor === 'actions') {
      return {
        ...column,
        Cell: (row) => {
          return (
            <button
              type="button"
              onClick={() => {
                setSelectedOrderForEscalation(row)
                setEscalationModalOpen(true)
              }}
              className="flex items-center gap-2 rounded-lg border border-green-300 bg-white px-3 py-2 text-sm font-bold text-green-600 transition-all hover:bg-green-50"
            >
              <Package className="h-4 w-4" />
              Fulfill
            </button>
          )
        },
      }
    }
    return column
  })

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 8 • Operational Controls</p>
          <h2 className="text-2xl font-bold text-gray-900">Operations & Settings</h2>
          <p className="text-sm text-gray-600">
            Manage logistics settings, handle order escalations, and control platform notifications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLogisticsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)] transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          >
            <Truck className="h-4 w-4" />
            Delivery Settings
          </button>
          <button
            onClick={() => {
              setSelectedNotification(null)
              setNotificationFormOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_15px_rgba(59,130,246,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(59,130,246,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:scale-105"
          >
            <Plus className="h-4 w-4" />
            New Notification
          </button>
        </div>
      </header>

      {/* Logistics Settings Summary */}
      <div className="rounded-3xl border border-blue-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-lg font-bold text-blue-700">Logistics & Delivery Settings</h3>
              <p className="text-sm text-gray-600">Configure delivery timelines shown to users</p>
            </div>
          </div>
          <button
            onClick={() => setLogisticsModalOpen(true)}
            className="rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-bold text-blue-600 transition-all hover:bg-blue-50"
          >
            Configure
          </button>
        </div>
        {logisticsSettings && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs text-gray-500 mb-1">Default Delivery</p>
              <p className="text-lg font-bold text-gray-900">
                {logisticsSettings.defaultDeliveryTime === '3h' ? '3 Hours' : 
                 logisticsSettings.defaultDeliveryTime === '4h' ? '4 Hours' : '1 Day'}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs text-gray-500 mb-1">Available Options</p>
              <p className="text-lg font-bold text-gray-900">
                {logisticsSettings.availableDeliveryOptions?.length || 0} options
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <StatusBadge tone="success">Active</StatusBadge>
            </div>
          </div>
        )}
      </div>

      {/* Escalated Orders */}
      {escalatedOrders.length > 0 && (
        <div className="rounded-3xl border border-orange-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="mb-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <div>
              <h3 className="text-lg font-bold text-orange-700">Escalated Orders</h3>
              <p className="text-sm text-gray-600">Orders marked as "Not Available" by vendors</p>
            </div>
          </div>
          <DataTable
            columns={escalationTableColumns}
            rows={escalatedOrders}
            emptyState="No escalated orders"
          />
        </div>
      )}

      {/* Notifications */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-gray-600" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">Platform Notifications</h3>
              <p className="text-sm text-gray-600">Manage announcements and policy updates</p>
            </div>
          </div>
        </div>
        <DataTable
          columns={notificationTableColumns}
          rows={notifications}
          emptyState="No notifications created yet"
        />
      </div>

      {/* Modals */}
      <LogisticsSettingsModal
        isOpen={logisticsModalOpen}
        onClose={() => setLogisticsModalOpen(false)}
        settings={logisticsSettings}
        onSave={handleSaveLogisticsSettings}
        loading={loading}
      />

      <NotificationForm
        isOpen={notificationFormOpen}
        onClose={() => {
          setNotificationFormOpen(false)
          setSelectedNotification(null)
        }}
        notification={selectedNotification}
        onSave={handleSaveNotification}
        onDelete={handleDeleteNotification}
        loading={loading}
      />

      <OrderEscalationModal
        isOpen={escalationModalOpen}
        onClose={() => {
          setEscalationModalOpen(false)
          setSelectedOrderForEscalation(null)
        }}
        order={selectedOrderForEscalation}
        onFulfillFromWarehouse={handleFulfillFromWarehouse}
        loading={loading}
      />

      {/* Revert Escalation Modal */}
      {revertModalOpen && selectedOrderForRevert && (
        <Modal
          isOpen={revertModalOpen}
          onClose={() => {
            setRevertModalOpen(false)
            setSelectedOrderForRevert(null)
            setRevertReason('')
          }}
          title="Revert Escalation"
          size="md"
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
              <p className="text-sm font-semibold text-orange-900">Order #{selectedOrderForRevert.orderNumber}</p>
              <p className="text-xs text-orange-700 mt-1">
                Vendor: {selectedOrderForRevert.vendor || 'N/A'} | Value: {formatCurrency(selectedOrderForRevert.value || 0)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Reason for Reverting <span className="text-red-500">*</span>
              </label>
              <textarea
                value={revertReason}
                onChange={(e) => setRevertReason(e.target.value)}
                placeholder="Why are you reverting this escalation back to the vendor?"
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-900">
                  This order will be assigned back to the original vendor. The vendor will receive a notification and can proceed with fulfillment.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setRevertModalOpen(false)
                  setSelectedOrderForRevert(null)
                  setRevertReason('')
                }}
                disabled={loading}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevertEscalation}
                disabled={loading || !revertReason.trim()}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  'Reverting...'
                ) : (
                  <>
                    <Recycle className="h-4 w-4" />
                    Revert to Vendor
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

