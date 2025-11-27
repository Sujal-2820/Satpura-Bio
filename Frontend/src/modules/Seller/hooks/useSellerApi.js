/**
 * Custom hook for Seller API integration
 * Provides easy access to API functions with loading states and error handling
 */

import { useState, useCallback } from 'react'
import { useSellerDispatch } from '../context/SellerContext'
import * as sellerApi from '../services/sellerApi'

export function useSellerApi() {
  const dispatch = useSellerDispatch()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleApiCall = useCallback(
    async (apiFunction, successAction, errorMessage) => {
      setLoading(true)
      setError(null)
      try {
        const result = await apiFunction()
        // Extract data from response: { success: true, data: {...} } -> {...}
        const responseData = result.success ? result.data : null
        
        if (result.success && successAction && responseData) {
          dispatch(successAction(responseData))
        } else if (!result.success) {
          const errorMsg = result.error?.message || errorMessage || 'An error occurred'
          setError(errorMsg)
        }
        
        return { data: responseData, error: result.error || null }
      } catch (err) {
        const errorMsg = errorMessage || err.message || 'An error occurred'
        setError(errorMsg)
        return { data: null, error: { message: errorMsg } }
      } finally {
        setLoading(false)
      }
    },
    [dispatch],
  )

  // Dashboard APIs
  const fetchDashboardOverview = useCallback(async () => {
    return handleApiCall(
      sellerApi.getDashboardOverview,
      (data) => {
        // Transform backend response to frontend format
        const transformed = {
          totalReferrals: data.referrals?.total || 0,
          activeReferrals: data.referrals?.active || 0,
          currentMonthSales: data.sales?.currentMonth || 0,
          currentMonthOrders: data.sales?.orderCount || 0,
          averageOrderValue: data.sales?.averageOrderValue || 0,
          monthlyTarget: data.target?.monthlyTarget || 0,
          targetProgress: data.target?.progress || 0,
          targetAchieved: data.target?.achieved || 0,
          targetRemaining: data.target?.remaining || 0,
          status: data.target?.progress >= 100 ? 'Target Achieved' : data.target?.progress >= 50 ? 'On Track' : 'Needs Attention',
        }
        return { type: 'SET_DASHBOARD_OVERVIEW', payload: transformed }
      },
      'Failed to load dashboard overview',
    )
  }, [handleApiCall])

  const fetchWalletData = useCallback(async () => {
    return handleApiCall(
      sellerApi.getWalletBalance,
      (data) => {
        // Transform backend response to frontend format
        const transformed = {
          balance: data.wallet?.balance || 0,
          pending: data.wallet?.pending || 0,
          available: data.wallet?.available || (data.wallet?.balance || 0) - (data.wallet?.pending || 0),
          totalEarned: data.wallet?.balance || 0, // Total earned is same as balance for now
          recentCommissions: data.recentCommissions || [],
        }
        return { type: 'SET_WALLET_DATA', payload: transformed }
      },
      'Failed to load wallet data',
    )
  }, [handleApiCall])

  const fetchReferrals = useCallback(async (params = {}) => {
    return handleApiCall(
      () => sellerApi.getReferrals(params),
      (data) => {
        // Transform backend response to frontend format
        const transformed = {
          referrals: data.referrals || [],
          totalReferrals: data.totalReferrals || 0,
        }
        return { type: 'SET_REFERRALS_DATA', payload: transformed }
      },
      'Failed to load referrals',
    )
  }, [handleApiCall])

  const fetchPerformance = useCallback(async (params = {}) => {
    return handleApiCall(
      () => sellerApi.getPerformanceAnalytics(params),
      (data) => ({ type: 'SET_PERFORMANCE_DATA', payload: data }),
      'Failed to load performance data',
    )
  }, [handleApiCall])

  const fetchTargetIncentives = useCallback(async () => {
    return handleApiCall(
      sellerApi.getTargetIncentives,
      (data) => ({ type: 'SET_TARGET_INCENTIVES', payload: data?.incentives || data || [] }),
      'Failed to load target incentives',
    )
  }, [handleApiCall])

  // Profile APIs
  const updateProfile = useCallback(
    async (profileData) => {
      return handleApiCall(
        () => sellerApi.updateSellerProfile(profileData),
        (data) => ({ type: 'UPDATE_PROFILE', payload: data }),
        'Failed to update profile',
      )
    },
    [handleApiCall],
  )

  const changePassword = useCallback(
    async (passwordData) => {
      return handleApiCall(
        () => sellerApi.changePassword(passwordData),
        null,
        'Failed to change password',
      )
    },
    [handleApiCall],
  )

  // Wallet APIs
  const requestWithdrawal = useCallback(
    async (withdrawalData) => {
      return handleApiCall(
        () => sellerApi.requestWithdrawal(withdrawalData),
        null,
        'Failed to submit withdrawal request',
      )
    },
    [handleApiCall],
  )

  // Notification APIs
  const markNotificationRead = useCallback(
    async (notificationId) => {
      setLoading(true)
      setError(null)
      try {
        const result = await sellerApi.markNotificationRead(notificationId)
        if (result.success) {
          dispatch({ type: 'MARK_NOTIFICATION_READ', payload: { id: notificationId } })
          return { data: null, error: null }
        } else {
          const errorMsg = result.error?.message || 'Failed to mark notification as read'
          setError(errorMsg)
          return { data: null, error: result.error }
        }
      } catch (err) {
        const errorMsg = err.message || 'Failed to mark notification as read'
        setError(errorMsg)
        return { data: null, error: { message: errorMsg } }
      } finally {
        setLoading(false)
      }
    },
    [dispatch],
  )

  const markAllNotificationsRead = useCallback(async () => {
    return handleApiCall(
      sellerApi.markAllNotificationsRead,
      () => ({ type: 'MARK_ALL_NOTIFICATIONS_READ' }),
      'Failed to mark notifications as read',
    )
  }, [handleApiCall])

  // Support APIs
  const reportIssue = useCallback(
    async (reportData) => {
      return handleApiCall(
        () => sellerApi.reportIssue(reportData),
        null,
        'Failed to submit report',
      )
    },
    [handleApiCall],
  )

  return {
    loading,
    error,
    fetchDashboardOverview,
    fetchWalletData,
    fetchReferrals,
    fetchPerformance,
    fetchTargetIncentives,
    updateProfile,
    changePassword,
    requestWithdrawal,
    markNotificationRead,
    markAllNotificationsRead,
    reportIssue,
  }
}

