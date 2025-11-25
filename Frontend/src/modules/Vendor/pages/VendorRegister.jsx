import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { OtpVerification } from '../../../components/auth/OtpVerification'
import { useVendorDispatch } from '../context/VendorContext'
import { VendorStatusMessage } from '../components/VendorStatusMessage'
import * as vendorApi from '../services/vendorApi'

export function VendorRegister({ onSuccess, onSwitchToLogin }) {
  const navigate = useNavigate()
  const dispatch = useVendorDispatch()
  const [step, setStep] = useState('register') // 'register' | 'otp' | 'pending' | 'rejected'
  const [form, setForm] = useState({
    fullName: '',
    contact: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    latitude: '',
    longitude: '',
  })
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Validate form
      if (!form.fullName.trim()) {
        setError('Full name is required')
        setLoading(false)
        return
      }
      if (!form.contact.trim()) {
        setError('Contact number is required')
        setLoading(false)
        return
      }
      if (form.contact.length < 10) {
        setError('Please enter a valid contact number')
        setLoading(false)
        return
      }
      if (!form.address.trim()) {
        setError('Address is required')
        setLoading(false)
        return
      }
      if (!form.city.trim()) {
        setError('City is required')
        setLoading(false)
        return
      }
      if (!form.state.trim()) {
        setError('State is required')
        setLoading(false)
        return
      }
      if (!form.pincode.trim()) {
        setError('Pincode is required')
        setLoading(false)
        return
      }
      if (!form.latitude.trim() || !form.longitude.trim()) {
        setError('Location coordinates (Latitude and Longitude) are required')
        setLoading(false)
        return
      }
      const lat = parseFloat(form.latitude)
      const lng = parseFloat(form.longitude)
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        setError('Please enter valid latitude (-90 to 90) and longitude (-180 to 180)')
        setLoading(false)
        return
      }

      // Register vendor (creates vendor and sends OTP)
      const location = {
        address: form.address,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        coordinates: {
          lat: parseFloat(form.latitude),
          lng: parseFloat(form.longitude),
        },
      }

      const result = await vendorApi.registerVendor({
        fullName: form.fullName,
        phone: form.contact,
        location: location,
      })
      
      if (result.success || result.data) {
        setStep('otp')
      } else {
        setError(result.error?.message || 'Failed to send OTP. Please try again.')
      }
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (otpCode) => {
    setError(null)
    setLoading(true)

    try {
      // Verify OTP to complete registration
      const result = await vendorApi.loginVendorWithOtp({ phone: form.contact, otp: otpCode })

      if (result.success || result.data) {
        const responseData = result.data?.data || result.data
        const vendorData = responseData?.vendor || result.data?.vendor
        const status = responseData?.status || vendorData?.status

        // Check status
        if (status === 'pending') {
          // Show pending message
          setStep('pending')
          // Update vendor context with profile (but no token)
          if (vendorData) {
            dispatch({
              type: 'AUTH_LOGIN',
              payload: {
                id: vendorData.id || vendorData._id,
                name: vendorData.name || form.fullName,
                phone: vendorData.phone || form.contact,
                email: vendorData.email,
                location: vendorData.location,
                status: vendorData.status,
                isActive: vendorData.isActive,
              },
            })
          }
          return
        }

        if (status === 'rejected') {
          // Show rejected message
          setStep('rejected')
          return
        }

        // Vendor is approved - proceed to dashboard
        if (responseData?.token || result.data?.token) {
          localStorage.setItem('vendor_token', responseData?.token || result.data?.token)
        }
        
        // Update vendor context with profile
        if (vendorData) {
          dispatch({
            type: 'AUTH_LOGIN',
            payload: {
              id: vendorData.id || vendorData._id,
              name: vendorData.name || form.fullName,
              phone: vendorData.phone || form.contact,
              email: vendorData.email,
              location: vendorData.location,
              status: vendorData.status,
              isActive: vendorData.isActive,
            },
          })
        }
        
        onSuccess?.(vendorData || { name: form.fullName, phone: form.contact })
        navigate('/vendor/dashboard')
      } else {
        // Check for rejected status in error response
        if (result.error?.status === 'rejected' || result.error?.message?.includes('rejected')) {
          setStep('rejected')
      } else {
        setError(result.error?.message || 'Invalid OTP. Please try again.')
        }
      }
    } catch (err) {
      // Check for rejected status in error response
      if (err.error?.status === 'rejected' || err.message?.includes('rejected')) {
        setStep('rejected')
      } else {
        setError(err.error?.message || err.message || 'Verification failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setLoading(true)
    try {
      await vendorApi.requestVendorOTP({ phone: form.contact })
    } catch (err) {
      setError('Failed to resend OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'otp') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 via-white to-green-50 px-6 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="rounded-3xl border border-green-200/60 bg-white/90 p-8 shadow-xl backdrop-blur-sm">
            <OtpVerification
              phone={form.contact}
              onVerify={handleVerifyOtp}
              onResend={handleResendOtp}
              onBack={() => setStep('register')}
              loading={loading}
              error={error}
            />
          </div>
        </div>
      </div>
    )
  }

  if (step === 'pending' || step === 'rejected') {
    return <VendorStatusMessage status={step} onBack={() => setStep('register')} />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 via-white to-green-50 px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <p className="text-xs uppercase tracking-wide text-green-600 font-semibold">Create Account</p>
          <h1 className="text-3xl font-bold text-gray-900">Register as Vendor</h1>
          <p className="text-sm text-gray-600">Start your journey to better farming</p>
        </div>

        <div className="rounded-3xl border border-green-200/60 bg-white/90 p-8 shadow-xl backdrop-blur-sm">
          <form onSubmit={handleRequestOtp} className="space-y-5">
            {error && (
              <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="register-fullName" className="text-xs font-semibold text-gray-700">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="register-fullName"
                name="fullName"
                type="text"
                required
                value={form.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="register-contact" className="text-xs font-semibold text-gray-700">
                Contact Number <span className="text-red-500">*</span>
              </label>
              <input
                id="register-contact"
                name="contact"
                type="tel"
                required
                value={form.contact}
                onChange={handleChange}
                placeholder="+91 90000 00000"
                maxLength={15}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
              />
            </div>

            <div className="border-t border-gray-200 pt-5 mt-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Address & Location</h3>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="register-address" className="text-xs font-semibold text-gray-700">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="register-address"
                    name="address"
                    required
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Enter your complete address"
                    rows={2}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="register-city" className="text-xs font-semibold text-gray-700">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="register-city"
                      name="city"
                      type="text"
                      required
                      value={form.city}
                      onChange={handleChange}
                      placeholder="City"
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="register-state" className="text-xs font-semibold text-gray-700">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="register-state"
                      name="state"
                      type="text"
                      required
                      value={form.state}
                      onChange={handleChange}
                      placeholder="State"
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="register-pincode" className="text-xs font-semibold text-gray-700">
                    Pincode <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="register-pincode"
                    name="pincode"
                    type="text"
                    required
                    value={form.pincode}
                    onChange={handleChange}
                    placeholder="Pincode"
                    maxLength={6}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-yellow-800 mb-2">⚠️ Temporary Location Entry</p>
                  <p className="text-xs text-yellow-700 mb-3">
                    For now, please manually enter your location coordinates. This will be replaced with Google Maps API in the future.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label htmlFor="register-latitude" className="text-xs font-semibold text-gray-700">
                        Latitude <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="register-latitude"
                        name="latitude"
                        type="number"
                        step="any"
                        required
                        value={form.latitude}
                        onChange={handleChange}
                        placeholder="e.g., 19.0760"
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="register-longitude" className="text-xs font-semibold text-gray-700">
                        Longitude <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="register-longitude"
                        name="longitude"
                        type="number"
                        step="any"
                        required
                        value={form.longitude}
                        onChange={handleChange}
                        placeholder="e.g., 72.8777"
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-yellow-600 mt-2">
                    💡 Tip: You can find your coordinates using Google Maps or any GPS app
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-gradient-to-r from-green-600 to-green-700 px-5 py-3.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending OTP...' : 'Continue'}
            </button>

            <div className="text-center text-sm">
              <span className="text-gray-600">Already have an account? </span>
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-green-600 font-semibold hover:underline"
              >
                Sign in
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
