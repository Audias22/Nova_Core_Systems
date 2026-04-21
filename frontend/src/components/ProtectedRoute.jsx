import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ProtectedRoute = ({ children, roles }) => {
  const { usuario, cargando } = useAuth()

  if (cargando) return null

  if (!usuario) return <Navigate to="/login" replace />

  if (roles && !roles.includes(usuario.rol)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default ProtectedRoute