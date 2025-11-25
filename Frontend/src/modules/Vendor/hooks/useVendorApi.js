/**
 * Custom hook for Vendor API integration
 * Provides easy access to API functions with loading states and error handling
 */

import { useState, useCallback } from 'react'
import { useVendorDispatch } from '../context/VendorContext'
import * as vendorApi from '../services/vendorApi'

export function useVendorApi() {
  const dispatch = useVendorDispatch()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const callApi = useCallback(
    async (apiFunction, ...args) => {
      setLoading(true)
      setError(null)
      try {
        const result = await apiFunction(...args)
        if (result.success) {
          // Extract data from response: { success: true, data: {...} } -> {...}
          const responseData = result.data || result
          return { data: responseData, error: null }
        } else {
          const error = result.error || { message: 'An error occurred' }
          setError(error)
          return { data: null, error: error }
        }
      } catch (err) {
        // Handle errors from handleResponse function
        const errorMsg = err.error?.message || err.message || 'An unexpected error occurred'
        const errorObj = err.error || { message: errorMsg }
        setError(errorObj)
        return { data: null, error: errorObj }
      } finally {
        setLoading(false)
      }
    },
    [dispatch],
  )

  // Authentication APIs
  const login = useCallback((credentials) => callApi(vendorApi.loginVendor, credentials), [callApi])

  const logout = useCallback(() => callApi(vendorApi.logoutVendor), [callApi])

  const fetchProfile = useCallback(() => callApi(vendorApi.getVendorProfile), [callApi])

  // Dashboard APIs
  const fetchDashboardData = useCallback(() => {
    return callApi(vendorApi.fetchDashboardData).then((result) => {
      if (result.data) {
        dispatch({ type: 'SET_DASHBOARD_OVERVIEW', payload: result.data })
      }
      return result
    })
  }, [callApi, dispatch])

  // Orders APIs
  const getOrders = useCallback((params) => callApi(vendorApi.getOrders, params), [callApi])

  const getOrderDetails = useCallback((orderId) => callApi(vendorApi.getOrderDetails, orderId), [callApi])

  const acceptOrder = useCallback(
    (orderId) => {
      return callApi(vendorApi.acceptOrder, orderId).then((result) => {
        if (result.data) {
          dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { orderId, status: 'processing' } })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const rejectOrder = useCallback(
    (orderId, reasonData) => {
      return callApi(vendorApi.rejectOrder, orderId, reasonData).then((result) => {
        if (result.data) {
          dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { orderId, status: 'rejected' } })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const acceptOrderPartially = useCallback(
    (orderId, partialData) => {
      return callApi(vendorApi.acceptOrderPartially, orderId, partialData).then((result) => {
        if (result.data) {
          dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { orderId, status: 'partially_accepted' } })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const updateOrderStatus = useCallback(
    (orderId, statusData) => {
      return callApi(vendorApi.updateOrderStatus, orderId, statusData).then((result) => {
        if (result.data) {
          dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { orderId, status: statusData.status } })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const getOrderStats = useCallback((params) => callApi(vendorApi.getOrderStats, params), [callApi])

  // Product APIs (for viewing and ordering products)
  const getProducts = useCallback((params) => callApi(vendorApi.getProducts, params), [callApi])

  const getProductDetails = useCallback((productId) => callApi(vendorApi.getProductDetails, productId), [callApi])

  // Inventory APIs
  const getInventory = useCallback((params) => callApi(vendorApi.getInventory, params), [callApi])

  const getInventoryItemDetails = useCallback((itemId) => callApi(vendorApi.getInventoryItemDetails, itemId), [callApi])

  const updateInventoryStock = useCallback(
    (itemId, stockData) => {
      return callApi(vendorApi.updateInventoryStock, itemId, stockData).then((result) => {
        if (result.data) {
          dispatch({ type: 'UPDATE_INVENTORY_STOCK', payload: { itemId, stock: stockData.quantity } })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const getInventoryStats = useCallback(() => callApi(vendorApi.getInventoryStats), [callApi])

  // Credit Management APIs
  const getCreditInfo = useCallback(() => callApi(vendorApi.getCreditInfo), [callApi])

  const requestCreditPurchase = useCallback(
    (purchaseData) => {
      return callApi(vendorApi.requestCreditPurchase, purchaseData).then((result) => {
        if (result.data) {
          dispatch({ type: 'ADD_CREDIT_PURCHASE_REQUEST', payload: result.data })
        }
        return result
      })
    },
    [callApi, dispatch],
  )

  const getCreditPurchases = useCallback((params) => callApi(vendorApi.getCreditPurchases, params), [callApi])

  const getCreditPurchaseDetails = useCallback((requestId) => callApi(vendorApi.getCreditPurchaseDetails, requestId), [callApi])

  const getCreditHistory = useCallback((params) => callApi(vendorApi.getCreditHistory, params), [callApi])

  // Reports APIs
  const getReports = useCallback((params) => callApi(vendorApi.getReports, params), [callApi])

  const getPerformanceAnalytics = useCallback((params) => callApi(vendorApi.getPerformanceAnalytics, params), [callApi])

  const getRegionAnalytics = useCallback(() => callApi(vendorApi.getRegionAnalytics), [callApi])

  return {
    loading,
    error,
    // Authentication
    login,
    logout,
    fetchProfile,
    // Dashboard
    fetchDashboardData,
    // Orders
    getOrders,
    getOrderDetails,
    acceptOrder,
    acceptOrderPartially,
    rejectOrder,
    updateOrderStatus,
    getOrderStats,
    // Products
    getProducts,
    getProductDetails,
    // Inventory
    getInventory,
    getInventoryItemDetails,
    updateInventoryStock,
    getInventoryStats,
    // Credit
    getCreditInfo,
    requestCreditPurchase,
    getCreditPurchases,
    getCreditPurchaseDetails,
    getCreditHistory,
    // Reports
    getReports,
    getPerformanceAnalytics,
    getRegionAnalytics,
  }
}

