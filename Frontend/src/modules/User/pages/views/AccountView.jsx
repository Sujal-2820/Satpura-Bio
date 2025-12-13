import { useState, useEffect } from 'react'
import { useUserState, useUserDispatch } from '../../context/UserContext'
import { useUserApi } from '../../hooks/useUserApi'
import { useToast } from '../../components/ToastNotification'
import * as userApi from '../../services/userApi'
import { GoogleMapsLocationPicker } from '../../../../components/GoogleMapsLocationPicker'
import {
  UserIcon,
  PackageIcon,
  TruckIcon,
  HelpCircleIcon,
  EditIcon,
  ChevronRightIcon,
  CheckIcon,
  XIcon,
  TrashIcon,
} from '../../components/icons'
import { cn } from '../../../../lib/cn'
import { Trans } from '../../../../components/Trans'
import { TransText } from '../../../../components/TransText'

export function AccountView({ onNavigate, authenticated, isLaptopView, onShowAuthPrompt }) {
  const { profile, orders } = useUserState()
  const dispatch = useUserDispatch()
  const { updateUserProfile, loading } = useUserApi()
  const { success, error: showError } = useToast()
  const [activeSection, setActiveSection] = useState('profile')
  const [editingName, setEditingName] = useState(false)
  const [editedName, setEditedName] = useState(profile.name)
  const [showChangeDeliveryAddressPanel, setShowChangeDeliveryAddressPanel] = useState(false)
  const [deliveryAddressOTPStep, setDeliveryAddressOTPStep] = useState(1) // 1: request OTP, 2: verify OTP, 3: select address
  const [deliveryAddressOTP, setDeliveryAddressOTP] = useState('')
  const [deliveryAddressOTPLoading, setDeliveryAddressOTPLoading] = useState(false)
  const [selectedDeliveryLocation, setSelectedDeliveryLocation] = useState(null)
  const [deliveryAddressForm, setDeliveryAddressForm] = useState({
    address: profile.location?.address || '',
    city: profile.location?.city || '',
    state: profile.location?.state || '',
    pincode: profile.location?.pincode || '',
  })
  const [showSupportPanel, setShowSupportPanel] = useState(false)
  const [showReportPanel, setShowReportPanel] = useState(false)
  const [showPhoneUpdatePanel, setShowPhoneUpdatePanel] = useState(false)
  const [phoneUpdateStep, setPhoneUpdateStep] = useState(1) // 1: request current OTP, 2: verify current OTP, 3: enter new phone, 4: request new OTP, 5: verify new OTP
  const [currentPhoneOTP, setCurrentPhoneOTP] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newPhoneOTP, setNewPhoneOTP] = useState('')
  const [phoneUpdateLoading, setPhoneUpdateLoading] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState('profile') // For laptop view navigation
  
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
  
  // Update delivery address form when profile changes
  useEffect(() => {
    setDeliveryAddressForm({
      address: profile.location?.address || '',
      city: profile.location?.city || '',
      state: profile.location?.state || '',
      pincode: profile.location?.pincode || '',
    })
  }, [profile.location])

  const handleSaveName = async () => {
    // Check authentication
    if (!authenticated) {
      if (onShowAuthPrompt) {
        onShowAuthPrompt('profile')
      }
      return
    }

    if (!editedName.trim()) {
      alert('Name cannot be empty')
      return
    }
    
    try {
      const result = await updateUserProfile({ name: editedName.trim() })
      
      // Close edit modal immediately
      setEditingName(false)
      
      // useUserApi hook returns { data, error } structure
      // If error is null/undefined, it means success
      if (result && !result.error && result.data) {
    dispatch({
      type: 'AUTH_LOGIN',
          payload: { ...profile, name: result.data.user?.name || editedName.trim() },
    })
        // Show green success notification with tick icon
        success(result.data.message || 'Name updated successfully')
      } else {
        // Show red error notification
        showError(result?.error?.message || result?.data?.message || 'Failed to update name')
      }
    } catch (error) {
      console.error('Error updating name:', error)
      // Close edit modal on error
    setEditingName(false)
      // Show red error notification
      showError(error?.error?.message || error?.message || 'Failed to update name')
    }
  }
  
  const handleSaveDeliveryAddress = async () => {
    // Check authentication
    if (!authenticated) {
      if (onShowAuthPrompt) {
        onShowAuthPrompt('profile')
      }
      return
    }

    // Validate that location is selected from Google Maps
    if (!selectedDeliveryLocation || !selectedDeliveryLocation.coordinates) {
      showError('Please select a location from Google Maps')
      return
    }
    
    if (!selectedDeliveryLocation.city || !selectedDeliveryLocation.state || !selectedDeliveryLocation.pincode) {
      showError('Please select a complete address with city, state, and pincode')
      return
    }
    
    try {
      const result = await updateUserProfile({
        location: {
          address: selectedDeliveryLocation.address || '',
          city: selectedDeliveryLocation.city,
          state: selectedDeliveryLocation.state,
          pincode: selectedDeliveryLocation.pincode,
          coordinates: selectedDeliveryLocation.coordinates,
        },
      })
      
      // useUserApi hook returns { data, error } structure
      if (result && !result.error && result.data) {
        dispatch({
          type: 'AUTH_LOGIN',
          payload: { ...profile, location: result.data.user?.location || selectedDeliveryLocation },
        })
        success('Delivery address updated successfully')
        setShowChangeDeliveryAddressPanel(false)
        setDeliveryAddressOTPStep(1)
        setDeliveryAddressOTP('')
        setSelectedDeliveryLocation(null)
    } else {
        showError(result?.error?.message || result?.data?.message || 'Failed to update delivery address')
      }
    } catch (error) {
      console.error('Error updating delivery address:', error)
      showError(error?.error?.message || error?.message || 'Failed to update delivery address')
    }
  }
  
  const handleSubmitReport = () => {
    // Check authentication
    if (!authenticated) {
      if (onShowAuthPrompt) {
        onShowAuthPrompt('profile')
      }
      return
    }

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
          onEdit: () => {
            if (!authenticated) {
              if (onShowAuthPrompt) {
                onShowAuthPrompt('profile')
              }
              return
            }
            setEditingName(true)
          },
        },
        {
          id: 'phone',
          label: 'Phone',
          value: profile.phone || 'Not set',
          editable: true,
          onEdit: () => {
            if (!authenticated) {
              if (onShowAuthPrompt) {
                onShowAuthPrompt('profile')
              }
              return
            }
            setPhoneUpdateStep(1)
            setShowPhoneUpdatePanel(true)
            setCurrentPhoneOTP('')
            setNewPhone('')
            setNewPhoneOTP('')
          },
        },
      ],
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
          action: () => {
            if (!authenticated) {
              if (onShowAuthPrompt) {
                onShowAuthPrompt('profile')
              }
              return
            }
            setDeliveryAddressOTPStep(1)
            setDeliveryAddressOTP('')
            setSelectedDeliveryLocation(null)
            setShowChangeDeliveryAddressPanel(true)
          },
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
  ].map(section => ({
    ...section,
    title: section.title, // Will be translated in JSX
    items: section.items.map(item => ({
      ...item,
      label: item.label, // Will be translated in JSX
      value: item.id === 'history' ? item.value : (item.id === 'change-delivery-address' ? item.value : item.value), // Dynamic values stay as is
    })),
  }))

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
            <h3 className="user-account-view__edit-modal-title"><Trans>Edit Name</Trans></h3>
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="user-account-view__edit-modal-input"
              placeholder="Enter your name" // TODO: Translate placeholder
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
                <Trans>Cancel</Trans>
              </button>
              <button
                type="button"
                className="user-account-view__edit-modal-save"
                onClick={handleSaveName}
              >
                <CheckIcon className="h-4 w-4" />
                <Trans>Save</Trans>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="user-account-view__sections">
        {/* Left Navigation - Laptop View */}
        <div className="user-account-view__nav">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={cn(
                'user-account-view__nav-item',
                activeSectionId === section.id && 'user-account-view__nav-item--active'
              )}
              onClick={() => setActiveSectionId(section.id)}
            >
              <section.icon className="user-account-view__nav-item-icon" />
              <span className="user-account-view__nav-item-title"><Trans>{section.title}</Trans></span>
            </button>
          ))}
        </div>

        {/* Right Content - Laptop View */}
        <div className="user-account-view__content">
          {sections.map((section) => (
            <div
              key={section.id}
              className={cn(
                'user-account-view__section',
                activeSectionId === section.id && 'user-account-view__section--active'
              )}
            >
              <div className="user-account-view__section-header">
                <section.icon className="user-account-view__section-icon" />
                <h3 className="user-account-view__section-title"><Trans>{section.title}</Trans></h3>
              </div>
              <div className="user-account-view__section-content">
                {section.items.length > 0 ? (
                  section.items.map((item) => (
                    <div key={item.id} className="user-account-view__item">
                      <div className="user-account-view__item-content">
                        <div className="user-account-view__item-label-wrapper">
                          <span className="user-account-view__item-label"><Trans>{item.label}</Trans></span>
                          {item.isDefault && (
                            <span className="user-account-view__item-badge">Default</span>
                          )}
                        </div>
                        <span className="user-account-view__item-value">
                          {item.id === 'history' ? (
                            <>
                              {orders.length} <Trans>orders</Trans>
                            </>
                          ) : item.id === 'change-delivery-address' ? (
                            profile.location?.city && profile.location?.state && profile.location?.pincode
                              ? `${profile.location.address || ''}, ${profile.location.city}, ${profile.location.state} - ${profile.location.pincode}`.replace(/^,\s*|,\s*$/g, '').trim() || <Trans>Not set</Trans>
                              : <Trans>Not set</Trans>
                          ) : item.value === 'Not set' ? (
                            <Trans>Not set</Trans>
                          ) : (
                            <Trans>{item.value}</Trans>
                          )}
                        </span>
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
                    <p className="user-account-view__empty-text"><Trans>No</Trans> {section.title.toLowerCase()} <Trans>yet</Trans></p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Mobile View - All Sections */}
        <div className="user-account-view__sections-mobile">
          {sections.map((section) => (
            <div key={section.id} className="user-account-view__section">
              <div className="user-account-view__section-header">
                <section.icon className="user-account-view__section-icon" />
                <h3 className="user-account-view__section-title"><Trans>{section.title}</Trans></h3>
              </div>
              <div className="user-account-view__section-content">
                {section.items.length > 0 ? (
                  section.items.map((item) => (
                    <div key={item.id} className="user-account-view__item">
                      <div className="user-account-view__item-content">
                        <div className="user-account-view__item-label-wrapper">
                          <span className="user-account-view__item-label"><Trans>{item.label}</Trans></span>
                          {item.isDefault && (
                            <span className="user-account-view__item-badge">Default</span>
                          )}
                        </div>
                        <span className="user-account-view__item-value">
                          {item.id === 'history' ? (
                            <>
                              {orders.length} <Trans>orders</Trans>
                            </>
                          ) : item.id === 'change-delivery-address' ? (
                            profile.location?.city && profile.location?.state && profile.location?.pincode
                              ? `${profile.location.address || ''}, ${profile.location.city}, ${profile.location.state} - ${profile.location.pincode}`.replace(/^,\s*|,\s*$/g, '').trim() || <Trans>Not set</Trans>
                              : <Trans>Not set</Trans>
                          ) : item.value === 'Not set' ? (
                            <Trans>Not set</Trans>
                          ) : (
                            <Trans>{item.value}</Trans>
                          )}
                        </span>
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
                    <p className="user-account-view__empty-text"><Trans>No</Trans> {section.title.toLowerCase()} <Trans>yet</Trans></p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

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
              <h3 className="user-account-view__panel-title"><Trans>Support & Help</Trans></h3>
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
                  <h4 className="font-semibold text-[#172022] mb-2"><Trans>Help Center</Trans></h4>
                  <p className="text-sm text-[rgba(26,42,34,0.7)] mb-3">
                    <Trans>Browse FAQs and guides to find answers to common questions.</Trans>
                  </p>
                  <button
                    type="button"
                    className="text-sm text-[#1b8f5b] font-semibold hover:underline"
                  >
                    <Trans>Visit Help Center</Trans> →
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-[rgba(240,245,242,0.4)] border border-[rgba(34,94,65,0.1)]">
                  <h4 className="font-semibold text-[#172022] mb-2"><Trans>Contact Support</Trans></h4>
                  <p className="text-sm text-[rgba(26,42,34,0.7)] mb-2">
                    <strong><Trans>Phone</Trans>:</strong> +91 1800-XXX-XXXX
                  </p>
                  <p className="text-sm text-[rgba(26,42,34,0.7)] mb-3">
                    <strong><Trans>Email</Trans>:</strong> support@irasathi.com
                  </p>
                  <p className="text-sm text-[rgba(26,42,34,0.7)] mb-3">
                    <strong><Trans>Hours</Trans>:</strong> <Trans>Mon-Sat, 9 AM - 6 PM</Trans>
                  </p>
                  <button
                    type="button"
                    className="text-sm text-[#1b8f5b] font-semibold hover:underline"
                  >
                    <Trans>Start Chat</Trans> →
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
              <h3 className="user-account-view__panel-title"><Trans>Report Issue</Trans></h3>
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
                    <Trans>Category</Trans> <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={reportForm.category}
                    onChange={(e) => setReportForm({ ...reportForm, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-white text-sm focus:outline-none focus:border-[#1b8f5b]"
                  >
                    <option value="general"><Trans>General Issue</Trans></option>
                    <option value="payment"><Trans>Payment Issue</Trans></option>
                    <option value="delivery"><Trans>Delivery Issue</Trans></option>
                    <option value="product"><Trans>Product Issue</Trans></option>
                    <option value="account"><Trans>Account Issue</Trans></option>
                    <option value="other"><Trans>Other</Trans></option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                    <Trans>Subject</Trans> <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={reportForm.subject}
                    onChange={(e) => setReportForm({ ...reportForm, subject: e.target.value })}
                    placeholder="Brief description of the issue" // TODO: Translate placeholder
                    className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-white text-sm focus:outline-none focus:border-[#1b8f5b]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                    <Trans>Description</Trans> <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={reportForm.description}
                    onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                    placeholder="Please provide detailed information about the issue" // TODO: Translate placeholder
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
                  <Trans>Submit Report</Trans>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phone Update Panel */}
      {showPhoneUpdatePanel && (
        <div
          className="user-account-view__panel"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPhoneUpdatePanel(false)
              setPhoneUpdateStep(1)
              setCurrentPhoneOTP('')
              setNewPhone('')
              setNewPhoneOTP('')
            }
          }}
        >
          <div className="user-account-view__panel-content">
            <div className="user-account-view__panel-header">
              <h3 className="user-account-view__panel-title"><Trans>Update Phone Number</Trans></h3>
              <button
                type="button"
                onClick={() => {
                  setShowPhoneUpdatePanel(false)
                  setPhoneUpdateStep(1)
                  setCurrentPhoneOTP('')
                  setNewPhone('')
                  setNewPhoneOTP('')
                }}
                className="user-account-view__panel-close"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="user-account-view__panel-body">
              {/* Step 1: Request OTP for current phone */}
              {phoneUpdateStep === 1 && (
              <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[rgba(240,245,242,0.4)] border border-[rgba(34,94,65,0.1)]">
                    <p className="text-sm text-[rgba(26,42,34,0.7)] mb-3">
                      We'll send an OTP to your current phone number <strong>{profile.phone}</strong> to verify your identity.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      // Check authentication
                      if (!authenticated) {
                        if (onShowAuthPrompt) {
                          onShowAuthPrompt('profile')
                        }
                        return
                      }

                      setPhoneUpdateLoading(true)
                      try {
                        const result = await userApi.requestOTPForCurrentPhone()
                        if (result.success) {
                          success('OTP sent to your current phone number')
                          setPhoneUpdateStep(2)
                        } else {
                          showError(result.message || 'Failed to send OTP')
                        }
                      } catch (error) {
                        console.error('Error requesting OTP:', error)
                        showError(error.error?.message || 'Failed to send OTP')
                      } finally {
                        setPhoneUpdateLoading(false)
                      }
                    }}
                    disabled={phoneUpdateLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#1b8f5b] text-white text-sm font-semibold hover:bg-[#2a9d61] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {phoneUpdateLoading ? <Trans>Sending...</Trans> : <Trans>Send OTP to Current Phone</Trans>}
                  </button>
                </div>
              )}

              {/* Step 2: Verify OTP for current phone */}
              {phoneUpdateStep === 2 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[rgba(240,245,242,0.4)] border border-[rgba(34,94,65,0.1)]">
                    <p className="text-sm text-[rgba(26,42,34,0.7)] mb-3">
                      Enter the OTP sent to <strong>{profile.phone}</strong>
                    </p>
                  </div>
                <div>
                  <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                      OTP <span className="text-red-500">*</span>
                  </label>
                    <input
                      type="text"
                      value={currentPhoneOTP}
                      onChange={(e) => setCurrentPhoneOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit OTP" // TODO: Translate placeholder
                      maxLength={6}
                      className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-white text-sm focus:outline-none focus:border-[#1b8f5b]"
                  />
                </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setPhoneUpdateStep(1)}
                      className="flex-1 py-2.5 px-4 rounded-xl border border-[rgba(34,94,65,0.2)] bg-white text-[#1b8f5b] text-sm font-semibold hover:bg-[rgba(240,245,242,0.5)] transition-colors"
                    >
                      <Trans>Back</Trans>
                    </button>
                    <button
                      type="button"
                    onClick={async () => {
                      // Check authentication
                      if (!authenticated) {
                        if (onShowAuthPrompt) {
                          onShowAuthPrompt('profile')
                        }
                        return
                      }

                      if (!currentPhoneOTP || currentPhoneOTP.length !== 6) {
                        showError('Please enter a valid 6-digit OTP')
                        return
                      }
                      setPhoneUpdateLoading(true)
                      try {
                        const result = await userApi.verifyOTPForCurrentPhone({ otp: currentPhoneOTP })
                          if (result.success) {
                            success('Current phone verified successfully')
                            setPhoneUpdateStep(3)
                          } else {
                            showError(result.message || 'Invalid OTP')
                          }
                        } catch (error) {
                          console.error('Error verifying OTP:', error)
                          showError(error.error?.message || 'Invalid OTP')
                        } finally {
                          setPhoneUpdateLoading(false)
                        }
                      }}
                      disabled={phoneUpdateLoading || !currentPhoneOTP || currentPhoneOTP.length !== 6}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-[#1b8f5b] text-white text-sm font-semibold hover:bg-[#2a9d61] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {phoneUpdateLoading ? <Trans>Verifying...</Trans> : <Trans>Verify OTP</Trans>}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Enter new phone number */}
              {phoneUpdateStep === 3 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[rgba(240,245,242,0.4)] border border-[rgba(34,94,65,0.1)]">
                    <p className="text-sm text-[rgba(26,42,34,0.7)] mb-3">
                      Current phone verified! Now enter your new phone number.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                      <Trans>New Phone Number</Trans> <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter new phone number"
                      className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-white text-sm focus:outline-none focus:border-[#1b8f5b]"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setPhoneUpdateStep(2)
                        setNewPhone('')
                      }}
                      className="flex-1 py-2.5 px-4 rounded-xl border border-[rgba(34,94,65,0.2)] bg-white text-[#1b8f5b] text-sm font-semibold hover:bg-[rgba(240,245,242,0.5)] transition-colors"
                    >
                      <Trans>Back</Trans>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                      // Check authentication
                      if (!authenticated) {
                        if (onShowAuthPrompt) {
                          onShowAuthPrompt('profile')
                        }
                        return
                      }

                      if (!newPhone || newPhone.length < 10) {
                        showError('Please enter a valid phone number')
                        return
                      }
                      if (newPhone === profile.phone) {
                        showError('New phone number must be different from current phone number')
                        return
                      }
                      setPhoneUpdateLoading(true)
                      try {
                        const result = await userApi.requestOTPForNewPhone({ newPhone })
                          if (result.success) {
                            success('OTP sent to your new phone number')
                            setPhoneUpdateStep(4)
                          } else {
                            showError(result.message || 'Failed to send OTP')
                          }
                        } catch (error) {
                          console.error('Error requesting OTP:', error)
                          showError(error.error?.message || 'Failed to send OTP')
                        } finally {
                          setPhoneUpdateLoading(false)
                        }
                      }}
                      disabled={phoneUpdateLoading || !newPhone || newPhone.length < 10}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-[#1b8f5b] text-white text-sm font-semibold hover:bg-[#2a9d61] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {phoneUpdateLoading ? <Trans>Sending...</Trans> : <Trans>Send OTP to New Phone</Trans>}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Verify OTP for new phone */}
              {phoneUpdateStep === 4 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[rgba(240,245,242,0.4)] border border-[rgba(34,94,65,0.1)]">
                    <p className="text-sm text-[rgba(26,42,34,0.7)] mb-3">
                      Enter the OTP sent to <strong>{newPhone}</strong>
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                      OTP <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newPhoneOTP}
                      onChange={(e) => setNewPhoneOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit OTP" // TODO: Translate placeholder
                      maxLength={6}
                      className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-white text-sm focus:outline-none focus:border-[#1b8f5b]"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setPhoneUpdateStep(3)
                        setNewPhoneOTP('')
                      }}
                      className="flex-1 py-2.5 px-4 rounded-xl border border-[rgba(34,94,65,0.2)] bg-white text-[#1b8f5b] text-sm font-semibold hover:bg-[rgba(240,245,242,0.5)] transition-colors"
                    >
                      <Trans>Back</Trans>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                      // Check authentication
                      if (!authenticated) {
                        if (onShowAuthPrompt) {
                          onShowAuthPrompt('profile')
                        }
                        return
                      }

                      if (!newPhoneOTP || newPhoneOTP.length !== 6) {
                        showError('Please enter a valid 6-digit OTP')
                        return
                      }
                      setPhoneUpdateLoading(true)
                      try {
                        const result = await userApi.verifyOTPForNewPhone({ otp: newPhoneOTP })
                          if (result.success) {
                            success('Phone number updated successfully')
                            dispatch({
                              type: 'AUTH_LOGIN',
                              payload: { ...profile, phone: result.data?.user?.phone || newPhone },
                            })
                            setShowPhoneUpdatePanel(false)
                            setPhoneUpdateStep(1)
                            setCurrentPhoneOTP('')
                            setNewPhone('')
                            setNewPhoneOTP('')
                          } else {
                            showError(result.message || 'Invalid OTP')
                          }
                        } catch (error) {
                          console.error('Error verifying OTP:', error)
                          showError(error.error?.message || 'Invalid OTP')
                        } finally {
                          setPhoneUpdateLoading(false)
                        }
                      }}
                      disabled={phoneUpdateLoading || !newPhoneOTP || newPhoneOTP.length !== 6}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-[#1b8f5b] text-white text-sm font-semibold hover:bg-[#2a9d61] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {phoneUpdateLoading ? <Trans>Updating...</Trans> : <Trans>Update Phone Number</Trans>}
                    </button>
                </div>
                </div>
              )}
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
              setDeliveryAddressOTPStep(1)
              setDeliveryAddressOTP('')
              setSelectedDeliveryLocation(null)
            }
          }}
        >
          <div className="user-account-view__panel-content">
            <div className="user-account-view__panel-header">
              <h3 className="user-account-view__panel-title"><Trans>Change Delivery Address</Trans></h3>
              <button
                type="button"
                onClick={() => {
                  setShowChangeDeliveryAddressPanel(false)
                  setDeliveryAddressOTPStep(1)
                  setDeliveryAddressOTP('')
                  setSelectedDeliveryLocation(null)
                }}
                className="user-account-view__panel-close"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="user-account-view__panel-body">
              {/* Step 1: Request OTP for current phone */}
              {deliveryAddressOTPStep === 1 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[rgba(240,245,242,0.4)] border border-[rgba(34,94,65,0.1)]">
                    <p className="text-sm text-[rgba(26,42,34,0.7)] mb-3">
                      We'll send an OTP to your registered phone number <strong>{profile.phone}</strong> to verify your identity before updating the delivery address.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      // Check authentication
                      if (!authenticated) {
                        if (onShowAuthPrompt) {
                          onShowAuthPrompt('profile')
                        }
                        return
                      }

                      setDeliveryAddressOTPLoading(true)
                      try {
                        const result = await userApi.requestOTPForCurrentPhone()
                        if (result.success) {
                          success('OTP sent to your registered phone number')
                          setDeliveryAddressOTPStep(2)
                        } else {
                          showError(result.message || 'Failed to send OTP')
                        }
                      } catch (error) {
                        console.error('Error requesting OTP:', error)
                        showError(error.error?.message || 'Failed to send OTP')
                      } finally {
                        setDeliveryAddressOTPLoading(false)
                      }
                    }}
                    disabled={deliveryAddressOTPLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#1b8f5b] text-white text-sm font-semibold hover:bg-[#2a9d61] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deliveryAddressOTPLoading ? <Trans>Sending...</Trans> : <Trans>Send OTP</Trans>}
                  </button>
                </div>
              )}

              {/* Step 2: Verify OTP */}
              {deliveryAddressOTPStep === 2 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[rgba(240,245,242,0.4)] border border-[rgba(34,94,65,0.1)]">
                    <p className="text-sm text-[rgba(26,42,34,0.7)] mb-3">
                      Enter the OTP sent to <strong>{profile.phone}</strong>
                    </p>
                  </div>
                <div>
                  <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                      OTP <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                      value={deliveryAddressOTP}
                      onChange={(e) => setDeliveryAddressOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit OTP" // TODO: Translate placeholder
                    maxLength={6}
                    className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-white text-sm focus:outline-none focus:border-[#1b8f5b]"
                  />
                </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setDeliveryAddressOTPStep(1)}
                      className="flex-1 py-2.5 px-4 rounded-xl border border-[rgba(34,94,65,0.2)] bg-white text-[#1b8f5b] text-sm font-semibold hover:bg-[rgba(240,245,242,0.5)] transition-colors"
                    >
                      <Trans>Back</Trans>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        // Check authentication
                        if (!authenticated) {
                          if (onShowAuthPrompt) {
                            onShowAuthPrompt('profile')
                          }
                          return
                        }

                        if (!deliveryAddressOTP || deliveryAddressOTP.length !== 6) {
                          showError('Please enter a valid 6-digit OTP')
                          return
                        }
                        setDeliveryAddressOTPLoading(true)
                        try {
                          const result = await userApi.verifyOTPForCurrentPhone({ otp: deliveryAddressOTP })
                          if (result.success) {
                            success('Phone verified successfully')
                            setDeliveryAddressOTPStep(3)
                          } else {
                            showError(result.message || 'Invalid OTP')
                          }
                        } catch (error) {
                          console.error('Error verifying OTP:', error)
                          showError(error.error?.message || 'Invalid OTP')
                        } finally {
                          setDeliveryAddressOTPLoading(false)
                        }
                      }}
                      disabled={deliveryAddressOTPLoading || !deliveryAddressOTP || deliveryAddressOTP.length !== 6}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-[#1b8f5b] text-white text-sm font-semibold hover:bg-[#2a9d61] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deliveryAddressOTPLoading ? <Trans>Verifying...</Trans> : <Trans>Verify OTP</Trans>}
                    </button>
              </div>
                </div>
              )}

              {/* Step 3: Select Address from Google Maps */}
              {deliveryAddressOTPStep === 3 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[rgba(240,245,242,0.4)] border border-[rgba(34,94,65,0.1)]">
                    <p className="text-sm text-[rgba(26,42,34,0.7)] mb-3">
                      Phone verified! Now select your delivery address using Google Maps. You can search for an address or use your live location.
                    </p>
                  </div>
                  
                  <GoogleMapsLocationPicker
                    onLocationSelect={(location) => {
                      setSelectedDeliveryLocation(location)
                    }}
                    initialLocation={profile.location ? {
                      address: profile.location.address || '',
                      city: profile.location.city || '',
                      state: profile.location.state || '',
                      pincode: profile.location.pincode || '',
                      coordinates: profile.location.coordinates || null,
                    } : null}
                    required={true}
                    label="Delivery Address"
                  />

                  {selectedDeliveryLocation && (
                    <div className="p-4 rounded-xl bg-[rgba(240,245,242,0.4)] border border-[rgba(34,94,65,0.1)]">
                      <p className="text-xs font-semibold text-[#172022] mb-2">Selected Address:</p>
                      <p className="text-sm text-[rgba(26,42,34,0.7)]">
                        {selectedDeliveryLocation.address}
                      </p>
                      <p className="text-xs text-[rgba(26,42,34,0.6)] mt-1">
                        {selectedDeliveryLocation.city}, {selectedDeliveryLocation.state} - {selectedDeliveryLocation.pincode}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                <button
                  type="button"
                      onClick={() => {
                        setDeliveryAddressOTPStep(2)
                        setSelectedDeliveryLocation(null)
                      }}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-[rgba(34,94,65,0.2)] bg-white text-[#1b8f5b] text-sm font-semibold hover:bg-[rgba(240,245,242,0.5)] transition-colors"
                >
                      <Trans>Back</Trans>
                </button>
                <button
                  type="button"
                  onClick={handleSaveDeliveryAddress}
                      disabled={loading || !selectedDeliveryLocation}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#1b8f5b] text-white text-sm font-semibold hover:bg-[#2a9d61] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Trans>Saving...</Trans> : <Trans>Save Address</Trans>}
                </button>
              </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
