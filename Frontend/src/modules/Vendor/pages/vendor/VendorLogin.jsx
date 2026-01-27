import { useState } from 'react'
import { OtpVerification } from '../../../../components/auth/OtpVerification'
import { useVendorDispatch } from '../../context/VendorContext'
import * as vendorApi from '../../services/vendorApi'
import { validatePhoneNumber } from '../../../../utils/phoneValidation'
import { PhoneInput } from '../../../../components/PhoneInput'
import { useToast } from '../../../../modules/Admin/components/ToastNotification'
import { VendorStatusMessage } from '../../components/VendorStatusMessage'
import { registerFCMTokenWithBackend } from '../../../../services/pushNotificationService'

export function VendorLogin({ onSuccess, onSwitchToRegister }) {
  const dispatch = useVendorDispatch()
  const { warning: showWarning } = useToast()
  const [step, setStep] = useState('phone') // 'phone' | 'otp'
  const [form, setForm] = useState({ phone: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [vendorId, setVendorId] = useState(null)
  const [showStatus, setShowStatus] = useState(false)
  const [status, setStatus] = useState(null)

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
      if (!form.phone.trim()) {
        setError('Contact number is required')
        setLoading(false)
        return
      }

      // Validate phone number
      const validation = validatePhoneNumber(form.phone)
      if (!validation.isValid) {
        setError(validation.error)
        setLoading(false)
        return
      }

      const result = await vendorApi.requestVendorOTP({ phone: validation.normalized })

      if (result.success || result.data) {
        setForm(prev => ({ ...prev, phone: validation.normalized }))
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
      const result = await vendorApi.loginVendorWithOtp({ phone: form.phone, otp: otpCode })

      if (result.success || result.data) {
        const vendorData = result.data?.vendor || result.data?.data?.vendor || result.data // handle different structures

        // Check if vendor status is pending
        if (vendorData?.status === 'pending') {
          setVendorId(vendorData?.vendorId || result.data?.data?.vendorId || 'Pending')
          setStatus('pending')
          setShowStatus(true)
          setLoading(false)
          return
        }

        // Check if vendor status is rejected
        if (vendorData?.status === 'rejected') {
          setVendorId(vendorData?.vendorId || result.data?.data?.vendorId || 'Status')
          setStatus('rejected')
          setShowStatus(true)
          setLoading(false)
          return
        }

        if (result.data?.token || result.data?.data?.token) {
          localStorage.setItem('vendor_token', result.data?.token || result.data?.data?.token)
          // Register FCM token
          registerFCMTokenWithBackend(true)
        }

        // Update vendor context with profile
        if (vendorData) {
          dispatch({
            type: 'AUTH_LOGIN',
            payload: {
              ...vendorData,
              id: vendorData.id || vendorData._id,
              phone: vendorData.phone || form.phone,
            },
          })
        }

        onSuccess?.(vendorData || { phone: form.phone })
      } else {
        // Check if vendor needs to register
        if (result.error?.message?.includes('not found') || result.error?.message?.includes('Vendor not found')) {
          setError('Vendor not found. Please register first.')
          setTimeout(() => {
            if (onSwitchToRegister) {
              onSwitchToRegister()
            }
          }, 2000)
        } else if (result.error?.message?.includes('banned')) {
          setError(result.error?.message || 'Your account has been banned. Please contact admin.')
        } else if (result.error?.message?.includes('inactive')) {
          setError('Your account is inactive. Please contact admin.')
        } else if (result.status === 'rejected' || result.data?.status === 'rejected') { // Handle rejected status from API response
          setError(result.message || result.data?.message || 'Your application was rejected.')
        } else {
          setError(result.error?.message || 'Invalid OTP. Please try again.')
        }
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setLoading(true)
    try {
      await vendorApi.requestVendorOTP({ phone: form.phone })
    } catch (err) {
      setError('Failed to resend OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (showStatus) {
    return <VendorStatusMessage status={status} vendorId={vendorId} onBack={() => { setShowStatus(false); setStep('phone'); }} />
  }

  if (step === 'otp') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 via-white to-green-50 px-4 py-8">
        <div className="w-full max-w-md space-y-5">
          <div className="rounded-3xl border border-green-200/60 bg-white/90 p-6 md:p-8 shadow-xl backdrop-blur-sm">
            <OtpVerification
              phone={form.phone}
              onVerify={handleVerifyOtp}
              onResend={handleResendOtp}
              onBack={() => setStep('phone')}
              loading={loading}
              error={error}
              userType="vendor"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 via-white to-green-50 px-4 py-8">
      <div className="w-full max-w-md space-y-5">
        <div className="text-center space-y-3 mb-2">
          {/* Brand Identity */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-2 shadow-sm border border-green-100 p-2 overflow-hidden">
              <img src="/assets/Satpura-1.webp" alt="Satpura Bio" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col -space-y-1">
              <span className="text-lg font-black text-slate-900 tracking-tighter uppercase">Satpura <span className="text-green-600">Bio</span></span>
              <span className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">Organic Solutions</span>
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-wide text-green-600 font-bold">Welcome Back</p>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Vendor Login</h1>
          <p className="text-xs text-gray-500">Enter your contact number to continue</p>
        </div>

        <div className="rounded-3xl border border-green-200/60 bg-white/90 p-6 md:p-8 shadow-xl backdrop-blur-sm">
          <form onSubmit={handleRequestOtp} className="space-y-5">
            {error && (
              <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="login-phone" className="text-xs font-semibold text-gray-700">
                Contact Number <span className="text-red-500">*</span>
              </label>
              <PhoneInput
                id="login-phone"
                name="phone"
                required
                value={form.phone}
                onChange={handleChange}
                placeholder="Mobile"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-gradient-to-r from-green-600 to-green-700 px-5 py-3.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending OTP...' : 'Continue'}
            </button>

            <div className="text-center text-sm">
              <span className="text-gray-600">Don't have an account? </span>
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="text-green-600 font-semibold hover:underline"
              >
                Sign up
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
