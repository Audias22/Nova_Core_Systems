import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { getDespachos, confirmarEntrega } from '../api/despachos'
import { CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button, Tooltip } from '@mui/material'
import { CheckCircleRounded, VisibilityRounded, CloseRounded, BarChartRounded } from '@mui/icons-material'
import { useAuth } from '../context/AuthContext'
import { formatFecha } from '../utils/fecha'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts'

const C = {
  bg: '#0a0a0a',
  card: '#1a1a1a',
  thead: '#141414',
  border: 'rgba(255,255,255,0.06)',
  cyan: '#00d4ff',
  textSec: 'rgba(255,255,255,0.35)',
}

const estadoColor = {
  'En tránsito':   { bg: 'rgba(0,212,255,0.15)',   text: '#00d4ff' },
  'Entregado':     { bg: 'rgba(34,197,94,0.15)',   text: '#22c55e' },
  'Con incidencia':{ bg: 'rgba(239,68,68,0.15)',   text: '#ef4444' },
}

const dialogSx = {
  '& .MuiDialog-paper': { background: '#111111', border: 'rgba(255,255,255,0.06)', borderRadius: '16px' },
  '& .MuiDialogTitle-root': { color: 'white' },
  '& .MuiDialogContent-root': { color: 'white' },
}

const parseFecha = (f) => { if (!f) return null; const d = new Date(f); return isNaN(d.getTime()) ? null : d }

const FILTROS_TIEMPO = [
  { label: '7D',  dias: 7 },
  { label: '30D', dias: 30 },
  { label: '90D', dias: 90 },
  { label: 'Todo', dias: null },
]

