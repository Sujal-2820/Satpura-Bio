/**
 * Incentive Form Component
 * Dedicated screen for creating and editing purchase incentive schemes
 */

import { useState, useEffect } from 'react'
import { ArrowLeft, Save, AlertCircle, Gift, Smartphone, Ticket, Package, Activity, Clock, ShieldCheck, Info } from 'lucide-react'
import { useAdminApi } from '../hooks/useAdminApi'
import { useToast } from '../components/ToastNotification'

export default function IncentiveForm({ incentiveId, onCancel, onSuccess }) {
    const isEditing = !!incentiveId
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
    const [isLoading, setIsLoading] = useState(isEditing)

    useEffect(() => {
        if (isEditing) {
            fetchIncentive()
        }
    }, [incentiveId])

    const fetchIncentive = async () => {
        setIsLoading(true)
        try {
            const response = await api.getIncentives()
            const incentive = response.data.find(i => i._id === incentiveId)
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
            } else {
                toast.error('Incentive scheme not found')
                onCancel()
            }
        } catch (error) {
            toast.error('Failed to load scheme details')
            onCancel()
        } finally {
            setIsLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSaving(true)

        try {
            if (isEditing) {
                await api.updateIncentive(incentiveId, formData)
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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header with Back Button */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onCancel}
                        className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm group"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                            <Gift className="w-6 h-6 text-purple-600" />
                            {isEditing ? 'Edit Reward Scheme' : 'Launch New Scheme'}
                        </h1>
                        <p className="text-sm text-gray-500 font-medium italic">
                            {isEditing ? `Modifying ${formData.title}` : 'Design a new motivation milestone for your vendors'}
                        </p>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-3">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 uppercase tracking-wider"
                    >
                        Discard
                    </button>
                    <button
                        disabled={isSaving}
                        onClick={handleSubmit}
                        className="flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-purple-200 hover:shadow-purple-300 transition-all disabled:opacity-50"
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        {isEditing ? 'UPDATE SCHEME' : 'LAUNCH SCHEME'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Configuration */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Details */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700 uppercase tracking-tight">Scheme Title</label>
                            <input
                                required
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none transition-all font-bold text-lg"
                                placeholder="E.g. Lakhpati Vendor Rewards"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700 uppercase tracking-tight">Public Description</label>
                            <textarea
                                rows={3}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none transition-all resize-none font-medium"
                                placeholder="Explain what the vendor earns and how..."
                            />
                        </div>
                    </div>

                    {/* Reward Selection */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                        <label className="text-sm font-bold text-gray-700 uppercase tracking-tight block">Choose Reward Type</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {rewardTypes.map((type) => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, rewardType: type.id })}
                                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${formData.rewardType === type.id
                                        ? `border-purple-600 ${type.bg}`
                                        : 'border-gray-50 bg-gray-50 hover:border-gray-200'
                                        }`}
                                >
                                    <div className={`p-2 rounded-lg ${formData.rewardType === type.id ? 'bg-white shadow-sm' : 'bg-gray-100'}`}>
                                        <type.icon className={`w-5 h-5 ${formData.rewardType === type.id ? type.color : 'text-gray-400'}`} />
                                    </div>
                                    <span className={`text-xs font-black leading-tight uppercase tracking-tight ${formData.rewardType === type.id ? 'text-purple-900' : 'text-gray-500'}`}>
                                        {type.label}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Value / Item Name</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.rewardValue}
                                    onChange={(e) => setFormData({ ...formData, rewardValue: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all outline-none font-bold text-purple-600"
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
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all outline-none font-bold"
                                    placeholder={formData.rewardType === 'voucher' ? '₹' : '1 Unit'}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Eligibility Rules */}
                    <div className="bg-gradient-to-br from-purple-900 to-indigo-900 p-8 rounded-3xl shadow-xl shadow-purple-200 text-white space-y-6">
                        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                            <div className="p-2 bg-white/10 rounded-lg">
                                <AlertCircle className="w-5 h-5 text-purple-200" />
                            </div>
                            <h3 className="text-lg font-bold">Eligibility & Thresholds</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-purple-200 uppercase tracking-widest">Target Purchase (₹)</label>
                                <input
                                    required
                                    type="number"
                                    value={formData.minPurchaseAmount}
                                    onChange={(e) => setFormData({ ...formData, minPurchaseAmount: Number(e.target.value) })}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-white focus:bg-white/20 outline-none transition-all font-black text-xl text-white"
                                />
                                <p className="text-[10px] text-purple-300 font-medium">Minimum order value to qualify</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-purple-200 uppercase tracking-widest">Limit Per Vendor</label>
                                <input
                                    required
                                    type="number"
                                    value={formData.conditions.maxRedemptionsPerVendor}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        conditions: { ...formData.conditions, maxRedemptionsPerVendor: Number(e.target.value) }
                                    })}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-white focus:bg-white/20 outline-none transition-all font-black text-xl text-white"
                                />
                                <p className="text-[10px] text-purple-300 font-medium">Times a vendor can claim this</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Parameters & Status */}
                <div className="space-y-6">
                    {/* Status & Validity */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                        <div className="space-y-4">
                            <label className="flex items-center justify-between cursor-pointer group">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-gray-400" />
                                    <span className="text-xs font-black text-gray-700 uppercase">Require Admin Review</span>
                                </div>
                                <div className={`w-10 h-6 rounded-full p-1 transition-all ${formData.conditions.requiresApproval ? 'bg-amber-500 shadow-md shadow-amber-100' : 'bg-gray-200'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${formData.conditions.requiresApproval ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={formData.conditions.requiresApproval}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        conditions: { ...formData.conditions, requiresApproval: e.target.checked }
                                    })}
                                />
                            </label>

                            <label className="flex items-center justify-between cursor-pointer group">
                                <div className="flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-gray-400" />
                                    <span className="text-xs font-black text-gray-700 uppercase">Status: Active</span>
                                </div>
                                <div className={`w-10 h-6 rounded-full p-1 transition-all ${formData.isActive ? 'bg-green-500 shadow-md shadow-green-100' : 'bg-gray-200'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${formData.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                />
                            </label>
                        </div>

                        <div className="pt-6 border-t border-gray-50 space-y-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                                    <label className="text-xs font-black text-gray-700 uppercase">Valid From</label>
                                </div>
                                <input
                                    type="date"
                                    value={formData.validFrom}
                                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none font-bold text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                                    <label className="text-xs font-black text-gray-700 uppercase">Valid Until</label>
                                </div>
                                <input
                                    type="date"
                                    value={formData.validUntil}
                                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none font-bold text-sm"
                                    placeholder="Optional"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Preview Info */}
                    <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100 border-dashed">
                        <h4 className="text-xs font-black text-purple-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            Strategy Info
                        </h4>
                        <p className="text-[11px] text-purple-700 font-medium italic leading-relaxed">
                            Schemes will automatically appear for eligible vendors on their reward dashboard. Vendors will receive a push notification when they hit the target threshold.
                        </p>
                    </div>

                    <div className="block md:hidden">
                        <button
                            disabled={isSaving}
                            onClick={handleSubmit}
                            className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-200 transition-all disabled:opacity-50"
                        >
                            <Save className="w-5 h-5" />
                            SAVE SCHEME
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
