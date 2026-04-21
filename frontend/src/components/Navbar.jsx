import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { getAlertasActivas } from '../api/alertas'
import { Notifications, NotificationsActive, Logout, Person } from '@mui/icons-material'
import { Badge, IconButton, Tooltip } from '@mui/material'
import { useNavigate } from 'react-router-dom'

const getNombreCorto = (nombre) => {
  if (!nombre) return ''
  const partes = nombre.split(' ')
  return partes.length >= 2 ? `${partes[0]} ${partes[1]}` : partes[0]
}

const getRolColor = (rol) => {
  const colores = {
    jefe_almacen: '#00d4ff', almacen: '#00b4cc', admin: '#a855f7',
    ventas: '#22c55e', compras: '#f59e0b', flota: '#f97316', informatica: '#64748b'
  }
  return colores[rol] || '#94a3b8'
}

const getRolLabel = (rol) => {
  const labels = {
    jefe_almacen: 'Jefe de Almacén', almacen: 'Almacén', admin: 'Administrador',
    ventas: 'Ventas', compras: 'Compras', flota: 'Flota', informatica: 'Informática'
  }
  return labels[rol] || rol
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
      } catch {
        setAlertasActivas(0)
      }
    }
    cargarAlertas()
    const intervalo = setInterval(cargarAlertas, 60000)
    return () => clearInterval(intervalo)
  }, [])

  useEffect(() => {
    const handleClickFuera = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuAbierto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const rolColor = getRolColor(usuario?.rol)

  return (
    <div className="h-16 flex items-center justify-between px-6 border-b border-blue-900/30"
      style={{ background: 'rgba(10, 15, 30, 0.95)', backdropFilter: 'blur(10px)' }}>

      <div>
        <h1 className="text-white font-bold text-lg">{titulo}</h1>
        <p className="text-blue-400/60 text-xs">Módulo de Almacén y Logística · Nova Core Systems</p>
      </div>

      <div className="flex items-center gap-4">
        <Tooltip title="Ver alertas activas">
          <IconButton onClick={() => navigate('/alertas')} size="small">
            <Badge badgeContent={alertasActivas} color="error">
              {alertasActivas > 0
                ? <NotificationsActive style={{ color: '#f59e0b' }} />
                : <Notifications style={{ color: '#64748b' }} />}
            </Badge>
          </IconButton>
        </Tooltip>

        {/* Perfil con menú desplegable */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="flex items-center gap-2 pl-4 border-l border-blue-900/40 hover:opacity-80 transition-opacity">
            <div className="text-right">
              <p className="text-white text-xs font-semibold">{getNombreCorto(usuario?.nombre)}</p>
              <p className="text-xs font-medium" style={{ color: rolColor }}>{getRolLabel(usuario?.rol)}</p>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${rolColor}, #0066ff)` }}>
              {usuario?.nombre?.charAt(0)}
            </div>
          </button>

          {/* Dropdown */}
          {menuAbierto && (
            <div className="absolute right-0 top-12 w-64 rounded-xl border border-blue-900/40 shadow-2xl z-50 overflow-hidden"
              style={{ background: '#0d1b3e' }}>

              {/* Header del perfil */}
              <div className="p-4 border-b border-blue-900/30"
                style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(0,102,255,0.08))' }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${rolColor}, #0066ff)` }}>
                    {usuario?.nombre?.charAt(0)}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-white font-semibold text-sm truncate">{usuario?.nombre}</p>
                    <p className="text-xs font-medium truncate" style={{ color: rolColor }}>
                      {getRolLabel(usuario?.rol)}
                    </p>
                    <p className="text-slate-400 text-xs truncate">{usuario?.correo}</p>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="px-4 py-3 border-b border-blue-900/30 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Cargo</span>
                  <span className="text-white font-medium text-right max-w-36 truncate">{usuario?.cargo}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Área</span>
                  <span className="text-white font-medium">{usuario?.area}</span>
                </div>
              </div>

              {/* Acciones */}
              <div className="p-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors text-xs font-medium">
                  <Logout style={{ fontSize: '1rem' }} />
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