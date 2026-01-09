/**
 * Credit Summary Widget
 * 
 * Dashboard widget showing vendor's credit overview:
 * - Credit limit, used, available
 * - Credit score (0-100)
 * - Performance tier
 * - Quick stats
 * - Quick link to repayment calculator
 */

import { Wallet, TrendingUp, Award, Clock, DollarSign, Calculator, ChevronRight } from 'lucide-react'

export function CreditSummaryWidget({ creditData, onNavigateToCalculator }) {
    // Mock data - replace with actual API data
    const data = creditData || {
        creditLimit: 200000,
        creditUsed: 50000,
        creditAvailable: 150000,
        creditScore: 92,
        performanceTier: 'Platinum',
        stats: {
            totalDiscountsEarned: 12000,
            totalInterestPaid: 500,
            avgRepaymentDays: 25,
            onTimeRate: 90
        },
        outstandingPurchases: 1
    }

    const creditUtilization = (data.creditUsed / data.creditLimit) * 100

    const getTierColor = (tier) => {
        switch (tier) {
            case 'Platinum': return 'from-purple-500 to-purple-700'
            case 'Gold': return 'from-yellow-500 to-yellow-700'
            case 'Silver': return 'from-gray-400 to-gray-600'
            case 'Bronze': return 'from-orange-600 to-orange-800'
            default: return 'from-gray-500 to-gray-700'
        }
    }

    const getScoreColor = (score) => {
        if (score >= 90) return 'text-green-600'
        if (score >= 75) return 'text-blue-600'
        if (score >= 60) return 'text-yellow-600'
        return 'text-red-600'
    }

    const formatCurrency = (amount) => `₹${amount.toLocaleString('en-IN')}`

    return (
        <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-white font-bold text-lg flex items-center gap-2">
                            <Wallet className="w-5 h-5" />
                            Your Credit Summary
                        </h3>
                        <p className="text-blue-100 text-sm mt-1">
                            Track your credit usage and performance
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Credit Limit Overview */}
                <div>
                    <div className="flex justify-between items-baseline mb-2">
                        <span className="text-sm text-gray-600">Credit Limit</span>
                        <span className="text-2xl font-bold text-gray-900">{formatCurrency(data.creditLimit)}</span>
                    </div>
                    <div className="flex justify-between items-baseline mb-3">
                        <span className="text-sm text-gray-600">Credit Used</span>
                        <span className="text-lg font-semibold text-red-600">{formatCurrency(data.creditUsed)}</span>
                    </div>
                    <div className="flex justify-between items-baseline mb-2">
                        <span className="text-sm font-medium text-gray-700">Credit Available</span>
                        <span className="text-xl font-bold text-green-600">{formatCurrency(data.creditAvailable)}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Utilization</span>
                            <span>{creditUtilization.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${creditUtilization >= 80
                                        ? 'bg-red-500'
                                        : creditUtilization >= 60
                                            ? 'bg-yellow-500'
                                            : 'bg-green-500'
                                    }`}
                                style={{ width: `${Math.min(creditUtilization, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Credit Score & Performance Tier */}
                <div className="border-t pt-6">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Credit Score */}
                        <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <TrendingUp className="w-5 h-5 text-blue-600" />
                                <span className="text-sm font-medium text-gray-700">Credit Score</span>
                            </div>
                            <div className={`text-4xl font-bold ${getScoreColor(data.creditScore)}`}>
                                {data.creditScore}
                                <span className="text-lg text-gray-500">/100</span>
                            </div>
                            <div className="mt-2 flex justify-center">
                                {[...Array(10)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1 w-3 mx-0.5 rounded-full ${i < Math.floor(data.creditScore / 10)
                                                ? data.creditScore >= 90
                                                    ? 'bg-green-500'
                                                    : data.creditScore >= 75
                                                        ? 'bg-blue-500'
                                                        : data.creditScore >= 60
                                                            ? 'bg-yellow-500'
                                                            : 'bg-red-500'
                                                : 'bg-gray-300'
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Performance Tier */}
                        <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Award className="w-5 h-5 text-purple-600" />
                                <span className="text-sm font-medium text-gray-700">Performance Tier</span>
                            </div>
                            <div className={`inline-block px-4 py-2 rounded-full bg-gradient-to-r ${getTierColor(data.performanceTier)} text-white font-bold text-lg shadow-md`}>
                                {data.performanceTier}
                            </div>
                            <p className="text-xs text-gray-600 mt-2">
                                {data.performanceTier === 'Platinum' && 'Elite performance!'}
                                {data.performanceTier === 'Gold' && 'Great track record'}
                                {data.performanceTier === 'Silver' && 'Good performance'}
                                {data.performanceTier === 'Bronze' && 'Keep improving'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Performance Stats */}
                <div className="border-t pt-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Performance Stats
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <TrendingUp className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-600">Total Discounts</p>
                                <p className="font-bold text-green-600">{formatCurrency(data.stats.totalDiscountsEarned)}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <TrendingUp className="w-4 h-4 text-red-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-600">Total Interest</p>
                                <p className="font-bold text-red-600">{formatCurrency(data.stats.totalInterestPaid)}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Clock className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-600">Avg Repayment</p>
                                <p className="font-bold text-blue-600">{data.stats.avgRepaymentDays} days</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Award className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-600">On-time Rate</p>
                                <p className="font-bold text-purple-600">{data.stats.onTimeRate}%</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Outstanding Purchases Alert */}
                {data.outstandingPurchases > 0 && (
                    <div className="border-t pt-6">
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-yellow-100 rounded-lg">
                                    <Clock className="w-5 h-5 text-yellow-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-yellow-900">
                                        {data.outstandingPurchases} Outstanding Purchase{data.outstandingPurchases > 1 ? 's' : ''}
                                    </p>
                                    <p className="text-sm text-yellow-700 mt-1">
                                        You have pending repayments. Pay early to earn discounts!
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Quick Action */}
                <div className="border-t pt-6">
                    <button
                        onClick={onNavigateToCalculator}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg"
                    >
                        <div className="flex items-center gap-3">
                            <Calculator className="w-5 h-5" />
                            <span className="font-semibold">Calculate Repayment</span>
                        </div>
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    )
}

export default CreditSummaryWidget
