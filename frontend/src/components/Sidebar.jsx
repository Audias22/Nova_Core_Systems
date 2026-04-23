import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Dashboard, Inventory2, ShoppingCart, LocalShipping,
  AssignmentReturn, Notifications, MoveToInbox, Logout,
  ChevronLeft, ChevronRight
} from '@mui/icons-material'
import { Tooltip } from '@mui/material'

const menuItems = [
  { texto: 'Dashboard',    icono: <Dashboard />,        ruta: '/dashboard',    roles: ['jefe_almacen','almacen','admin','ventas','compras','flota','informatica'] },
  { texto: 'Inventario',   icono: <Inventory2 />,       ruta: '/inventario',   roles: ['jefe_almacen','almacen','admin','compras','informatica'] },
  { texto: 'Pedidos',      icono: <ShoppingCart />,     ruta: '/pedidos',      roles: ['jefe_almacen','almacen','admin','ventas','informatica'] },
  { texto: 'Recepciones',  icono: <MoveToInbox />,      ruta: '/recepciones',  roles: ['jefe_almacen','almacen','admin','compras','informatica'] },
  { texto: 'Despachos',    icono: <LocalShipping />,    ruta: '/despachos',    roles: ['jefe_almacen','almacen','admin','flota','informatica'] },
  { texto: 'Devoluciones', icono: <AssignmentReturn />, ruta: '/devoluciones', roles: ['jefe_almacen','almacen','admin','ventas','informatica'] },
  { texto: 'Alertas',      icono: <Notifications />,    ruta: '/alertas',      roles: ['jefe_almacen','almacen','admin','compras','informatica'] },
]

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

const Sidebar = ({ abierto, onToggle }) => {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => { logout(); navigate('/login') }

  const itemsFiltrados = menuItems.filter(item =>
    usuario && item.roles.includes(usuario.rol)
  )

  return (
    <div
      className="flex flex-col h-screen fixed left-0 top-0 z-50 transition-all duration-300"
      style={{
        width: abierto ? '220px' : '60px',
        background: '#111111',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {abierto ? (
          <>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: '#00d4ff' }}>
                <span className="text-black font-black text-xs tracking-tight">NC</span>
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-none tracking-tight">Nova Core</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Systems</p>
              </div>
            </div>
            <button onClick={onToggle}
              className="p-1 rounded-md transition-colors hover:bg-white/5"
              style={{ color: 'rgba(255,255,255,0.3)' }}>
              <ChevronLeft style={{ fontSize: '1rem' }} />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center w-full gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: '#00d4ff' }}>
              <span className="text-black font-black text-xs">NC</span>
            </div>
            <button onClick={onToggle}
              className="p-1 rounded-md transition-colors hover:bg-white/5"
              style={{ color: 'rgba(255,255,255,0.3)' }}>
              <ChevronRight style={{ fontSize: '1rem' }} />
            </button>
          </div>
        )}
      </div>

      {/* Usuario */}
      {abierto ? (
        <div className="px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#00d4ff' }}>
              {usuario?.nombre?.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-white text-xs font-semibold leading-tight truncate">
                {getNombreCorto(usuario?.nombre)}
              </p>
              <p className="text-xs truncate mt-0.5" style={{ color: '#00d4ff' }}>
                {ROL_LABEL[usuario?.rol] || usuario?.rol}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-center py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Tooltip title={usuario?.nombre} placement="right">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold cursor-default"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#00d4ff' }}>
              {usuario?.nombre?.charAt(0)}
            </div>
          </Tooltip>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {abierto && (
          <p className="text-xs font-semibold uppercase tracking-widest px-2 mb-3"
            style={{ color: 'rgba(255,255,255,0.2)', letterSpacing: '0.12em' }}>
            Módulo
          </p>
        )}
        {itemsFiltrados.map((item) => {
          const activo = location.pathname === item.ruta
          return abierto ? (
            <button key={item.ruta} onClick={() => navigate(item.ruta)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 group"
              style={{
                background: activo ? 'rgba(0,212,255,0.1)' : 'transparent',
                borderLeft: activo ? '2px solid #00d4ff' : '2px solid transparent',
              }}>
              <span style={{
                fontSize: '1rem',
                flexShrink: 0,
                color: activo ? '#00d4ff' : 'rgba(255,255,255,0.35)',
                transition: 'color 0.15s'
              }}
                className="group-hover:!text-white">
                {item.icono}
              </span>
              <span className="text-xs font-medium transition-colors duration-150 truncate"
                style={{ color: activo ? '#ffffff' : 'rgba(255,255,255,0.45)' }}
                onMouseEnter={e => e.target.style.color = '#ffffff'}
                onMouseLeave={e => !activo && (e.target.style.color = 'rgba(255,255,255,0.45)')}>
                {item.texto}
              </span>
            </button>
          ) : (
            <Tooltip key={item.ruta} title={item.texto} placement="right">
              <button onClick={() => navigate(item.ruta)}
                className="w-full flex items-center justify-center py-2.5 rounded-lg transition-all duration-150 group"
                style={{ background: activo ? 'rgba(0,212,255,0.1)' : 'transparent' }}>
                <span style={{
                  fontSize: '1.1rem',
                  color: activo ? '#00d4ff' : 'rgba(255,255,255,0.35)',
                }}
                  className="group-hover:!text-white transition-colors">
                  {item.icono}
                </span>
              </button>
            </Tooltip>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {abierto ? (
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group"
            style={{ color: 'rgba(255,255,255,0.3)' }}>
            <Logout style={{ fontSize: '1rem', flexShrink: 0 }} className="group-hover:!text-red-400 transition-colors" />
            <span className="text-xs font-medium group-hover:text-red-400 transition-colors">Cerrar sesión</span>
          </button>
        ) : (
          <Tooltip title="Cerrar sesión" placement="right">
            <button onClick={handleLogout}
              className="w-full flex items-center justify-center py-2.5 rounded-lg transition-colors group"
              style={{ color: 'rgba(255,255,255,0.3)' }}>
              <Logout style={{ fontSize: '1rem' }} className="group-hover:!text-red-400 transition-colors" />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  )
}

export default Sidebar