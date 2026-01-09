import { useState } from 'react'
import { useSellerState, useSellerDispatch } from '../../context/SellerContext'
import { useSellerApi } from '../../hooks/useSellerApi'
import { sellerSnapshot } from '../../services/sellerData'
import {
  UserIcon,
  HelpCircleIcon,
  EditIcon,
  XIcon,
  BuildingIcon,
  MapPinIcon,
} from '../../components/icons'
import { cn } from '../../../../lib/cn'
import { useToast } from '../../components/ToastNotification'
import { Trans } from '../../../../components/Trans'
import { TransText } from '../../../../components/TransText'
import { useTranslation } from '../../../../context/TranslationContext'

export function ProfileView({ onLogout, onNavigate }) {
  const { profile } = useSellerState()
  const dispatch = useSellerDispatch()
  const { translate } = useTranslation()
  const { requestNameChange, requestPhoneChange, reportIssue } = useSellerApi()
  const { success, warning, error: showError } = useToast()

  const [showNameChangePanel, setShowNameChangePanel] = useState(false)
  const [showPhoneChangePanel, setShowPhoneChangePanel] = useState(false)
  const [showSupportPanel, setShowSupportPanel] = useState(false)
  const [showReportPanel, setShowReportPanel] = useState(false)

  // Name change request form
  const [nameChangeForm, setNameChangeForm] = useState({
    requestedName: '',
    confirmName: '',
  })

  // Phone change request form
  const [phoneChangeForm, setPhoneChangeForm] = useState({
    requestedPhone: '',
    confirmPhone: '',
  })

  // Report issue form
  const [reportForm, setReportForm] = useState({
    subject: '',
    description: '',
    category: 'general',
  })

  const handleRequestNameChange = async () => {
    if (!nameChangeForm.requestedName.trim()) {
      warning(<Trans>Please enter the new name</Trans>)
      return
    }
    if (nameChangeForm.requestedName.trim() !== nameChangeForm.confirmName.trim()) {
      warning(<Trans>Name confirmation does not match. Please enter the same name in both fields.</Trans>)
      return
    }
    try {
      const result = await requestNameChange({
        requestedName: nameChangeForm.requestedName.trim(),
        description: '',
      })
      if (result && (result.success || (result.data && !result.error))) {
        setNameChangeForm({ requestedName: '', confirmName: '' })
        setShowNameChangePanel(false)
        success(<Trans>Name change request sent to Admin. Kindly wait for the Admin approval.</Trans>)
      } else if (result && result.error) {
        showError(result.error.message || <Trans>Failed to submit name change request</Trans>)
      } else {
        showError(<Trans>Failed to submit name change request. Please try again.</Trans>)
      }
    } catch (err) {
      showError(err.message || <Trans>Failed to submit name change request</Trans>)
    }
  }

  const handleRequestPhoneChange = async () => {
    if (!phoneChangeForm.requestedPhone.trim()) {
      warning(<Trans>Please enter the new phone number</Trans>)
      return
    }
    const phoneRegex = /^[+]?[1-9]\d{9,14}$/
    if (!phoneRegex.test(phoneChangeForm.requestedPhone.trim())) {
      warning(<Trans>Please enter a valid phone number</Trans>)
      return
    }
    if (phoneChangeForm.requestedPhone.trim() !== phoneChangeForm.confirmPhone.trim()) {
      warning(<Trans>Phone confirmation does not match. Please enter the same phone number in both fields.</Trans>)
      return
    }
    try {
      const result = await requestPhoneChange({
        requestedPhone: phoneChangeForm.requestedPhone.trim(),
        description: '',
      })
      if (result && result.success) {
        setPhoneChangeForm({ requestedPhone: '', confirmPhone: '' })
        setShowPhoneChangePanel(false)
        success(<Trans>Phone number change request sent to Admin. Kindly wait for the Admin approval.</Trans>)
      } else if (result && result.error) {
        showError(result.error.message || <Trans>Failed to submit phone change request</Trans>)
      } else {
        showError(<Trans>Failed to submit phone change request. Please try again.</Trans>)
      }
    } catch (err) {
      showError(err.message || <Trans>Failed to submit phone change request</Trans>)
    }
  }

  const handleSubmitReport = async () => {
    if (!reportForm.subject || !reportForm.description) {
      warning(<Trans>Please fill in all fields</Trans>)
      return
    }
    const result = await reportIssue({
      subject: reportForm.subject,
      description: reportForm.description,
      category: reportForm.category,
    })
    if (result.data) {
      success(<Trans>Issue reported successfully! We will get back to you soon.</Trans>)
      setReportForm({ subject: '', description: '', category: 'general' })
      setShowReportPanel(false)
    } else if (result.error) {
      showError(result.error.message || <Trans>Failed to submit report</Trans>)
    }
  }

  const sellerProfile = profile.name ? profile : sellerSnapshot.profile

  const sections = [
    {
      id: 'seller-info',
      title: <Trans>Seller Information</Trans>,
      icon: UserIcon,
      items: [
        {
          id: 'name',
          label: <Trans>Full Name</Trans>,
          value: sellerProfile.name,
          editable: true,
          onEdit: () => setShowNameChangePanel(true),
        },
        {
          id: 'seller-id',
          label: <Trans>Satpura Partner ID</Trans>,
          value: sellerProfile.sellerId || sellerSnapshot.profile.sellerId,
          editable: false,
        },
        {
          id: 'phone',
          label: <Trans>Phone</Trans>,
          value: sellerProfile.phone || sellerSnapshot.profile.phone || <Trans>Not set</Trans>,
          editable: true,
          onEdit: () => setShowPhoneChangePanel(true),
        },
      ],
    },
    {
      id: 'business',
      title: <Trans>Business Details</Trans>,
      icon: BuildingIcon,
      items: [
        {
          id: 'location',
          label: <Trans>Location</Trans>,
          value: sellerProfile.area || sellerSnapshot.profile.area || sellerProfile.location?.city || sellerProfile.location?.state || <Trans>Not set</Trans>,
          editable: false,
        },
        {
          id: 'commission',
          label: <Trans>Commission Rate</Trans>,
          value: sellerProfile.commissionRate || sellerSnapshot.profile.commissionRate || <Trans>Not set</Trans>,
          editable: false,
        },
        {
          id: 'cashback',
          label: <Trans>Cashback Rate</Trans>,
          value: sellerProfile.cashbackRate || sellerSnapshot.profile.cashbackRate || <Trans>Not set</Trans>,
          editable: false,
        },
      ],
    },
    {
      id: 'support',
      title: <Trans>Support & Help</Trans>,
      icon: HelpCircleIcon,
      items: [
        {
          id: 'help',
          label: <Trans>Help Center</Trans>,
          value: <Trans>FAQs & Guides</Trans>,
          action: () => setShowSupportPanel(true),
        },
        {
          id: 'contact',
          label: <Trans>Contact Support</Trans>,
          value: <Trans>Chat or Call</Trans>,
          action: () => setShowSupportPanel(true),
        },
        {
          id: 'report',
          label: <Trans>Report Issue</Trans>,
          value: <Trans>Report a problem</Trans>,
          action: () => setShowReportPanel(true),
        },
      ],
    },
  ]

  return (
    <div className="seller-profile-view space-y-6">
      {/* Profile Header */}
      <div className="seller-profile-view__header">
        <div className="seller-profile-view__header-avatar">
          <UserIcon className="h-12 w-12" />
        </div>
        <div className="seller-profile-view__header-info">
          <h2 className="seller-profile-view__header-name"><TransText>{sellerProfile.name}</TransText></h2>
          <p className="seller-profile-view__header-id"><TransText>Satpura Partner ID: {{ id: sellerProfile.sellerId || sellerSnapshot.profile.sellerId }}</TransText></p>
          <p className="seller-profile-view__header-location">
            <MapPinIcon className="h-4 w-4 inline mr-1" />
            <TransText>{sellerProfile.area || sellerSnapshot.profile.area || sellerProfile.location?.city || sellerProfile.location?.state || 'Location not set'}</TransText>
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="seller-profile-view__sections">
        {sections.map((section) => (
          <div key={section.id} className="seller-profile-view__section">
            <div className="seller-profile-view__section-header">
              <section.icon className="seller-profile-view__section-icon" />
              <h3 className="seller-profile-view__section-title">{section.title}</h3>
            </div>
            <div className="seller-profile-view__section-content">
              {section.items.map((item) => (
                <div key={item.id} className="seller-profile-view__item">
                  <div className="seller-profile-view__item-content">
                    <span className="seller-profile-view__item-label">{item.label}</span>
                    <span className="seller-profile-view__item-value">
                      {typeof item.value === 'string' ? <TransText>{item.value}</TransText> : item.value}
                    </span>
                  </div>
                  <div className="seller-profile-view__item-actions">
                    {item.editable && (
                      <button
                        type="button"
                        className="seller-profile-view__item-edit"
                        onClick={item.onEdit}
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                    )}
                    {item.action && (
                      <button
                        type="button"
                        className="seller-profile-view__item-action"
                        onClick={item.action}
                      >
                        →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Logout Button */}
      <div className="seller-profile-view__logout">
        <button
          type="button"
          onClick={onLogout}
          className="seller-profile-view__logout-button"
        >
          <Trans>Sign Out</Trans>
        </button>
      </div>

      {/* Name Change Request Panel */}
      {showNameChangePanel && (
        <div
          className="seller-profile-view__panel"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowNameChangePanel(false)
              setNameChangeForm({ requestedName: '', confirmName: '' })
            }
          }}
        >
          <div className="seller-profile-view__panel-content">
            <div className="seller-profile-view__panel-header">
              <h3 className="seller-profile-view__panel-title"><Trans>Request Name Change</Trans></h3>
              <button
                type="button"
                onClick={() => {
                  setShowNameChangePanel(false)
                  setNameChangeForm({ requestedName: '', confirmName: '' })
                }}
                className="seller-profile-view__panel-close"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="seller-profile-view__panel-body">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                    <Trans>Current Name</Trans>
                  </label>
                  <input
                    type="text"
                    value={sellerProfile.name}
                    disabled
                    className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-gray-50 text-sm text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                    <Trans>New Name</Trans> <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nameChangeForm.requestedName}
                    onChange={(e) => setNameChangeForm({ ...nameChangeForm, requestedName: e.target.value })}
                    placeholder={translate('Write your suggested name')}
                    className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-white text-sm focus:outline-none focus:border-[#1b8f5b]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                    <Trans>Confirm Name</Trans> <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nameChangeForm.confirmName}
                    onChange={(e) => setNameChangeForm({ ...nameChangeForm, confirmName: e.target.value })}
                    placeholder={translate('Enter the name again to confirm')}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none ${nameChangeForm.confirmName && nameChangeForm.requestedName.trim() !== nameChangeForm.confirmName.trim()
                      ? 'border-red-300 bg-red-50 focus:border-red-500'
                      : 'border-[rgba(34,94,65,0.15)] bg-white focus:border-[#1b8f5b]'
                      }`}
                  />
                  {nameChangeForm.confirmName && nameChangeForm.requestedName.trim() !== nameChangeForm.confirmName.trim() && (
                    <p className="mt-1 text-xs text-red-600"><Trans>Name does not match. Please enter the same name.</Trans></p>
                  )}
                </div>
              </div>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleRequestNameChange}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#1b8f5b] text-white text-sm font-semibold hover:bg-[#2a9d61] transition-colors"
                >
                  <Trans>Submit Request</Trans>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phone Change Request Panel */}
      {showPhoneChangePanel && (
        <div
          className="seller-profile-view__panel"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPhoneChangePanel(false)
              setPhoneChangeForm({ requestedPhone: '', confirmPhone: '' })
            }
          }}
        >
          <div className="seller-profile-view__panel-content">
            <div className="seller-profile-view__panel-header">
              <h3 className="seller-profile-view__panel-title"><Trans>Request Phone Change</Trans></h3>
              <button
                type="button"
                onClick={() => {
                  setShowPhoneChangePanel(false)
                  setPhoneChangeForm({ requestedPhone: '', confirmPhone: '' })
                }}
                className="seller-profile-view__panel-close"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="seller-profile-view__panel-body">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                    <Trans>Current Phone</Trans>
                  </label>
                  <input
                    type="text"
                    value={sellerProfile.phone || translate('Not set')}
                    disabled
                    className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-gray-50 text-sm text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                    <Trans>New Phone Number</Trans> <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phoneChangeForm.requestedPhone}
                    onChange={(e) => setPhoneChangeForm({ ...phoneChangeForm, requestedPhone: e.target.value })}
                    placeholder={translate('Write your suggested phone number to change')}
                    className="w-full px-3 py-2.5 rounded-lg border border-[rgba(34,94,65,0.15)] bg-white text-sm focus:outline-none focus:border-[#1b8f5b]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#172022] mb-1.5">
                    <Trans>Confirm Phone Number</Trans> <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phoneChangeForm.confirmPhone}
                    onChange={(e) => setPhoneChangeForm({ ...phoneChangeForm, confirmPhone: e.target.value })}
                    placeholder={translate('Enter the phone number again to confirm')}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none ${phoneChangeForm.confirmPhone && phoneChangeForm.requestedPhone.trim() !== phoneChangeForm.confirmPhone.trim()
                      ? 'border-red-300 bg-red-50 focus:border-red-500'
                      : 'border-[rgba(34,94,65,0.15)] bg-white focus:border-[#1b8f5b]'
                      }`}
                  />
                  {phoneChangeForm.confirmPhone && phoneChangeForm.requestedPhone.trim() !== phoneChangeForm.confirmPhone.trim() && (
                    <p className="mt-1 text-xs text-red-600"><Trans>Phone number does not match. Please enter the same phone number.</Trans></p>
                  )}
                </div>
              </div>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleRequestPhoneChange}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#1b8f5b] text-white text-sm font-semibold hover:bg-[#2a9d61] transition-colors"
                >
                  <Trans>Submit Request</Trans>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Support Panel */}
      {showSupportPanel && (
        <div
          className="seller-profile-view__panel"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSupportPanel(false)
            }
          }}
        >
          <div className="seller-profile-view__panel-content">
            <div className="seller-profile-view__panel-header">
              <h3 className="seller-profile-view__panel-title"><Trans>Support & Help</Trans></h3>
              <button
                type="button"
                onClick={() => setShowSupportPanel(false)}
                className="seller-profile-view__panel-close"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="seller-profile-view__panel-body">
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
                    <Trans>Visit Help Center →</Trans>
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-[rgba(240,245,242,0.4)] border border-[rgba(34,94,65,0.1)]">
                  <h4 className="font-semibold text-[#172022] mb-2"><Trans>Contact Support</Trans></h4>
                  <p className="text-sm text-[rgba(26,42,34,0.7)] mb-2">
                    <strong><Trans>Phone:</Trans></strong> +91 1800-XXX-XXXX
                  </p>
                  <p className="text-sm text-[rgba(26,42,34,0.7)] mb-3">
                    <strong><Trans>Email:</Trans></strong> support@satpurabio.com
                  </p>
                  <p className="text-sm text-[rgba(26,42,34,0.7)] mb-3">
                    <strong><Trans>Hours:</Trans></strong> <Trans>Mon-Sat, 9 AM - 6 PM</Trans>
                  </p>
                  <button
                    type="button"
                    className="text-sm text-[#1b8f5b] font-semibold hover:underline"
                  >
                    <Trans>Start Chat →</Trans>
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
          className="seller-profile-view__panel"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowReportPanel(false)
              setReportForm({ subject: '', description: '', category: 'general' })
            }
          }}
        >
          <div className="seller-profile-view__panel-content">
            <div className="seller-profile-view__panel-header">
              <h3 className="seller-profile-view__panel-title"><Trans>Report Issue</Trans></h3>
              <button
                type="button"
                onClick={() => {
                  setShowReportPanel(false)
                  setReportForm({ subject: '', description: '', category: 'general' })
                }}
                className="seller-profile-view__panel-close"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="seller-profile-view__panel-body">
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
                    <option value="general">{translate('General Issue')}</option>
                    <option value="commission">{translate('Commission Issue')}</option>
                    <option value="vendor">{translate('Vendor Issue')}</option>
                    <option value="account">{translate('Account Issue')}</option>
                    <option value="other">{translate('Other')}</option>
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
                    placeholder={translate('Brief description of the issue')}
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
                    placeholder={translate('Please provide detailed information about the issue')}
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
    </div>
  )
}
