/**
 * Incentive Form Modal
 * Modal for creating and editing purchase incentive schemes
 * 
 * NEW COMPONENT - Phase 6: Incentive System
 */

import { useState, useEffect } from 'react'
import { X, Save, AlertCircle, Info, Gift, Smartphone, Ticket, Package, Activity } from 'lucide-react'
import { useAdminApi } from '../hooks/useAdminApi'
import { useToast } from '../components/ToastNotification'

export default function IncentiveFormModal({ incentive, onClose, onSuccess }) {
    const isEditing = !!incentive
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        rewardType: 'voucher',
        rewardValue: '',
        rewardUnit: '',
        minPurchaseAmount: 50000,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: '',
        isActive: true,
        conditions: {
            requiresOrderCount: 0,
            maxRedemptionsPerVendor: 1,
            requiresApproval: true
        }
    })

    const api = useAdminApi()
    const toast = useToast()
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (incentive) {
            setFormData({
                ...formData,
                ...incentive,
                validFrom: incentive.validFrom ? new Date(incentive.validFrom).toISOString().split('T')[0] : '',
                validUntil: incentive.validUntil ? new Date(incentive.validUntil).toISOString().split('T')[0] : '',
                conditions: {
                    ...formData.conditions,
                    ...incentive.conditions
                }
            })
        }
    }, [incentive])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSaving(true)

        try {
            if (isEditing) {
                await api.updateIncentive(incentive._id, formData)
                toast.success('Incentive updated successfully')
            } else {
                await api.createIncentive(formData)
                toast.success('New incentive scheme created')
            }
            onSuccess()
        } catch (error) {
            toast.error(error.message || 'Failed to save incentive')
        } finally {
            setIsSaving(false)
        }
    }

    const rewardTypes = [
        { id: 'voucher', label: 'Cash Voucher', icon: Ticket, color: 'text-amber-600', bg: 'bg-amber-50' },
        { id: 'gym_membership', label: 'Gym/Club Membership', icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
        { id: 'smartwatch', label: 'Smartwatch', icon: Smartphone, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { id: 'smartphone', label: 'Smartphone', icon: Smartphone, color: 'text-cyan-600', bg: 'bg-cyan-50' },
        { id: 'vacation', label: 'Vacation Package', icon: Gift, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { id: 'gift_hamper', label: 'Gift Hamper', icon: Package, color: 'text-pink-600', bg: 'bg-pink-50' },
    ]

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-600 text-white rounded-lg">
                            <Gift className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{isEditing ? 'Edit Scheme' : 'New Incentive Scheme'}</h2>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Configure rewarding milestones</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 space-y-1">
                            <label className="text-sm font-bold text-gray-700">Scheme Title</label>
                            <input
                                required
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                                placeholder="E.g. Diwali Mega Stock Reward"
                            />
                        </div>
                        <div className="col-span-2 space-y-1">
                            <label className="text-sm font-bold text-gray-700">Description</label>
                            <textarea
                                required
                                rows={2}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none resize-none"
                                placeholder="Briefly explain what the vendor needs to do to get this reward."
                            />
                        </div>
                    </div>

                    {/* Reward Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-gray-700">Reward Type & Value</label>
                        <div className="grid grid-cols-3 gap-2">
                            {rewardTypes.map((type) => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, rewardType: type.id })}
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${formData.rewardType === type.id
                                            ? `border-purple-600 ${type.bg}`
                                            : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                                        }`}
                                >
                                    <type.icon className={`w-5 h-5 mb-1 ${formData.rewardType === type.id ? type.color : 'text-gray-400'}`} />
                                    <span className={`text-[10px] font-bold text-center leading-tight ${formData.rewardType === type.id ? 'text-purple-700' : 'text-gray-500'}`}>
                                        {type.label.toUpperCase()}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Value / Item Name</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.rewardValue}
                                    onChange={(e) => setFormData({ ...formData, rewardValue: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                                    placeholder={formData.rewardType === 'voucher' ? '5000' : 'Fitbit Versa 4'}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Unit / Detail</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.rewardUnit}
                                    onChange={(e) => setFormData({ ...formData, rewardUnit: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                                    placeholder={formData.rewardType === 'voucher' ? '₹' : '1 Unit'}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Thresholds & Rules */}
                    <div className="p-4 bg-purple-50 rounded-2xl space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-4 h-4 text-purple-600" />
                            <h3 className="text-sm font-bold text-purple-900">Eligibility Rules</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-purple-700 uppercase italic">Min. Purchase Amount (₹)</label>
                                <input
                                    required
                                    type="number"
                                    min="1"
                                    value={formData.minPurchaseAmount}
                                    onChange={(e) => setFormData({ ...formData, minPurchaseAmount: Number(e.target.value) })}
                                    className="w-full px-4 py-2 bg-white border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-purple-700 uppercase italic">Max Redemptions / Vendor</label>
                                <input
                                    required
                                    type="number"
                                    min="1"
                                    value={formData.conditions.maxRedemptionsPerVendor}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        conditions: { ...formData.conditions, maxRedemptionsPerVendor: Number(e.target.value) }
                                    })}
                                    className="w-full px-4 py-2 bg-white border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-6 pt-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.conditions.requiresApproval}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        conditions: { ...formData.conditions, requiresApproval: e.target.checked }
                                    })}
                                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-xs font-medium text-gray-700 uppercase">Requires Manual Approval</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-xs font-medium text-gray-700 uppercase">Active Immediately</span>
                            </label>
                        </div>
                    </div>

                    {/* Validity */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700">Valid From</label>
                            <input
                                type="date"
                                value={formData.validFrom}
                                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700">Valid Until (Optional)</label>
                            <input
                                type="date"
                                value={formData.validUntil}
                                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                            />
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 uppercase tracking-wider"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={isSaving}
                        onClick={handleSubmit}
                        className="flex items-center gap-2 px-8 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors shadow-lg shadow-purple-100 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        <span className="font-bold uppercase tracking-wider">{isEditing ? 'Update Plan' : 'Launch Scheme'}</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
