import { useState, useEffect } from 'react'
import { useUserState, useUserDispatch } from '../../context/UserContext'
import { useUserApi } from '../../hooks/useUserApi'
import { useToast } from '../../components/ToastNotification'
import {
  UserIcon,
  MapPinIcon,
  PackageIcon,
  TruckIcon,
  BellIcon,
  ShieldCheckIcon,
  HelpCircleIcon,
  EditIcon,
  PlusIcon,
  ChevronRightIcon,
  CheckIcon,
  XIcon,
  TrashIcon,
} from '../../components/icons'
import { cn } from '../../../../lib/cn'

export function AccountView({ onNavigate }) {
  const { profile, addresses, orders } = useUserState()
  const dispatch = useUserDispatch()
  const { updateUserProfile, loading } = useUserApi()
  const { success, error: showError } = useToast()
  const [activeSection, setActiveSection] = useState('profile')
  const [editingName, setEditingName] = useState(false)
  const [editedName, setEditedName] = useState(profile.name)
  const [showAddressPanel, setShowAddressPanel] = useState(false)
  const [editingAddress, setEditingAddress] = useState(null)
  const [showPasswordPanel, setShowPasswordPanel] = useState(false)
  const [showDefaultAddressPanel, setShowDefaultAddressPanel] = useState(false)
  const [showChangeDeliveryAddressPanel, setShowChangeDeliveryAddressPanel] = useState(false)
  const [deliveryAddressForm, setDeliveryAddressForm] = useState({
    address: profile.location?.address || '',
    city: profile.location?.city || '',
    state: profile.location?.state || '',
    pincode: profile.location?.pincode || '',
  })
  const [showAccountRecoveryPanel, setShowAccountRecoveryPanel] = useState(false)
  const [showPrivacyPanel, setShowPrivacyPanel] = useState(false)
  const [showSupportPanel, setShowSupportPanel] = useState(false)
  const [showReportPanel, setShowReportPanel] = useState(false)
  
  // Notification preferences state
  const [notificationPrefs, setNotificationPrefs] = useState({
    sms: true,
    email: true,
    push: true,
    newsletter: true,
    promotional: false,
  })
  
  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
  })
  
  // Address form
  const [addressForm, setAddressForm] = useState({
    name: 'Home',
    address: '',
    city: profile.location?.city || '',
    state: profile.location?.state || '',
    pincode: profile.location?.pincode || '',
    phone: profile.phone || '',
  })
  
  // Report issue form
  const [reportForm, setReportForm] = useState({
    subject: '',
    description: '',
    category: 'general',
  })

  // Update edited name when profile changes
  useEffect(() => {
    setEditedName(profile.name)
  }, [profile.name])
  
  // Update address form when profile changes
  useEffect(() => {
    setAddressForm({
      name: 'Home',
      address: '',
      city: profile.location?.city || '',
      state: profile.location?.state || '',
      pincode: profile.location?.pincode || '',
      phone: profile.phone || '',
    })
    setDeliveryAddressForm({
      address: profile.location?.address || '',
      city: profile.location?.city || '',
      state: profile.location?.state || '',
      pincode: profile.location?.pincode || '',
    })
  }, [profile.location, profile.phone])

  const handleSaveName = () => {
    if (!editedName.trim()) {
      alert('Name cannot be empty')
      return
    }
    dispatch({
      type: 'AUTH_LOGIN',
      payload: { ...profile, name: editedName.trim() },
    })
    setEditingName(false)
  }

  const handleSetDefaultAddress = (addressId) => {
    dispatch({ type: 'SET_DEFAULT_ADDRESS', payload: { id: addressId } })
    setShowDefaultAddressPanel(false)
  }
  
  const handleOpenAddressPanel = (address = null) => {
    if (address) {
      setEditingAddress(address.id)
      setAddressForm({
        name: address.name || address.label || 'Home',
        address: address.address || address.street || '',
        city: address.city || '',
        state: address.state || '',
        pincode: address.pincode || '',
        phone: address.phone || profile.phone || '',
      })
    } else {
      setEditingAddress(null)
      setAddressForm({
        name: 'Home',
        address: '',
        city: profile.location?.city || '',
        state: profile.location?.state || '',
        pincode: profile.location?.pincode || '',
        phone: profile.phone || '',
      })
    }
    setShowAddressPanel(true)
  }
  
  const handleCloseAddressPanel = () => {
    setShowAddressPanel(false)
    setTimeout(() => {
      setEditingAddress(null)
      setAddressForm({
        name: 'Home',
        address: '',
        city: profile.location?.city || '',
        state: profile.location?.state || '',
        pincode: profile.location?.pincode || '',
        phone: profile.phone || '',
      })
    }, 300)
  }
  
  const handleSaveAddress = () => {
    if (!addressForm.name || !addressForm.address || !addressForm.city || !addressForm.state || !addressForm.pincode || !addressForm.phone) {
      alert('Please fill in all required fields')
      return
    }
    
    if (editingAddress) {
      dispatch({
        type: 'UPDATE_ADDRESS',
        payload: {
          id: editingAddress,
          name: addressForm.name,
          label: addressForm.name,
          address: addressForm.address,
          street: addressForm.address,
          city: addressForm.city,
          state: addressForm.state,
          pincode: addressForm.pincode,
          phone: addressForm.phone,
        },
      })
    } else {
      const newAddress = {
        id: `addr-${Date.now()}`,
        name: addressForm.name,
        label: addressForm.name,
        address: addressForm.address,
        street: addressForm.address,
        city: addressForm.city,
        state: addressForm.state,
        pincode: addressForm.pincode,
        phone: addressForm.phone,
        isDefault: addresses.length === 0,
      }
      dispatch({ type: 'ADD_ADDRESS', payload: newAddress })
    }
    handleCloseAddressPanel()
  }
  
  const handleDeleteAddress = (addressId) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      dispatch({ type: 'DELETE_ADDRESS', payload: { id: addressId } })
    }
  }
  
  const handleSavePassword = () => {
    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
      alert('Please fill in all fields')
      return
    }
    if (passwordForm.new !== passwordForm.confirm) {
      alert('New passwords do not match')
      return
    }
    if (passwordForm.new.length < 6) {
      alert('Password must be at least 6 characters long')
      return
    }
    // In a real app, this would make an API call
    alert('Password changed successfully!')
    setPasswordForm({ current: '', new: '', confirm: '' })
    setShowPasswordPanel(false)
  }
  
  const handleToggleNotification = (key) => {
    setNotificationPrefs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
    // In a real app, this would save to backend
  }
  
  const handleSubmitReport = () => {
    if (!reportForm.subject || !reportForm.description) {
      alert('Please fill in all fields')
      return
    }
    // In a real app, this would submit to backend
    alert('Issue reported successfully! We will get back to you soon.')
    setReportForm({ subject: '', description: '', category: 'general' })
    setShowReportPanel(false)
  }

  const sections = [
    {
      id: 'profile',
      title: 'Personal Information',
      icon: UserIcon,
      items: [
        {
          id: 'name',
          label: 'Full Name',
          value: profile.name,
          editable: true,
          onEdit: () => setEditingName(true),
        },
        {
          id: 'email',
          label: 'Email',
          value: profile.email || 'Not set',
          editable: false,
        },
        {
          id: 'phone',
          label: 'Phone',
          value: profile.phone || 'Not set',
          editable: false,
        },
        {
          id: 'password',
          label: 'Password',
          value: '••••••••',
          editable: true,
          onEdit: () => setShowPasswordPanel(true),
        },
      ],
    },
    {
      id: 'addresses',
      title: 'Location & Addresses',
      icon: MapPinIcon,
      items: addresses.length > 0 ? addresses.map((addr) => ({
        id: addr.id,
        label: addr.label || addr.name || addr.type || 'Address',
        value: `${addr.street || addr.address || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.pincode || ''}`,
        isDefault: addr.isDefault,
        editable: true,
        onEdit: () => handleOpenAddressPanel(addr),
        onDelete: () => handleDeleteAddress(addr.id),
      })) : [],
    },
    {
      id: 'orders',
      title: 'Orders & Transactions',
      icon: PackageIcon,
      items: [
        {
          id: 'history',
          label: 'Order History',
          value: `${orders.length} orders`,
          action: () => {
            if (onNavigate) onNavigate('orders')
          },
        },
        {
          id: 'invoices',
          label: 'Invoices',
          value: 'Download invoices',
          action: () => {
            alert('Invoice download feature coming soon')
          },
        },
      ],
    },
    {
      id: 'delivery',
      title: 'Delivery Settings',
      icon: TruckIcon,
      items: [
        {
          id: 'change-delivery-address',
          label: 'Change Delivery Address',
          value: profile.location?.city && profile.location?.state && profile.location?.pincode
            ? `${profile.location.address || ''}, ${profile.location.city}, ${profile.location.state} - ${profile.location.pincode}`.replace(/^,\s*|,\s*$/g, '').trim() || 'Not set'
            : 'Not set',
          editable: true,
          action: () => setShowChangeDeliveryAddressPanel(true),
        },
        {
          id: 'track-deliveries',
          label: 'Track Deliveries',
          value: `${orders.filter((o) => o.status === 'pending' || o.status === 'processing').length} active`,
          action: () => {
            if (onNavigate) onNavigate('orders')
          },
        },
      ],
    },
    {
      id: 'notifications',
      title: 'Notifications & Alerts',
      icon: BellIcon,
      items: [
        {
          id: 'sms',
          label: 'SMS Notifications',
          value: notificationPrefs.sms ? 'Enabled' : 'Disabled',
          toggle: true,
          enabled: notificationPrefs.sms,
          onToggle: () => handleToggleNotification('sms'),
        },
        {
          id: 'email',
          label: 'Email Notifications',
          value: notificationPrefs.email ? 'Enabled' : 'Disabled',
          toggle: true,
          enabled: notificationPrefs.email,
          onToggle: () => handleToggleNotification('email'),
        },
        {
          id: 'push',
          label: 'Push Notifications',
          value: notificationPrefs.push ? 'Enabled' : 'Disabled',
          toggle: true,
          enabled: notificationPrefs.push,
          onToggle: () => handleToggleNotification('push'),
        },
        {
          id: 'newsletter',
          label: 'Newsletter',
          value: notificationPrefs.newsletter ? 'Subscribed' : 'Not subscribed',
          toggle: true,
          enabled: notificationPrefs.newsletter,
          onToggle: () => handleToggleNotification('newsletter'),
        },
        {
          id: 'promotional',
          label: 'Promotional Messages',
          value: notificationPrefs.promotional ? 'Enabled' : 'Disabled',
          toggle: true,
          enabled: notificationPrefs.promotional,
          onToggle: () => handleToggleNotification('promotional'),
        },
      ],
    },
    {
      id: 'security',
      title: 'Security & Permissions',
      icon: ShieldCheckIcon,
      items: [
        {
          id: 'recovery',
          label: 'Account Recovery',
          value: 'Set up recovery options',
          action: () => setShowAccountRecoveryPanel(true),
        },
        {
          id: 'privacy',
          label: 'Privacy Settings',
          value: 'Manage privacy',
          action: () => setShowPrivacyPanel(true),
        },
      ],
    },
    {
      id: 'support',
      title: 'Support & Help',
      icon: HelpCircleIcon,
      items: [
        {
          id: 'help',
          label: 'Help Center',
          value: 'FAQs & Guides',
          action: () => setShowSupportPanel(true),
        },
        {
          id: 'contact',
          label: 'Contact Support',
          value: 'Chat or Call',
          action: () => setShowSupportPanel(true),
        },
        {
          id: 'report',
          label: 'Report Issue',
          value: 'Report a problem',
          action: () => setShowReportPanel(true),
        },
      ],
    },
  ]

  return (
    <div className="user-account-view space-y-6">
      {/* Profile Header */}
      <div className="user-account-view__header">
        <div className="user-account-view__header-avatar">
          <UserIcon className="h-10 w-10" />
        </div>
        <div className="user-account-view__header-info">
          <h2 className="user-account-view__header-name">{profile.name}</h2>
          <p className="user-account-view__header-email">{profile.email || profile.phone}</p>
        </div>
      </div>

      {/* Name Edit Modal */}
      {editingName && (
        <div className="user-account-view__edit-modal">
          <div className="user-account-view__edit-modal-content">
            <h3 className="user-account-view__edit-modal-title">Edit Name</h3>
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="user-account-view__edit-modal-input"
              placeholder="Enter your name"
              autoFocus
            />
            <div className="user-account-view__edit-modal-actions">
              <button
                type="button"
                className="user-account-view__edit-modal-cancel"
                onClick={() => {
                  setEditedName(profile.name)
                  setEditingName(false)
                }}
              >
                <XIcon className="h-4 w-4" />
                Cancel
              </button>
              <button
                type="button"
                className="user-account-view__edit-modal-save"
                onClick={handleSaveName}
              >
                <CheckIcon className="h-4 w-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="user-account-view__sections">
        {sections.map((section) => (
          <div key={section.id} className="user-account-view__section">
            <div className="user-account-view__section-header">
              <section.icon className="user-account-view__section-icon" />
              <h3 className="user-account-view__section-title">{section.title}</h3>
            </div>
            <div className="user-account-view__section-content">
              {section.id === 'addresses' && (
                <button
                  type="button"
                  className="user-account-view__add-button"
                  onClick={() => handleOpenAddressPanel()}
                >
                  <PlusIcon className="h-4 w-4" />
                  Add New Address
                </button>
              )}
              {section.items.length > 0 ? (
                section.items.map((item) => (
                  <div key={item.id} className="user-account-view__item">
                    <div className="user-account-view__item-content">
                      <div className="user-account-view__item-label-wrapper">
                        <span className="user-account-view__item-label">{item.label}</span>
                        {item.isDefault && (
                          <span className="user-account-view__item-badge">Default</span>
                        )}
                      </div>
                      <span className="user-account-view__item-value">{item.value}</span>
                    </div>
                    <div className="user-account-view__item-actions">
                      {item.toggle ? (
                        <label className="user-account-view__toggle">
                          <input
                            type="checkbox"
                            checked={item.enabled}
                            onChange={item.onToggle || (() => {})}
                            className="user-account-view__toggle-input"
                          />
                          <span className="user-account-view__toggle-slider" />
                        </label>
                      ) : (
                        <>
                          {item.editable && (
                            <button
                              type="button"
                              className="user-account-view__item-edit"
                              onClick={item.onEdit}
                            >
                              <EditIcon className="h-4 w-4" />
                            </button>
                          )}
                          {item.onDelete && (
                            <button
                              type="button"
                              className="user-account-view__item-delete"
                              onClick={item.onDelete}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                          {item.action && (
                            <button
                              type="button"
                              className="user-account-view__item-action"
                              onClick={item.action}
                            >
                              <ChevronRightIcon className="h-5 w-5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="user-account-view__empty">
                  <section.icon className="user-account-view__empty-icon" />
                  <p className="user-account-view__empty-text">No {section.title.toLowerCase()} yet</p>
                  {section.id === 'addresses' && (
                    <button
                      type="button"
                      className="user-account-view__empty-button"
                      onClick={() => handleOpenAddressPanel()}
                    >
                      Add Address
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Address Management Panel */}
      <div
        className={cn(
          'user-address-panel',
          showAddressPanel && 'user-address-panel--open'
        )}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleCloseAddressPanel()
          }
        }}
      >
        <div className="user-address-panel__content">
          <div className="user-address-panel__header">
            <h3 className="user-address-panel__title">
              {editingAddress ? 'Edit Address' : 'Add New Address'}
            </h3>
            <button
              type="button"
              onClick={handleCloseAddressPanel}
              className="user-address-panel__close"
              aria-label="Close"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="user-address-panel__form">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                  Address Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addressForm.name}
                  onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                  placeholder="Home, Office, etc."
                  className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-white text-sm focus:outline-none focus:border-[#1b8f5b]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={addressForm.address}
                  onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                  placeholder="Enter your street address"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-white text-sm focus:outline-none focus:border-[#1b8f5b] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    placeholder="City"
                    className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-white text-sm focus:outline-none focus:border-[#1b8f5b]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addressForm.state}
                    onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                    placeholder="State"
                    className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-white text-sm focus:outline-none focus:border-[#1b8f5b]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                    Pincode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addressForm.pincode}
                    onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                    placeholder="Pincode"
                    className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-white text-sm focus:outline-none focus:border-[#1b8f5b]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                    placeholder="Phone number"
                    className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-white text-sm focus:outline-none focus:border-[#1b8f5b]"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              {editingAddress && (
                <button
                  type="button"
                  onClick={() => handleDeleteAddress(editingAddress)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors"
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveAddress}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#1b8f5b] text-white text-sm font-semibold hover:bg-[#2a9d61] transition-colors"
              >
                {editingAddress ? 'Update Address' : 'Save Address'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Panel */}
      {showPasswordPanel && (
        <div
          className="user-account-view__panel"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPasswordPanel(false)
              setPasswordForm({ current: '', new: '', confirm: '' })
            }
          }}
        >
          <div className="user-account-view__panel-content">
            <div className="user-account-view__panel-header">
              <h3 className="user-account-view__panel-title">Change Password</h3>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordPanel(false)
                  setPasswordForm({ current: '', new: '', confirm: '' })
                }}
                className="user-account-view__panel-close"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="user-account-view__panel-body">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                    placeholder="Enter current password"
                    className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-white text-sm focus:outline-none focus:border-[#1b8f5b]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={passwordForm.new}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                    placeholder="Enter new password (min 6 characters)"
                    className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-white text-sm focus:outline-none focus:border-[#1b8f5b]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                    Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                    placeholder="Confirm new password"
                    className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-white text-sm focus:outline-none focus:border-[#1b8f5b]"
                  />
                </div>
              </div>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleSavePassword}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#1b8f5b] text-white text-sm font-semibold hover:bg-[#2a9d61] transition-colors"
                >
                  Change Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Default Address Selection Panel */}
      {showDefaultAddressPanel && addresses.length > 0 && (
        <div
          className="user-account-view__panel"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDefaultAddressPanel(false)
            }
          }}
        >
          <div className="user-account-view__panel-content">
            <div className="user-account-view__panel-header">
              <h3 className="user-account-view__panel-title">Select Default Address</h3>
              <button
                type="button"
                onClick={() => setShowDefaultAddressPanel(false)}
                className="user-account-view__panel-close"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="user-account-view__panel-body">
              <div className="space-y-2">
                {addresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => handleSetDefaultAddress(addr.id)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border-2 transition-all",
                      addr.isDefault
                        ? "border-[#1b8f5b] bg-[rgba(240,245,242,0.5)]"
                        : "border-[rgba(34,94,65,0.15)] bg-white hover:border-[#1b8f5b]"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-[#172022]">{addr.label || addr.name || 'Address'}</span>
                          {addr.isDefault && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#1b8f5b] text-white">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[rgba(26,42,34,0.7)]">
                          {addr.street || addr.address || ''}, {addr.city || ''}, {addr.state || ''} {addr.pincode || ''}
                        </p>
                      </div>
                      {addr.isDefault && (
                        <CheckIcon className="h-5 w-5 text-[#1b8f5b] flex-shrink-0 ml-2" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Recovery Panel */}
      {showAccountRecoveryPanel && (
        <div
          className="user-account-view__panel"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAccountRecoveryPanel(false)
            }
          }}
        >
          <div className="user-account-view__panel-content">
            <div className="user-account-view__panel-header">
              <h3 className="user-account-view__panel-title">Account Recovery</h3>
              <button
                type="button"
                onClick={() => setShowAccountRecoveryPanel(false)}
                className="user-account-view__panel-close"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="user-account-view__panel-body">
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[rgba(240,245,242,0.4)] border border-[rgba(34,94,65,0.1)]">
                  <h4 className="font-semibold text-[#172022] mb-2">Recovery Email</h4>
                  <p className="text-sm text-[rgba(26,42,34,0.7)] mb-3">
                    {profile.email || 'Not set'}
                  </p>
                  <button
                    type="button"
                    className="text-sm text-[#1b8f5b] font-semibold hover:underline"
                  >
                    Update Email
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-[rgba(240,245,242,0.4)] border border-[rgba(34,94,65,0.1)]">
                  <h4 className="font-semibold text-[#172022] mb-2">Recovery Phone</h4>
                  <p className="text-sm text-[rgba(26,42,34,0.7)] mb-3">
                    {profile.phone || 'Not set'}
                  </p>
                  <button
                    type="button"
                    className="text-sm text-[#1b8f5b] font-semibold hover:underline"
                  >
                    Update Phone
                  </button>
                </div>
                <p className="text-xs text-[rgba(26,42,34,0.6)]">
                  These recovery options help you regain access to your account if you forget your password.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Settings Panel */}
      {showPrivacyPanel && (
        <div
          className="user-account-view__panel"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPrivacyPanel(false)
            }
          }}
        >
          <div className="user-account-view__panel-content">
            <div className="user-account-view__panel-header">
              <h3 className="user-account-view__panel-title">Privacy Settings</h3>
              <button
                type="button"
                onClick={() => setShowPrivacyPanel(false)}
                className="user-account-view__panel-close"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="user-account-view__panel-body">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-[rgba(34,94,65,0.15)]">
                  <div>
                    <h4 className="font-semibold text-[#172022] mb-1">Profile Visibility</h4>
                    <p className="text-sm text-[rgba(26,42,34,0.7)]">Control who can see your profile</p>
                  </div>
                  <label className="user-account-view__toggle">
                    <input type="checkbox" defaultChecked className="user-account-view__toggle-input" />
                    <span className="user-account-view__toggle-slider" />
                  </label>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-[rgba(34,94,65,0.15)]">
                  <div>
                    <h4 className="font-semibold text-[#172022] mb-1">Data Sharing</h4>
                    <p className="text-sm text-[rgba(26,42,34,0.7)]">Allow data sharing for better experience</p>
                  </div>
                  <label className="user-account-view__toggle">
                    <input type="checkbox" defaultChecked className="user-account-view__toggle-input" />
                    <span className="user-account-view__toggle-slider" />
                  </label>
                </div>
                <p className="text-xs text-[rgba(26,42,34,0.6)]">
                  Your privacy is important to us. We never share your personal information with third parties without your consent.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Support Panel */}
      {showSupportPanel && (
        <div
          className="user-account-view__panel"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSupportPanel(false)
            }
          }}
        >
          <div className="user-account-view__panel-content">
            <div className="user-account-view__panel-header">
              <h3 className="user-account-view__panel-title">Support & Help</h3>
              <button
                type="button"
                onClick={() => setShowSupportPanel(false)}
                className="user-account-view__panel-close"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="user-account-view__panel-body">
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[rgba(240,245,242,0.4)] border border-[rgba(34,94,65,0.1)]">
                  <h4 className="font-semibold text-[#172022] mb-2">Help Center</h4>
                  <p className="text-sm text-[rgba(26,42,34,0.7)] mb-3">
                    Browse FAQs and guides to find answers to common questions.
                  </p>
                  <button
                    type="button"
                    className="text-sm text-[#1b8f5b] font-semibold hover:underline"
                  >
                    Visit Help Center →
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-[rgba(240,245,242,0.4)] border border-[rgba(34,94,65,0.1)]">
                  <h4 className="font-semibold text-[#172022] mb-2">Contact Support</h4>
                  <p className="text-sm text-[rgba(26,42,34,0.7)] mb-2">
                    <strong>Phone:</strong> +91 1800-XXX-XXXX
                  </p>
                  <p className="text-sm text-[rgba(26,42,34,0.7)] mb-3">
                    <strong>Email:</strong> support@irasathi.com
                  </p>
                  <p className="text-sm text-[rgba(26,42,34,0.7)] mb-3">
                    <strong>Hours:</strong> Mon-Sat, 9 AM - 6 PM
                  </p>
                  <button
                    type="button"
                    className="text-sm text-[#1b8f5b] font-semibold hover:underline"
                  >
                    Start Chat →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Issue Panel */}
      {showReportPanel && (
        <div
          className="user-account-view__panel"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowReportPanel(false)
              setReportForm({ subject: '', description: '', category: 'general' })
            }
          }}
        >
          <div className="user-account-view__panel-content">
            <div className="user-account-view__panel-header">
              <h3 className="user-account-view__panel-title">Report Issue</h3>
              <button
                type="button"
                onClick={() => {
                  setShowReportPanel(false)
                  setReportForm({ subject: '', description: '', category: 'general' })
                }}
                className="user-account-view__panel-close"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="user-account-view__panel-body">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={reportForm.category}
                    onChange={(e) => setReportForm({ ...reportForm, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-white text-sm focus:outline-none focus:border-[#1b8f5b]"
                  >
                    <option value="general">General Issue</option>
                    <option value="payment">Payment Issue</option>
                    <option value="delivery">Delivery Issue</option>
                    <option value="product">Product Issue</option>
                    <option value="account">Account Issue</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={reportForm.subject}
                    onChange={(e) => setReportForm({ ...reportForm, subject: e.target.value })}
                    placeholder="Brief description of the issue"
                    className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-white text-sm focus:outline-none focus:border-[#1b8f5b]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={reportForm.description}
                    onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                    placeholder="Please provide detailed information about the issue"
                    rows={5}
                    className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-white text-sm focus:outline-none focus:border-[#1b8f5b] resize-none"
                  />
                </div>
              </div>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleSubmitReport}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#1b8f5b] text-white text-sm font-semibold hover:bg-[#2a9d61] transition-colors"
                >
                  Submit Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Delivery Address Panel */}
      {showChangeDeliveryAddressPanel && (
        <div
          className="user-account-view__panel"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowChangeDeliveryAddressPanel(false)
            }
          }}
        >
          <div className="user-account-view__panel-content">
            <div className="user-account-view__panel-header">
              <h3 className="user-account-view__panel-title">Change Delivery Address</h3>
              <button
                type="button"
                onClick={() => setShowChangeDeliveryAddressPanel(false)}
                className="user-account-view__panel-close"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="user-account-view__panel-body">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                    Street Address
                  </label>
                  <textarea
                    value={deliveryAddressForm.address}
                    onChange={(e) => setDeliveryAddressForm({ ...deliveryAddressForm, address: e.target.value })}
                    placeholder="Enter your street address"
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-white text-sm focus:outline-none focus:border-[#1b8f5b] resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={deliveryAddressForm.city}
                      onChange={(e) => setDeliveryAddressForm({ ...deliveryAddressForm, city: e.target.value })}
                      placeholder="City"
                      className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-white text-sm focus:outline-none focus:border-[#1b8f5b]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={deliveryAddressForm.state}
                      onChange={(e) => setDeliveryAddressForm({ ...deliveryAddressForm, state: e.target.value })}
                      placeholder="State"
                      className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-white text-sm focus:outline-none focus:border-[#1b8f5b]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                    Pincode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={deliveryAddressForm.pincode}
                    onChange={(e) => setDeliveryAddressForm({ ...deliveryAddressForm, pincode: e.target.value })}
                    placeholder="Pincode"
                    maxLength={6}
                    className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-white text-sm focus:outline-none focus:border-[#1b8f5b]"
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowChangeDeliveryAddressPanel(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-[rgba(34,94,65,0.2)] bg-white text-[#1b8f5b] text-sm font-semibold hover:bg-[rgba(240,245,242,0.5)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDeliveryAddress}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#1b8f5b] text-white text-sm font-semibold hover:bg-[#2a9d61] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
