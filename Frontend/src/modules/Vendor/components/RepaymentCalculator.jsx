/**
 * Vendor Repayment Calculator Component
 * 
 * Allows vendors to:
 * - Select a pending purchase
 * - Choose repayment date
 * - See real-time calculation (discount/interest/neutral)
 * - View detailed breakdown
 * - Submit repayment
 */

import { useState, useEffect } from 'react'
import { Calendar, Calculator, TrendingDown, TrendingUp, DollarSign, Info, CheckCircle, Loader, ArrowRight } from 'lucide-react'

export function RepaymentCalculator({ vendorApi, onSuccess }) {
    const [purchases, setPurchases] = useState([])
    const [selectedPurchase, setSelectedPurchase] = useState(null)
    const [repaymentDate, setRepaymentDate] = useState(new Date().toISOString().split('T')[0])
    const [calculation, setCalculation] = useState(null)
    const [projection, setProjection] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showProjection, setShowProjection] = useState(false)

    // Load pending purchases on mount
    useEffect(() => {
        loadPendingPurchases()
    }, [])

    const loadPendingPurchases = async () => {
        try {
            // This would call vendor API to get pending purchases
            // For now, using mock data
            const mockPurchases = [
                {
                    _id: '1',
                    purchaseOrderId: 'PUR-20260101-0001',
                    totalAmount: 100000,
                    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
                    status: 'approved',
                    products: [{ name: 'Micro Nutrient Mix', quantity: 100 }]
                },
                {
                    _id: '2',
                    purchaseOrderId: 'PUR-20260105-0002',
                    totalAmount: 50000,
                    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                    status: 'approved',
                    products: [{ name: 'NPK Fertilizer', quantity: 50 }]
                }
            ]
            setPurchases(mockPurchases)
        } catch (error) {
            console.error('Failed to load purchases:', error)
        }
    }

    const handleCalculate = async () => {
        if (!selectedPurchase) {
            alert('Please select a purchase')
            return
        }

        setIsLoading(true)
        try {
            // Calculate repayment amount
            const calcData = {
                purchaseId: selectedPurchase._id,
                repaymentDate: new Date(repaymentDate).toISOString()
            }

            // Mock calculation - replace with actual API call
            const daysElapsed = Math.floor(
                (new Date(repaymentDate) - new Date(selectedPurchase.createdAt)) / (1000 * 60 * 60 * 24)
            )

            let discountRate = 0
            let interestRate = 0
            let tierType = 'neutral'

            if (daysElapsed <= 30) {
                discountRate = 10
                tierType = 'discount'
            } else if (daysElapsed <= 40) {
                discountRate = 6
                tierType = 'discount'
            } else if (daysElapsed <= 60) {
                discountRate = 4
                tierType = 'discount'
            } else if (daysElapsed <= 90) {
                discountRate = 2
                tierType = 'discount'
            } else if (daysElapsed >= 105 && daysElapsed <= 120) {
                interestRate = 5
                tierType = 'interest'
            } else if (daysElapsed > 120) {
                interestRate = 10
                tierType = 'interest'
            }

            const baseAmount = selectedPurchase.totalAmount
            const discountAmount = (baseAmount * discountRate) / 100
            const interestAmount = (baseAmount * interestRate) / 100
            const finalPayable = tierType === 'discount'
                ? baseAmount - discountAmount
                : tierType === 'interest'
                    ? baseAmount + interestAmount
                    : baseAmount

            const mockCalc = {
                purchaseId: selectedPurchase._id,
                baseAmount,
                daysElapsed,
                tierType,
                discountRate,
                interestRate,
                discountAmount,
                interestAmount,
                finalPayable,
                tierApplied: tierType === 'discount'
                    ? `${daysElapsed <= 30 ? '0-30' : daysElapsed <= 40 ? '30-40' : daysElapsed <= 60 ? '40-60' : '60-90'} Days (${discountRate}% Discount)`
                    : tierType === 'interest'
                        ? `${daysElapsed <= 120 ? '105-120' : '120+'} Days (${interestRate}% Interest)`
                        : '90-105 Days (Neutral Zone)'
            }

            setCalculation(mockCalc)
        } catch (error) {
            console.error('Calculation failed:', error)
            alert('Failed to calculate repayment amount')
        } finally {
            setIsLoading(false)
        }
    }

    const handleViewProjection = async () => {
        if (!selectedPurchase) return

        setIsLoading(true)
        try {
            // Mock projection data - replace with actual API call
            const projections = []
            const baseAmount = selectedPurchase.totalAmount
            const purchaseDate = new Date(selectedPurchase.createdAt)

            for (let day of [15, 30, 35, 40, 50, 60, 75, 90, 95, 105, 110, 120, 130, 150]) {
                const targetDate = new Date(purchaseDate)
                targetDate.setDate(targetDate.getDate() + day)

                let discountRate = 0
                let interestRate = 0
                let tierType = 'neutral'

                if (day <= 30) {
                    discountRate = 10
                    tierType = 'discount'
                } else if (day <= 40) {
                    discountRate = 6
                    tierType = 'discount'
                } else if (day <= 60) {
                    discountRate = 4
                    tierType = 'discount'
                } else if (day <= 90) {
                    discountRate = 2
                    tierType = 'discount'
                } else if (day >= 105 && day <= 120) {
                    interestRate = 5
                    tierType = 'interest'
                } else if (day > 120) {
                    interestRate = 10
                    tierType = 'interest'
                }

                const amount = tierType === 'discount'
                    ? baseAmount - (baseAmount * discountRate / 100)
                    : tierType === 'interest'
                        ? baseAmount + (baseAmount * interestRate / 100)
                        : baseAmount

                projections.push({
                    day,
                    date: targetDate.toISOString().split('T')[0],
                    tierType,
                    rate: discountRate || interestRate,
                    amount,
                    savings: tierType === 'discount' ? (baseAmount * discountRate / 100) : 0,
                    penalty: tierType === 'interest' ? (baseAmount * interestRate / 100) : 0
                })
            }

            setProjection(projections)
            setShowProjection(true)
        } catch (error) {
            console.error('Failed to load projection:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSubmitRepayment = async () => {
        if (!calculation) {
            alert('Please calculate repayment amount first')
            return
        }

        if (!confirm(`Confirm repayment of ₹${calculation.finalPayable.toLocaleString('en-IN')}?`)) {
            return
        }

        setIsSubmitting(true)
        try {
            // Submit repayment - replace with actual API call
            console.log('Submitting repayment:', {
                purchaseId: selectedPurchase._id,
                amount: calculation.finalPayable,
                repaymentDate
            })

            alert('Repayment submitted successfully!')
            if (onSuccess) onSuccess()
        } catch (error) {
            console.error('Submission failed:', error)
            alert('Failed to submit repayment')
        } finally {
            setIsSubmitting(false)
        }
    }

    const formatCurrency = (amount) => `₹${amount.toLocaleString('en-IN')}`

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Calculator className="w-6 h-6 text-blue-600" />
                    Repayment Calculator
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                    Calculate your repayment amount and see potential savings or charges
                </p>
            </div>

            {/* Purchase Selection */}
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Pending Purchase
                </label>
                <select
                    value={selectedPurchase?._id || ''}
                    onChange={(e) => {
                        const purchase = purchases.find(p => p._id === e.target.value)
                        setSelectedPurchase(purchase)
                        setCalculation(null)
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">-- Select a purchase --</option>
                    {purchases.map(purchase => (
                        <option key={purchase._id} value={purchase._id}>
                            {purchase.purchaseOrderId} - {formatCurrency(purchase.totalAmount)}
                            ({new Date(purchase.createdAt).toLocaleDateString('en-IN')})
                        </option>
                    ))}
                </select>

                {selectedPurchase && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-600">Order ID</p>
                                <p className="font-semibold text-gray-900">{selectedPurchase.purchaseOrderId}</p>
                            </div>
                            <div>
                                <p className="text-gray-600">Amount</p>
                                <p className="font-semibold text-gray-900">{formatCurrency(selectedPurchase.totalAmount)}</p>
                            </div>
                            <div>
                                <p className="text-gray-600">Purchase Date</p>
                                <p className="font-semibold text-gray-900">
                                    {new Date(selectedPurchase.createdAt).toLocaleDateString('en-IN')}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-600">Status</p>
                                <p className="font-semibold text-green-600 capitalize">{selectedPurchase.status}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Repayment Date Selection */}
            {selectedPurchase && (
                <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Repayment Date
                    </label>
                    <div className="flex gap-4">
                        <input
                            type="date"
                            value={repaymentDate}
                            onChange={(e) => {
                                setRepaymentDate(e.target.value)
                                setCalculation(null)
                            }}
                            min={new Date(selectedPurchase.createdAt).toISOString().split('T')[0]}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={handleCalculate}
                            disabled={isLoading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    Calculating...
                                </>
                            ) : (
                                <>
                                    <Calculator className="w-4 h-4" />
                                    Calculate
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Calculation Result */}
            {calculation && (
                <div className={`rounded-lg border-2 p-6 ${calculation.tierType === 'discount'
                        ? 'bg-green-50 border-green-200'
                        : calculation.tierType === 'interest'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-gray-50 border-gray-200'
                    }`}>
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                {calculation.tierType === 'discount' && <TrendingDown className="w-5 h-5 text-green-600" />}
                                {calculation.tierType === 'interest' && <TrendingUp className="w-5 h-5 text-red-600" />}
                                {calculation.tierType === 'neutral' && <DollarSign className="w-5 h-5 text-gray-600" />}
                                Repayment Calculation
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Days Elapsed: <span className="font-semibold">{calculation.daysElapsed} days</span>
                            </p>
                            <p className="text-sm text-gray-600">
                                Tier Applied: <span className="font-semibold">{calculation.tierApplied}</span>
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between text-gray-700">
                            <span>Base Amount:</span>
                            <span className="font-semibold">{formatCurrency(calculation.baseAmount)}</span>
                        </div>

                        {calculation.tierType === 'discount' && (
                            <div className="flex justify-between text-green-700">
                                <span>Discount ({calculation.discountRate}%):</span>
                                <span className="font-semibold">-{formatCurrency(calculation.discountAmount)}</span>
                            </div>
                        )}

                        {calculation.tierType === 'interest' && (
                            <div className="flex justify-between text-red-700">
                                <span>Interest ({calculation.interestRate}%):</span>
                                <span className="font-semibold">+{formatCurrency(calculation.interestAmount)}</span>
                            </div>
                        )}

                        <div className="border-t-2 border-gray-300 pt-3 flex justify-between text-lg font-bold">
                            <span>Final Payable:</span>
                            <span className={
                                calculation.tierType === 'discount'
                                    ? 'text-green-600'
                                    : calculation.tierType === 'interest'
                                        ? 'text-red-600'
                                        : 'text-gray-900'
                            }>
                                {formatCurrency(calculation.finalPayable)}
                            </span>
                        </div>

                        {calculation.tierType === 'discount' && (
                            <div className="p-3 bg-green-100 rounded-lg flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                <p className="text-sm text-green-800">
                                    <strong>You save {formatCurrency(calculation.discountAmount)}!</strong> Great job on early repayment.
                                </p>
                            </div>
                        )}

                        {calculation.tierType === 'interest' && (
                            <div className="p-3 bg-red-100 rounded-lg flex items-center gap-2">
                                <Info className="w-5 h-5 text-red-600 flex-shrink-0" />
                                <p className="text-sm text-red-800">
                                    <strong>Additional {formatCurrency(calculation.interestAmount)} charged.</strong> Consider paying earlier next time.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex gap-3">
                        <button
                            onClick={handleViewProjection}
                            className="flex-1 px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                        >
                            <Calendar className="w-4 h-4" />
                            View Full Projection
                        </button>
                        <button
                            onClick={handleSubmitRepayment}
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    Submit Repayment
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Projection Modal */}
            {showProjection && projection && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-900">14-Point Repayment Schedule</h3>
                            <button
                                onClick={() => setShowProjection(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b-2">
                                            <th className="text-left py-3 px-2 text-sm font-semibold">Day</th>
                                            <th className="text-left py-3 px-2 text-sm font-semibold">Date</th>
                                            <th className="text-left py-3 px-2 text-sm font-semibold">Type</th>
                                            <th className="text-right py-3 px-2 text-sm font-semibold">Rate</th>
                                            <th className="text-right py-3 px-2 text-sm font-semibold">Amount</th>
                                            <th className="text-right py-3 px-2 text-sm font-semibold">Impact</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {projection.map((point, idx) => (
                                            <tr
                                                key={idx}
                                                className={`border-b ${point.tierType === 'discount'
                                                        ? 'bg-green-50'
                                                        : point.tierType === 'interest'
                                                            ? 'bg-red-50'
                                                            : 'bg-gray-50'
                                                    }`}
                                            >
                                                <td className="py-3 px-2 text-sm font-medium">{point.day}</td>
                                                <td className="py-3 px-2 text-sm">{new Date(point.date).toLocaleDateString('en-IN')}</td>
                                                <td className="py-3 px-2 text-sm">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${point.tierType === 'discount'
                                                            ? 'bg-green-200 text-green-800'
                                                            : point.tierType === 'interest'
                                                                ? 'bg-red-200 text-red-800'
                                                                : 'bg-gray-200 text-gray-800'
                                                        }`}>
                                                        {point.tierType === 'discount' ? 'Discount' : point.tierType === 'interest' ? 'Interest' : 'Neutral'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-2 text-sm text-right font-semibold">{point.rate}%</td>
                                                <td className="py-3 px-2 text-sm text-right font-bold">{formatCurrency(point.amount)}</td>
                                                <td className="py-3 px-2 text-sm text-right">
                                                    {point.savings > 0 && (
                                                        <span className="text-green-600 font-semibold">
                                                            Save {formatCurrency(point.savings)}
                                                        </span>
                                                    )}
                                                    {point.penalty > 0 && (
                                                        <span className="text-red-600 font-semibold">
                                                            +{formatCurrency(point.penalty)}
                                                        </span>
                                                    )}
                                                    {point.savings === 0 && point.penalty === 0 && (
                                                        <span className="text-gray-500">--</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    <strong>💡 Tip:</strong> Pay within 30 days to maximize your savings!
                                    The earlier you pay, the more you save.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default RepaymentCalculator
