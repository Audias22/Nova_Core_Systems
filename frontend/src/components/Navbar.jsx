import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { getAlertasActivas } from '../api/alertas'
import { Notifications, NotificationsActive, Logout } from '@mui/icons-material'
import { Badge, IconButton, Tooltip } from '@mui/material'
import { useNavigate } from 'react-router-dom'

const getNombreCorto = (nombre) => {
  if (!nombre) return ''
  const partes = nombre.split(' ')
  return partes.length >= 2 ? `${partes[0]} ${partes[1]}` : partes[0]
}

const ROL_LABEL = {
  admin: 'Administrador', jefe_almacen: 'Jefe de Almacén',
  almacen: 'Almacén', ventas: 'Ventas', compras: 'Compras',
  flota: 'Flota', informatica: 'Informática',
}

const Navbar = ({ titulo }) => {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const [alertasActivas, setAlertasActivas] = useState(0)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const cargarAlertas = async () => {
      try {
        const data = await getAlertasActivas()
        setAlertasActivas(data.length)
      } catch { setAlertasActivas(0) }
    }
    cargarAlertas()
    const intervalo = setInterval(cargarAlertas, 60000)
    return () => clearInterval(intervalo)
  }, [])

  useEffect(() => {
    const handleClickFuera = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuAbierto(false)
    }
    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [])

  return (
    <div className="h-14 flex items-center justify-between px-6 flex-shrink-0"
      style={{
        background: '#0a0a0a',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>

      {/* Título */}
      <div>
        <h1 className="text-white font-bold text-base leading-none tracking-tight">{titulo}</h1>
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Módulo de Almacén y Logística · Nova Core Systems
        </p>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-3">

        {/* Campana */}
        <Tooltip title="Alertas activas">
          <IconButton onClick={() => navigate('/alertas')} size="small"
            sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: '#ffffff', background: 'rgba(255,255,255,0.06)' } }}>
            <Badge badgeContent={alertasActivas} color="error"
              sx={{ '& .MuiBadge-badge': { fontSize: '10px', minWidth: '16px', height: '16px' } }}>
              {alertasActivas > 0
                ? <NotificationsActive style={{ fontSize: '1.1rem', color: '#00d4ff' }} />
                : <Notifications style={{ fontSize: '1.1rem' }} />}
            </Badge>
          </IconButton>
        </Tooltip>

        {/* Separador */}
        <div className="w-px h-6" style={{ background: 'rgba(255,255,255,0.08)' }} />

        {/* Perfil */}
        <div className="relative" ref={menuRef}>
          <button onClick={() => setMenuAbierto(!menuAbierto)}
            className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: 'rgba(0,212,255,0.15)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.3)' }}>
              {usuario?.nombre?.charAt(0)}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-white text-xs font-semibold leading-none">{getNombreCorto(usuario?.nombre)}</p>
              <p className="text-xs mt-0.5 leading-none" style={{ color: '#00d4ff' }}>
                {ROL_LABEL[usuario?.rol] || usuario?.rol}
              </p>
            </div>
          </button>

          {/* Dropdown */}
          {menuAbierto && (
            <div className="absolute right-0 top-11 w-60 rounded-xl shadow-2xl z-50 overflow-hidden"
              style={{
                background: '#1a1a1a',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>

              {/* Header */}
              <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: 'rgba(0,212,255,0.15)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.2)' }}>
                    {usuario?.nombre?.charAt(0)}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-white font-semibold text-sm truncate leading-tight">{usuario?.nombre}</p>
                    <p className="text-xs truncate mt-0.5" style={{ color: '#00d4ff' }}>
                      {ROL_LABEL[usuario?.rol] || usuario?.rol}
                    </p>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="px-4 py-3 space-y-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'rgba(255,255,255,0.35)' }}>Cargo</span>
                  <span className="text-white font-medium text-right max-w-32 truncate">{usuario?.cargo}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'rgba(255,255,255,0.35)' }}>Área</span>
                  <span className="text-white font-medium">{usuario?.area}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'rgba(255,255,255,0.35)' }}>Correo</span>
                  <span className="text-white font-medium text-right max-w-32 truncate" style={{ fontSize: '10px' }}>{usuario?.correo}</span>
                </div>
              </div>

              {/* Logout */}
              <div className="p-2">
                <button onClick={() => { logout(); navigate('/login') }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#ef4444' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}>
                  <Logout style={{ fontSize: '0.9rem' }} />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Navbar