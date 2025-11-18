import { Building2, CheckCircle, XCircle, FileText, MapPin, Phone, Mail } from 'lucide-react'
import { Modal } from './Modal'
import { StatusBadge } from './StatusBadge'
import { cn } from '../../../lib/cn'

export function VendorApprovalModal({ isOpen, onClose, vendor, onApprove, onReject, loading }) {
  if (!vendor) return null

  const handleApprove = () => {
    onApprove(vendor.id)
  }

  const handleReject = () => {
    const reason = window.prompt('Please provide a reason for rejection:')
    if (reason) {
      onReject(vendor.id, { reason })
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Vendor Application Review" size="lg">
      <div className="space-y-6">
        {/* Vendor Information */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{vendor.name}</h3>
                <p className="text-sm text-gray-600">Vendor ID: {vendor.id}</p>
                <div className="mt-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{vendor.region}</span>
                </div>
              </div>
            </div>
            <StatusBadge tone={vendor.status === 'pending' ? 'warning' : 'neutral'}>
              {vendor.status || 'Pending Review'}
            </StatusBadge>
          </div>

          {/* Contact Information */}
          {(vendor.email || vendor.phone) && (
            <div className="mt-4 grid gap-3 border-t border-gray-200 pt-4 sm:grid-cols-2">
              {vendor.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">{vendor.email}</span>
                </div>
              )}
              {vendor.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">{vendor.phone}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Application Details */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-gray-900">Application Details</h4>
          
          {vendor.applicationDate && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs text-gray-500">Application Date</p>
              <p className="text-sm font-semibold text-gray-900">{vendor.applicationDate}</p>
            </div>
          )}

          {vendor.documents && vendor.documents.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="mb-2 text-xs text-gray-500">Submitted Documents</p>
              <div className="space-y-2">
                {vendor.documents.map((doc, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">{doc.name || doc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {vendor.businessDetails && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="mb-2 text-xs text-gray-500">Business Details</p>
              <p className="text-sm text-gray-700">{vendor.businessDetails}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleReject}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-red-300 bg-white px-6 py-3 text-sm font-bold text-red-600 transition-all hover:bg-red-50 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_15px_rgba(34,197,94,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_20px_rgba(34,197,94,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              {loading ? 'Processing...' : 'Approve Vendor'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

