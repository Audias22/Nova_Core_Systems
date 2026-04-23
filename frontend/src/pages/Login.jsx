import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Alert, CircularProgress } from '@mui/material'
import { Email, Lock, Visibility, VisibilityOff } from '@mui/icons-material'

const Login = () => {
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      await login(correo, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #060d1f 0%, #0a1628 50%, #060d1f 100%)' }}>

      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #00d4ff, transparent)' }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #0066ff, transparent)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #00d4ff, transparent)' }} />
      </div>

      <div className="relative w-full max-w-md mx-4">

        {/* Card */}
        <div className="rounded-2xl p-8 border border-blue-900/40"
          style={{ background: 'rgba(13, 27, 62, 0.8)', backdropFilter: 'blur(20px)' }}>

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'linear-gradient(135deg, #00d4ff, #0066ff)' }}>
              <span className="text-white font-black text-2xl">NC</span>
            </div>
            <h1 className="text-white font-bold text-2xl">Nova Core Systems</h1>
            <p className="text-blue-400 text-sm mt-1">Módulo de Almacén y Logística</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {error && (
              <Alert severity="error" sx={{
                backgroundColor: 'rgba(239,68,68,0.1)',
                color: '#fca5a5',
                border: '1px solid rgba(239,68,68,0.3)',
                '& .MuiAlert-icon': { color: '#ef4444' }
              }}>
                {error}
              </Alert>
            )}

            {/* Correo */}
            <div>
              <label className="text-blue-300 text-sm font-medium block mb-2">
                Correo electrónico
              </label>
              <div className="relative">
                <Email className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500"
                  style={{ fontSize: '1.1rem' }} />
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="usuario@novacore.gt"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-lg text-white placeholder-blue-900 text-sm outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(0,212,255,0.2)',
                  }}
                  onFocus={(e) => e.target.style.border = '1px solid rgba(0,212,255,0.6)'}
                  onBlur={(e) => e.target.style.border = '1px solid rgba(0,212,255,0.2)'}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-blue-300 text-sm font-medium block mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500"
                  style={{ fontSize: '1.1rem' }} />
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-3 rounded-lg text-white placeholder-blue-900 text-sm outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(0,212,255,0.2)',
                  }}
                  onFocus={(e) => e.target.style.border = '1px solid rgba(0,212,255,0.6)'}
                  onBlur={(e) => e.target.style.border = '1px solid rgba(0,212,255,0.2)'}
                />
                <button type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-300 transition-colors">
                  {mostrarPassword ? <VisibilityOff style={{ fontSize: '1.1rem' }} /> : <Visibility style={{ fontSize: '1.1rem' }} />}
                </button>
              </div>
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full py-3 rounded-lg font-semibold text-white text-sm transition-all duration-200 mt-6 flex items-center justify-center gap-2"
              style={{
                background: cargando ? 'rgba(0,102,255,0.4)' : 'linear-gradient(135deg, #00d4ff, #0066ff)',
                cursor: cargando ? 'not-allowed' : 'pointer'
              }}>
              {cargando ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Iniciar sesión'}
            </button>
          </form>

          <p className="text-center text-blue-900 text-xs mt-6">
            CON AMOR PARA ING. PAYES
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login