const Despachos = () => {
  const { tieneRol } = useAuth()
  const [despachos, setDespachos]   = useState([])
  const [cargando, setCargando]     = useState(true)
  const [filtro, setFiltro]         = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroDias, setFiltroDias] = useState(null)
  const [modalConfirmar, setModalConfirmar] = useState(false)
  const [modalDetalle, setModalDetalle]     = useState(false)
  const [modalGrafica, setModalGrafica]     = useState(false)
  const [despachoSeleccionado, setDespachoSeleccionado] = useState(null)
  const [confirmacion, setConfirmacion] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [mensaje, setMensaje]       = useState('')

  const cargar = async () => {
    try { const data = await getDespachos(); setDespachos(data) }
    catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])

  const handleConfirmar = async () => {
    if (!confirmacion) return
    setProcesando(true)
    try {
      await confirmarEntrega(despachoSeleccionado.id_despacho, confirmacion)
      await cargar()
      setMensaje('Entrega confirmada correctamente')
      setModalConfirmar(false)
      setTimeout(() => setMensaje(''), 3000)
    } catch (e) {
      setMensaje(e.response?.data?.error || 'Error al confirmar entrega')
      setTimeout(() => setMensaje(''), 3000)
    } finally {
      setProcesando(false)
    }
  }

  const ahora = new Date()

  const filtrados = despachos.filter(d => {
    const matchTexto  = d.numero_pedido?.toLowerCase().includes(filtro.toLowerCase()) ||
                        d.cliente?.toLowerCase().includes(filtro.toLowerCase()) ||
                        d.responsable?.toLowerCase().includes(filtro.toLowerCase())
    const matchEstado = filtroEstado ? d.estado === filtroEstado : true
    let matchTiempo   = true
    if (filtroDias !== null) {
      const f = parseFecha(d.fecha_despacho)
      matchTiempo = f ? (ahora - f) / 86400000 <= filtroDias : false
    }
    return matchTexto && matchEstado && matchTiempo
  })

  const datosPorMes = (() => {
    const mapa = {}
    despachos.forEach(d => {
      const f = parseFecha(d.fecha_despacho); if (!f) return
      const clave = `${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,'0')}`
      const etiq  = f.toLocaleDateString('es-GT', { month:'short', year:'numeric' })
      if (!mapa[clave]) mapa[clave] = { mes: etiq, cantidad: 0 }
      mapa[clave].cantidad++
    })
    return Object.keys(mapa).sort().map(k => mapa[k])
  })()

  const estados = ['En tránsito', 'Entregado', 'Con incidencia']

  if (cargando) return (
    <Layout titulo="Despachos">
      <div className="flex items-center justify-center h-64">
        <CircularProgress sx={{ color: C.cyan }} />
      </div>
    </Layout>
  )

  return (
    <Layout titulo="Despachos">
      <div className="space-y-5">

        {/* Cards */}
        <div className="grid grid-cols-3 gap-4">
          {estados.map(estado => (
            <div key={estado}
              onClick={() => setFiltroEstado(filtroEstado === estado ? '' : estado)}
              className="rounded-xl p-4 text-center cursor-pointer transition-all"
              style={{
                background: filtroEstado === estado ? estadoColor[estado]?.bg : C.card,
                border: `1px solid ${filtroEstado === estado ? estadoColor[estado]?.text+'40' : C.border}`,
              }}>
              <p className="text-2xl font-bold" style={{ color: estadoColor[estado]?.text }}>
                {despachos.filter(d => d.estado === estado).length}
              </p>
              <p className="text-xs mt-1" style={{ color: C.textSec }}>{estado}</p>
            </div>
          ))}
        </div>

        {/* Mensaje */}
        {mensaje && (
          <div className="px-4 py-3 rounded-lg text-sm" style={{
            background: mensaje.includes('Error') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
            color: mensaje.includes('Error') ? '#ef4444' : '#22c55e',
            border: `1px solid ${mensaje.includes('Error') ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
          }}>{mensaje}</div>
        )}

        {/* Controles */}
        <div className="flex flex-wrap gap-3 items-center">
          <input type="text" placeholder="Buscar por pedido, cliente o responsable..."
            value={filtro} onChange={e => setFiltro(e.target.value)}
            className="flex-1 min-w-48 px-4 py-2.5 rounded-lg text-white text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}` }} />

          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
            className="px-4 py-2.5 rounded-lg text-white text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}` }}>
            <option value="" style={{ background: '#1a1a1a' }}>Todos los estados</option>
            {estados.map(e => <option key={e} value={e} style={{ background: '#1a1a1a' }}>{e}</option>)}
          </select>

          <div className="flex gap-1 rounded-lg p-1" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            {FILTROS_TIEMPO.map(({ label, dias }) => (
              <button key={label} onClick={() => setFiltroDias(dias)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                style={{ background: filtroDias === dias ? C.cyan : 'transparent', color: filtroDias === dias ? '#000' : C.textSec }}>
                {label}
              </button>
            ))}
          </div>

          <Tooltip title="Ver despachos por mes">
            <button onClick={() => setModalGrafica(true)}
              className="p-2.5 rounded-lg transition-all"
              style={{ background: C.card, border: `1px solid ${C.border}`, color: C.cyan }}>
              <BarChartRounded style={{ fontSize: '1.2rem' }} />
            </button>
          </Tooltip>
        </div>

        {/* Tabla */}
        <div className="rounded-xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: C.thead }}>
                  {['Pedido','Cliente','Municipio','Estado','Responsable','F. despacho','F. entrega','Días','Acciones'].map(h => (
                    <th key={h} className="text-left font-medium px-3 py-3 text-xs whitespace-nowrap" style={{ color: C.textSec }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-sm" style={{ color: C.textSec }}>No hay despachos que coincidan.</td></tr>
                ) : filtrados.map(d => (
                  <tr key={d.id_despacho} className="border-t transition-colors hover:bg-white/[0.03]" style={{ borderColor: C.border }}>
                    <td className="px-3 py-3 font-mono text-xs whitespace-nowrap" style={{ color: C.cyan }}>{d.numero_pedido}</td>
                    <td className="px-3 py-3 text-white text-xs">{d.cliente}</td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap" style={{ color: C.textSec }}>{d.municipio_entrega}</td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                        style={{ background: estadoColor[d.estado]?.bg, color: estadoColor[d.estado]?.text }}>
                        {d.estado}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs" style={{ color: C.textSec }}>{d.responsable}</td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap" style={{ color: C.textSec }}>{formatFecha(d.fecha_despacho)}</td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap" style={{ color: C.textSec }}>{d.fecha_entrega_real ? formatFecha(d.fecha_entrega_real) : '—'}</td>
                    <td className="px-3 py-3 text-xs text-center" style={{ color: C.textSec }}>{d.dias_entrega ?? '—'}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <Tooltip title="Ver detalle">
                          <button onClick={() => { setDespachoSeleccionado(d); setModalDetalle(true) }}
                            className="p-1.5 rounded-lg transition-colors" style={{ color: C.cyan }}
                            onMouseEnter={e => e.currentTarget.style.background='rgba(0,212,255,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                            <VisibilityRounded style={{ fontSize: '1rem' }} />
                          </button>
                        </Tooltip>
                        {d.estado === 'En tránsito' && tieneRol('jefe_almacen','flota','ventas') && (
                          <Tooltip title="Confirmar entrega">
                            <button onClick={() => { setDespachoSeleccionado(d); setConfirmacion(''); setModalConfirmar(true) }}
                              className="p-1.5 rounded-lg transition-colors" style={{ color: '#22c55e' }}
                              onMouseEnter={e => e.currentTarget.style.background='rgba(34,197,94,0.1)'}
                              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                              <CheckCircleRounded style={{ fontSize: '1rem' }} />
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t" style={{ borderColor: C.border }}>
            <p className="text-xs" style={{ color: C.textSec }}>
              {filtrados.length} despacho{filtrados.length !== 1 ? 's' : ''} mostrado{filtrados.length !== 1 ? 's' : ''}
              {despachos.length !== filtrados.length && ` de ${despachos.length} total`}
            </p>
          </div>
        </div>
      </div>

      {/* Modal Confirmar entrega */}
      <Dialog open={modalConfirmar} onClose={() => setModalConfirmar(false)}
        sx={{ '& .MuiDialog-paper': { background:'#111111', border:`1px solid ${C.border}`, borderRadius:'16px', minWidth:420 }, '& .MuiDialogTitle-root':{ color:'white' }, '& .MuiDialogContent-root':{ color:'white' } }}>
        <DialogTitle sx={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:'1rem', fontWeight:600 }}>Confirmar entrega · {despachoSeleccionado?.numero_pedido}</span>
          <button onClick={() => setModalConfirmar(false)} style={{ color: C.textSec }}><CloseRounded /></button>
        </DialogTitle>
        <DialogContent>
          <p className="text-sm mb-3 mt-2" style={{ color: C.textSec }}>
            Cliente: <span className="text-white">{despachoSeleccionado?.cliente}</span>
          </p>
          <label className="text-xs block mb-1" style={{ color: C.cyan }}>Nota de confirmación del cliente</label>
          <input type="text" value={confirmacion} onChange={e => setConfirmacion(e.target.value)}
            placeholder="Ej: Entrega recibida conforme por el cliente"
            className="w-full px-3 py-2 rounded-lg text-white text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(0,212,255,0.3)` }} />
        </DialogContent>
        <DialogActions sx={{ px:3, pb:2 }}>
          <Button onClick={() => setModalConfirmar(false)} style={{ color: C.textSec, textTransform:'none' }}>Cancelar</Button>
          <Button onClick={handleConfirmar} disabled={procesando || !confirmacion}
            style={{ background:'linear-gradient(135deg,#22c55e,#16a34a)', color:'white', borderRadius:8, textTransform:'none' }}>
            {procesando ? 'Guardando...' : 'Confirmar entrega'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Detalle */}
      <Dialog open={modalDetalle} onClose={() => setModalDetalle(false)} maxWidth="sm" fullWidth sx={dialogSx}>
        <DialogTitle sx={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:'1rem', fontWeight:600 }}>Despacho · {despachoSeleccionado?.numero_pedido}</span>
          <button onClick={() => setModalDetalle(false)} style={{ color: C.textSec }}><CloseRounded /></button>
        </DialogTitle>
        <DialogContent>
          <div className="grid grid-cols-2 gap-4 text-xs mt-2">
            {[
              { label:'Cliente',      value: despachoSeleccionado?.cliente },
              { label:'Municipio',    value: despachoSeleccionado?.municipio_entrega },
              { label:'Responsable',  value: despachoSeleccionado?.responsable },
              { label:'Estado',       value: (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: estadoColor[despachoSeleccionado?.estado]?.bg, color: estadoColor[despachoSeleccionado?.estado]?.text }}>
                  {despachoSeleccionado?.estado}
                </span>
              )},
              { label:'Fecha despacho', value: formatFecha(despachoSeleccionado?.fecha_despacho) },
              { label:'Fecha entrega',  value: despachoSeleccionado?.fecha_entrega_real ? formatFecha(despachoSeleccionado?.fecha_entrega_real) : 'Pendiente' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="mb-1" style={{ color: C.textSec }}>{label}</p>
                <p className="text-white font-medium">{value}</p>
              </div>
            ))}
            {despachoSeleccionado?.confirmacion_cliente && (
              <div className="col-span-2">
                <p className="mb-1" style={{ color: C.textSec }}>Confirmación</p>
                <p className="text-white font-medium">{despachoSeleccionado?.confirmacion_cliente}</p>
              </div>
            )}
          </div>
        </DialogContent>
        <DialogActions sx={{ px:3, pb:2 }}>
          <Button onClick={() => setModalDetalle(false)} style={{ color: C.textSec, textTransform:'none' }}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal Gráfica */}
      <Dialog open={modalGrafica} onClose={() => setModalGrafica(false)} maxWidth="md" fullWidth sx={dialogSx}>
        <DialogTitle sx={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:'1rem', fontWeight:600 }}>Despachos por mes</span>
          <button onClick={() => setModalGrafica(false)} style={{ color: C.textSec }}><CloseRounded /></button>
        </DialogTitle>
        <DialogContent>
          <div style={{ height:300, marginTop:8 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosPorMes} margin={{ top:4, right:16, left:0, bottom:4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="mes" tick={{ fill: C.textSec, fontSize:11 }} axisLine={{ stroke: C.border }} tickLine={false} />
                <YAxis tick={{ fill: C.textSec, fontSize:11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <ReTooltip
                  contentStyle={{ background:'#1a1a1a', border:`1px solid ${C.border}`, borderRadius:8, fontSize:12 }}
                  labelStyle={{ color:'white', fontWeight:600 }}
                  itemStyle={{ color:'#22c55e' }}
                  formatter={v => [`${v} despachos`, 'Cantidad']} />
                <Bar dataKey="cantidad" fill="#22c55e" radius={[4,4,0,0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label:'Total despachos',    value: despachos.length },
              { label:'Meses con actividad', value: datosPorMes.length },
              { label:'Promedio / mes',      value: datosPorMes.length ? Math.round(despachos.length / datosPorMes.length) : 0 },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl p-3 text-center" style={{ background:'#0a0a0a', border:`1px solid ${C.border}` }}>
                <p className="text-lg font-bold" style={{ color:'#22c55e' }}>{value}</p>
                <p className="text-xs mt-0.5" style={{ color: C.textSec }}>{label}</p>
              </div>
            ))}
          </div>
        </DialogContent>
        <DialogActions sx={{ px:3, pb:2 }}>
          <Button onClick={() => setModalGrafica(false)} style={{ color: C.textSec, textTransform:'none' }}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}

export default Despachos