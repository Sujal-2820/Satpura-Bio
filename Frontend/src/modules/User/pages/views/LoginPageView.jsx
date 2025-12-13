import { useState } from 'react'
import { OtpVerification } from '../../../../components/auth/OtpVerification'
import { useUserDispatch } from '../../context/UserContext'
import * as userApi from '../../services/userApi'
import { Trans } from '../../../../components/Trans'

export function LoginPageView({ onSuccess, onSwitchToSignup }) {
  const dispatch = useUserDispatch()
  const [step, setStep] = useState('phone') // 'phone' | 'otp'
  const [form, setForm] = useState({ phone: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleRequestOtp = async (e) => {
    e?.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!form.phone.trim()) {
        setError('Contact number is required')
        setLoading(false)
        return
      }
      if (form.phone.length < 10) {
        setError('Please enter a valid contact number')
        setLoading(false)
        return
      }

      const result = await userApi.requestOTP({ phone: form.phone })
      
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
      const result = await userApi.verifyOTP({ phone: form.phone, otp: otpCode })

      if (result.success && result.data?.token) {
        localStorage.setItem('user_token', result.data.token)
        
        // Fetch user profile
        const profileResult = await userApi.getUserProfile()
        if (profileResult.success && profileResult.data?.user) {
          const userData = profileResult.data.user
          dispatch({
            type: 'AUTH_LOGIN',
            payload: {
              name: userData.name || 'User',
              phone: userData.phone || form.phone,
              email: userData.email || '',
              sellerId: userData.sellerId || null,
              location: userData.location || null,
            },
          })
        }

        if (onSuccess) {
          onSuccess()
        }
      } else {
        setError(result.error?.message || 'Invalid OTP. Please try again.')
      }
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setLoading(true)
    try {
      await userApi.requestOTP({ phone: form.phone })
    } catch (err) {
      setError('Failed to resend OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // OTP Step
  if (step === 'otp') {
    return (
      <div className="user-auth-page-view">
        <div className="user-auth-page-view__container">
          <div className="user-auth-page-view__content">
            <div className="user-auth-page-view__form-section">
              <div className="user-auth-page-view__form-wrapper">
                <h1 className="user-auth-page-view__title"><Trans>Verify OTP</Trans></h1>
                <OtpVerification
                  phone={form.phone}
                  onVerify={handleVerifyOtp}
                  onResend={handleResendOtp}
                  onBack={() => setStep('phone')}
                  loading={loading}
                  error={error}
                  userType="user"
                />
              </div>
            </div>
            <div className="user-auth-page-view__illustration-section">
              <div className="user-auth-page-view__illustration">
                <div className="user-auth-page-view__illustration-content">
                  <h2 className="user-auth-page-view__illustration-title"><Trans>Welcome Back</Trans></h2>
                  <p className="user-auth-page-view__illustration-text"><Trans>Continue your farming journey with IRA Sathi</Trans></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Phone Step
  return (
    <div className="user-auth-page-view">
      <div className="user-auth-page-view__container">
        <div className="user-auth-page-view__content">
          <div className="user-auth-page-view__form-section">
            <div className="user-auth-page-view__form-wrapper">
              <h1 className="user-auth-page-view__title"><Trans>Welcome Back</Trans></h1>
              <p className="user-auth-page-view__subtitle"><Trans>Sign in with your contact number</Trans></p>
              
              <form onSubmit={handleRequestOtp} className="user-auth-page-view__form">
                {error && (
                  <div className="user-auth-page-view__error">
                    <p>{error}</p>
                  </div>
                )}

                <div className="user-auth-page-view__field">
                  <label htmlFor="login-phone" className="user-auth-page-view__label">
                    <Trans>Contact Number</Trans> <span className="user-auth-page-view__required">*</span>
                  </label>
                  <input
                    id="login-phone"
                    name="phone"
                    type="tel"
                    required
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+91 90000 00000"
                    maxLength={15}
                    className="user-auth-page-view__input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="user-auth-page-view__submit-btn"
                >
                  {loading ? <Trans>Sending OTP...</Trans> : <Trans>Continue</Trans>}
                </button>

                <div className="user-auth-page-view__switch">
                  <span className="user-auth-page-view__switch-text"><Trans>Don't have an account?</Trans> </span>
                  <button
                    type="button"
                    onClick={onSwitchToSignup}
                    className="user-auth-page-view__switch-link"
                  >
                    <Trans>Sign up</Trans>
                  </button>
                </div>
              </form>
            </div>
          </div>
          <div className="user-auth-page-view__illustration-section">
            <div className="user-auth-page-view__illustration">
              <div className="user-auth-page-view__illustration-content">
                <h2 className="user-auth-page-view__illustration-title"><Trans>Your Farming Partner</Trans></h2>
                <p className="user-auth-page-view__illustration-text"><Trans>Access quality products, expert advice, and seamless delivery for all your agricultural needs</Trans></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

