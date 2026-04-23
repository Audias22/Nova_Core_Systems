import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { getInventario, ajustarInventario, getMovimientos } from '../api/inventario'
import { CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button, Tooltip } from '@mui/material'
import { TuneRounded, HistoryRounded, WarningAmberRounded } from '@mui/icons-material'
import { formatFecha } from '../utils/fecha'
import { useAuth } from '../context/AuthContext'

const estadoColor = {
  normal: { bg: 'rgba(34,197,94,0.12)', text: '#22c55e' },
  bajo:   { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' },
  critico:{ bg: 'rgba(239,68,68,0.12)',  text: '#ef4444' }
}

const dialogSx = {
  '& .MuiDialog-paper': {
    background: '#1a1a1a',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
  },
  '& .MuiDialogTitle-root': { color: 'white' },
  '& .MuiDialogContent-root': { color: 'white' },
}

const Inventario = () => {
  const { tieneRol } = useAuth()
  const puedeAjustar = tieneRol('jefe_almacen', 'almacen')

  const [inventario, setInventario] = useState([])
  const [filtro, setFiltro] = useState('')
  const [cargando, setCargando] = useState(true)
  const [modalAjuste, setModalAjuste] = useState(false)
  const [modalMovimientos, setModalMovimientos] = useState(false)
  const [productoSeleccionado, setProductoSeleccionado] = useState(null)
  const [movimientos, setMovimientos] = useState([])
  const [ajuste, setAjuste] = useState({ cantidad: '', motivo: '' })
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const cargar = async () => {
    try {
      const data = await getInventario()
      setInventario(data)
    } catch (e) {
      console.error(e)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const abrirAjuste = (item) => {
    setProductoSeleccionado(item)
    setAjuste({ cantidad: '', motivo: '' })
    setMensaje('')
    setModalAjuste(true)
  }

  const abrirMovimientos = async (item) => {
    setProductoSeleccionado(item)
    setModalMovimientos(true)
    try {
      const data = await getMovimientos(item.id_inventario)
      setMovimientos(data)
    } catch { setMovimientos([]) }
  }

  const handleAjuste = async () => {
    if (!ajuste.cantidad || !ajuste.motivo) return
    setGuardando(true)
    try {
      await ajustarInventario({
        id_producto: productoSeleccionado.id_inventario,
        cantidad: parseInt(ajuste.cantidad),
        motivo: ajuste.motivo
      })
      setMensaje('Ajuste aplicado correctamente')
      await cargar()
      setTimeout(() => setModalAjuste(false), 1200)
    } catch (e) {
      setMensaje(e.response?.data?.error || 'Error al aplicar ajuste')
    } finally {
      setGuardando(false)
    }
  }

  const filtrados = inventario.filter(i =>
    i.producto?.toLowerCase().includes(filtro.toLowerCase()) ||
    i.codigo?.toLowerCase().includes(filtro.toLowerCase()) ||
    i.categoria?.toLowerCase().includes(filtro.toLowerCase()) ||
    i.marca?.toLowerCase().includes(filtro.toLowerCase())
  )

  const criticos = inventario.filter(i => i.estado_stock === 'critico').length
  const bajos    = inventario.filter(i => i.estado_stock === 'bajo').length

  if (cargando) return (
    <Layout titulo="Inventario">
      <div className="flex items-center justify-center h-64">
        <CircularProgress sx={{ color: '#00d4ff' }} />
      </div>
    </Layout>
  )

  return (
    <Layout titulo="Inventario">
      <div className="space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-xl p-5 text-center"
            style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-3xl font-bold text-white">{inventario.length}</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Productos totales</p>
          </div>
          <div className="rounded-xl p-5 text-center"
            style={{ background: '#1a1a1a', border: '1px solid rgba(34,197,94,0.2)' }}>
            <p className="text-3xl font-bold" style={{ color: '#22c55e' }}>
              {inventario.filter(i => i.estado_stock === 'normal').length}
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Stock normal</p>
          </div>
          <div className="rounded-xl p-5 text-center"
            style={{ background: '#1a1a1a', border: '1px solid rgba(245,158,11,0.2)' }}>
            <p className="text-3xl font-bold" style={{ color: '#f59e0b' }}>{bajos}</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Stock bajo</p>
          </div>
          <div className="rounded-xl p-5 text-center"
            style={{ background: '#1a1a1a', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="text-3xl font-bold" style={{ color: '#ef4444' }}>{criticos}</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Stock crítico</p>
          </div>
        </div>

        {/* Buscador */}
        <input
          type="text"
          placeholder="Buscar por producto, código, categoría o marca..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg text-white text-sm outline-none"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
          onFocus={e => e.target.style.borderColor = 'rgba(0,212,255,0.4)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
        />

        {/* Tabla */}
        <div className="rounded-xl overflow-hidden"
          style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#141414' }}>
                  {['Código','Producto','Categoría','Marca','Disponible','Reservado','Mínimo','Ubicación','Estado','Acciones'].map(h => (
                    <th key={h} className="text-left font-medium px-4 py-3 text-xs whitespace-nowrap"
                      style={{ color: 'rgba(255,255,255,0.35)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((item) => (
                  <tr key={item.id_inventario}
                    className="transition-colors"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap" style={{ color: '#00d4ff' }}>{item.codigo}</td>
                    <td className="px-4 py-3 text-white text-xs max-w-40 truncate">{item.producto}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{item.categoria}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{item.marca}</td>
                    <td className="px-4 py-3 text-white font-semibold text-xs">{item.cantidad_disponible}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.cantidad_reservada}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.stock_minimo}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.ubicacion_bodega}</td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap"
                        style={{
                          background: estadoColor[item.estado_stock]?.bg,
                          color: estadoColor[item.estado_stock]?.text
                        }}>
                        {item.estado_stock === 'critico' ? '⚠ Crítico' : item.estado_stock === 'bajo' ? 'Bajo' : 'Normal'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 items-center">
                        {puedeAjustar && (
                          <Tooltip title="Ajustar inventario">
                            <button onClick={() => abrirAjuste(item)}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ color: 'rgba(255,255,255,0.4)' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,212,255,0.1)'; e.currentTarget.style.color = '#00d4ff' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}>
                              <TuneRounded style={{ fontSize: '1rem' }} />
                            </button>
                          </Tooltip>
                        )}
                        <Tooltip title="Ver movimientos">
                          <button onClick={() => abrirMovimientos(item)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: 'rgba(255,255,255,0.4)' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(168,85,247,0.1)'; e.currentTarget.style.color = '#a855f7' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}>
                            <HistoryRounded style={{ fontSize: '1rem' }} />
                          </button>
                        </Tooltip>
                        {item.estado_stock === 'critico' && (
                          <Tooltip title="Stock crítico — requiere reposición">
                            <WarningAmberRounded style={{ fontSize: '1rem', color: '#ef4444' }} />
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Ajuste */}
      {puedeAjustar && (
        <Dialog open={modalAjuste} onClose={() => setModalAjuste(false)} sx={dialogSx}>
          <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.06)', pb: 2 }}>
            Ajustar inventario · <span style={{ color: '#00d4ff' }}>{productoSeleccionado?.codigo}</span>
          </DialogTitle>
          <DialogContent className="space-y-4 pt-4">
            <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Stock actual: <span className="text-white font-semibold">{productoSeleccionado?.cantidad_disponible} unidades</span>
            </p>
            <div className="mt-3">
              <label className="text-xs font-medium block mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Cantidad (positivo para entrada, negativo para salida)
              </label>
              <input type="number" value={ajuste.cantidad}
                onChange={(e) => setAjuste({ ...ajuste, cantidad: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg text-white text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                onFocus={e => e.target.style.borderColor = 'rgba(0,212,255,0.4)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>
            <div className="mt-3">
              <label className="text-xs font-medium block mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Motivo del ajuste
              </label>
              <input type="text" value={ajuste.motivo}
                onChange={(e) => setAjuste({ ...ajuste, motivo: e.target.value })}
                placeholder="Ej: Auditoría física, corrección de conteo..."
                className="w-full px-3 py-2.5 rounded-lg text-white text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                onFocus={e => e.target.style.borderColor = 'rgba(0,212,255,0.4)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>
            {mensaje && (
              <p className="text-sm mt-2 font-medium" style={{ color: mensaje.includes('Error') ? '#ef4444' : '#22c55e' }}>
                {mensaje}
              </p>
            )}
          </DialogContent>
          <DialogActions className="px-6 pb-4" sx={{ borderTop: '1px solid rgba(255,255,255,0.06)', pt: 2 }}>
            <Button onClick={() => setModalAjuste(false)}
              sx={{ color: 'rgba(255,255,255,0.35)', '&:hover': { color: 'white' } }}>
              Cancelar
            </Button>
            <Button onClick={handleAjuste} disabled={guardando}
              sx={{
                background: '#00d4ff',
                color: '#000',
                fontWeight: 700,
                borderRadius: '8px',
                px: 3,
                '&:hover': { background: '#00b8d9' },
                '&:disabled': { background: 'rgba(0,212,255,0.3)', color: 'rgba(0,0,0,0.4)' }
              }}>
              {guardando ? 'Guardando...' : 'Aplicar ajuste'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Modal Movimientos */}
      <Dialog open={modalMovimientos} onClose={() => setModalMovimientos(false)}
        maxWidth="md" fullWidth sx={dialogSx}>
        <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.06)', pb: 2 }}>
          Movimientos · <span style={{ color: '#00d4ff' }}>{productoSeleccionado?.codigo}</span> · {productoSeleccionado?.producto}
        </DialogTitle>
        <DialogContent>
          {movimientos.length === 0 ? (
            <p className="text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Sin movimientos registrados
            </p>
          ) : (
            <table className="w-full text-xs mt-4">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Tipo','Usuario','Cantidad','Anterior','Nueva','Fecha','Referencia'].map(h => (
                    <th key={h} className="text-left font-medium pb-3 pr-3"
                      style={{ color: 'rgba(255,255,255,0.35)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m) => (
                  <tr key={m.id_movimiento} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="py-2.5 pr-3 whitespace-nowrap" style={{ color: '#00d4ff' }}>{m.tipo_movimiento}</td>
                    <td className="py-2.5 pr-3 text-white">{m.usuario}</td>
                    <td className="py-2.5 pr-3 text-white font-semibold">{m.cantidad}</td>
                    <td className="py-2.5 pr-3" style={{ color: 'rgba(255,255,255,0.4)' }}>{m.cantidad_anterior}</td>
                    <td className="py-2.5 pr-3 text-white">{m.cantidad_nueva}</td>
                    <td className="py-2.5 pr-3 whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>{formatFecha(m.fecha_movimiento)}</td>
                    <td className="py-2.5 font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>{m.referencia || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DialogContent>
        <DialogActions className="px-6 pb-4" sx={{ borderTop: '1px solid rgba(255,255,255,0.06)', pt: 2 }}>
          <Button onClick={() => setModalMovimientos(false)}
            sx={{ color: 'rgba(255,255,255,0.35)', '&:hover': { color: 'white' } }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}

export default Inventario