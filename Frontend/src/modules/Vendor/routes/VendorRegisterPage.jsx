import { useNavigate } from 'react-router-dom'
import { VendorRegister } from '../pages/VendorRegister'

export function VendorRegisterPage() {
  const navigate = useNavigate()

  return (
    <VendorRegister
      onSwitchToLogin={() => navigate('/vendor/login')}
      onSuccess={() => navigate('/vendor/dashboard')}
    />
  )
}

