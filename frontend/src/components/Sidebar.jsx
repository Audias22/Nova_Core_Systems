import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Dashboard, Inventory2, ShoppingCart, LocalShipping,
  AssignmentReturn, Notifications, MoveToInbox, Logout,
  ChevronLeft, ChevronRight
} from '@mui/icons-material'
import { Tooltip } from '@mui/material'

const menuItems = [
  { texto: 'Dashboard', icono: <Dashboard />, ruta: '/dashboard', roles: ['jefe_almacen', 'almacen', 'admin', 'ventas', 'compras', 'flota', 'informatica'] },
  { texto: 'Inventario', icono: <Inventory2 />, ruta: '/inventario', roles: ['jefe_almacen', 'almacen', 'admin', 'compras', 'informatica'] },
  { texto: 'Pedidos', icono: <ShoppingCart />, ruta: '/pedidos', roles: ['jefe_almacen', 'almacen', 'admin', 'ventas', 'informatica'] },
  { texto: 'Recepciones', icono: <MoveToInbox />, ruta: '/recepciones', roles: ['jefe_almacen', 'almacen', 'admin', 'compras', 'informatica'] },
  { texto: 'Despachos', icono: <LocalShipping />, ruta: '/despachos', roles: ['jefe_almacen', 'almacen', 'admin', 'flota', 'informatica'] },
  { texto: 'Devoluciones', icono: <AssignmentReturn />, ruta: '/devoluciones', roles: ['jefe_almacen', 'almacen', 'admin', 'ventas', 'informatica'] },
  { texto: 'Alertas', icono: <Notifications />, ruta: '/alertas', roles: ['jefe_almacen', 'almacen', 'admin', 'compras', 'informatica'] }
]

const getNombreCorto = (nombre) => {
  if (!nombre) return ''
  const partes = nombre.split(' ')
  return partes.length >= 2 ? `${partes[0]} ${partes[1]}` : partes[0]
}

const Sidebar = ({ abierto, onToggle }) => {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const itemsFiltrados = menuItems.filter(item =>
    usuario && item.roles.includes(usuario.rol)
  )

  return (
    <div className="flex flex-col h-screen fixed left-0 top-0 z-50 transition-all duration-300"
      style={{
        width: abierto ? '200px' : '56px',
        background: 'linear-gradient(180deg, #0a0f1e 0%, #0d1b3e 50%, #091428 100%)'
      }}>

      {/* Logo + botón toggle */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-blue-900/40">
        {abierto && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #00d4ff, #0066ff)' }}>
              <span className="text-white font-black text-xs">NC</span>
            </div>
            <div>
              <p className="text-white font-bold text-xs leading-tight">Nova Core</p>
              <p className="text-blue-400 text-xs">Systems</p>
            </div>
          </div>
        )}
        {!abierto && (
          <div className="w-7 h-7 rounded-md flex items-center justify-center mx-auto"
            style={{ background: 'linear-gradient(135deg, #00d4ff, #0066ff)' }}>
            <span className="text-white font-black text-xs">NC</span>
          </div>
        )}
        {abierto && (
          <button onClick={onToggle}
            className="text-slate-400 hover:text-white transition-colors flex-shrink-0"
            style={{ marginLeft: 'auto' }}>
            <ChevronLeft style={{ fontSize: '1.1rem' }} />
          </button>
        )}
      </div>

      {/* Botón expandir cuando está colapsado */}
      {!abierto && (
        <button onClick={onToggle}
          className="flex items-center justify-center py-2 text-slate-400 hover:text-white transition-colors border-b border-blue-900/40">
          <ChevronRight style={{ fontSize: '1.1rem' }} />
        </button>
      )}

      {/* Usuario */}
      {abierto && (
        <div className="px-4 py-3 border-b border-blue-900/40">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #00d4ff, #0066ff)' }}>
              {usuario?.nombre?.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-white text-xs font-semibold leading-tight truncate">
                {getNombreCorto(usuario?.nombre)}
              </p>
              <p className="text-blue-400 leading-tight truncate" style={{ fontSize: '10px' }}>
                {usuario?.cargo}
              </p>
            </div>
          </div>
        </div>
      )}

      {!abierto && (
        <div className="flex justify-center py-3 border-b border-blue-900/40">
          <Tooltip title={usuario?.nombre} placement="right">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white cursor-default"
              style={{ background: 'linear-gradient(135deg, #00d4ff, #0066ff)' }}>
              {usuario?.nombre?.charAt(0)}
            </div>
          </Tooltip>
        </div>
      )}

      {/* Navegación */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {abierto && (
          <p className="text-blue-500/60 text-xs font-semibold uppercase tracking-widest px-2 mb-2">Módulo</p>
        )}
        {itemsFiltrados.map((item) => {
          const activo = location.pathname === item.ruta
          return abierto ? (
            <button key={item.ruta} onClick={() => navigate(item.ruta)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg mb-0.5 transition-all duration-200 text-left"
              style={{
                background: activo ? 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,102,255,0.15))' : 'transparent',
                borderLeft: activo ? '2px solid #00d4ff' : '2px solid transparent',
                color: activo ? '#00d4ff' : '#94a3b8'
              }}>
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>{item.icono}</span>
              <span className="text-xs font-medium truncate">{item.texto}</span>
            </button>
          ) : (
            <Tooltip key={item.ruta} title={item.texto} placement="right">
              <button onClick={() => navigate(item.ruta)}
                className="w-full flex items-center justify-center py-2 rounded-lg mb-0.5 transition-all duration-200"
                style={{
                  background: activo ? 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,102,255,0.15))' : 'transparent',
                  color: activo ? '#00d4ff' : '#94a3b8'
                }}>
                <span style={{ fontSize: '1.1rem' }}>{item.icono}</span>
              </button>
            </Tooltip>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 py-3 border-t border-blue-900/40">
        {abierto ? (
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-all duration-200 text-slate-400 hover:text-red-400">
            <Logout style={{ fontSize: '1rem', flexShrink: 0 }} />
            <span className="text-xs font-medium">Cerrar sesión</span>
          </button>
        ) : (
          <Tooltip title="Cerrar sesión" placement="right">
            <button onClick={handleLogout}
              className="w-full flex items-center justify-center py-2 rounded-lg transition-all duration-200 text-slate-400 hover:text-red-400">
              <Logout style={{ fontSize: '1rem' }} />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  )
}

export default Sidebar