import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { getDevoluciones, resolverDevolucion } from '../api/devoluciones'
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
  'Abierto':    { bg: 'rgba(239,68,68,0.15)',  text: '#ef4444' },
  'En revisión':{ bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
  'Resuelto':   { bg: 'rgba(34,197,94,0.15)',  text: '#22c55e' },
}

const plazoColor = {
  'En plazo':       { bg: 'rgba(34,197,94,0.15)',  text: '#22c55e' },
  'Fuera de plazo': { bg: 'rgba(239,68,68,0.15)',  text: '#ef4444' },
}

const dialogSx = {
  '& .MuiDialog-paper': { background: '#111111', border: `1px solid rgba(255,255,255,0.06)`, borderRadius: '16px' },
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

const Devoluciones = () => {
  const { tieneRol } = useAuth()
  const [devoluciones, setDevoluciones] = useState([])
  const [cargando, setCargando]         = useState(true)
  const [filtro, setFiltro]             = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroDias, setFiltroDias]     = useState(null)
  const [modalResolver, setModalResolver]   = useState(false)
  const [modalDetalle, setModalDetalle]     = useState(false)
  const [modalGrafica, setModalGrafica]     = useState(false)
  const [devolucionSeleccionada, setDevolucionSeleccionada] = useState(null)
  const [resolucion, setResolucion] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [mensaje, setMensaje]       = useState('')

  const cargar = async () => {
    try { const data = await getDevoluciones(); setDevoluciones(data) }
    catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])

  const handleResolver = async () => {
    if (!resolucion) return
    setProcesando(true)
    try {
      await resolverDevolucion(devolucionSeleccionada.id_devolucion, resolucion)
      await cargar()
      setMensaje('Devolución resuelta correctamente')
      setModalResolver(false)
      setTimeout(() => setMensaje(''), 3000)
    } catch (e) {
      setMensaje(e.response?.data?.error || 'Error al resolver devolución')
      setTimeout(() => setMensaje(''), 3000)
    } finally {
      setProcesando(false)
    }
  }

  const ahora = new Date()

  const filtradas = devoluciones.filter(d => {
    const matchTexto  = d.numero_caso?.toLowerCase().includes(filtro.toLowerCase()) ||
                        d.cliente?.toLowerCase().includes(filtro.toLowerCase()) ||
                        d.numero_pedido?.toLowerCase().includes(filtro.toLowerCase())
    const matchEstado = filtroEstado ? d.estado === filtroEstado : true
    let matchTiempo   = true
    if (filtroDias !== null) {
      const f = parseFecha(d.fecha_reclamo)
      matchTiempo = f ? (ahora - f) / 86400000 <= filtroDias : false
    }
    return matchTexto && matchEstado && matchTiempo
  })

  const datosPorMes = (() => {
    const mapa = {}
    devoluciones.forEach(d => {
      const f = parseFecha(d.fecha_reclamo); if (!f) return
      const clave = `${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,'0')}`
      const etiq  = f.toLocaleDateString('es-GT', { month:'short', year:'numeric' })
      if (!mapa[clave]) mapa[clave] = { mes: etiq, cantidad: 0 }
      mapa[clave].cantidad++
    })
    return Object.keys(mapa).sort().map(k => mapa[k])
  })()

  const estados = ['Abierto', 'En revisión', 'Resuelto']

  if (cargando) return (
    <Layout titulo="Devoluciones">
      <div className="flex items-center justify-center h-64">
        <CircularProgress sx={{ color: C.cyan }} />
      </div>
    </Layout>
  )

  return (
    <Layout titulo="Devoluciones y Garantías">
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
                {devoluciones.filter(d => d.estado === estado).length}
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
          <input type="text" placeholder="Buscar por caso, cliente o pedido..."
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

          <Tooltip title="Ver devoluciones por mes">
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
                  {['Caso','Pedido','Cliente','Estado','Plazo','Responsable','F. reclamo','F. límite','Motivo','Acciones'].map(h => (
                    <th key={h} className="text-left font-medium px-3 py-3 text-xs whitespace-nowrap" style={{ color: C.textSec }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-10 text-center text-sm" style={{ color: C.textSec }}>No hay devoluciones que coincidan.</td></tr>
                ) : filtradas.map(d => (
                  <tr key={d.id_devolucion} className="border-t transition-colors hover:bg-white/[0.03]" style={{ borderColor: C.border }}>
                    <td className="px-3 py-3 font-mono text-xs whitespace-nowrap" style={{ color: C.cyan }}>{d.numero_caso}</td>
                    <td className="px-3 py-3 font-mono text-xs whitespace-nowrap" style={{ color: C.textSec }}>{d.numero_pedido}</td>
                    <td className="px-3 py-3 text-white text-xs">{d.cliente}</td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                        style={{ background: estadoColor[d.estado]?.bg, color: estadoColor[d.estado]?.text }}>
                        {d.estado}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                        style={{ background: plazoColor[d.plazo]?.bg, color: plazoColor[d.plazo]?.text }}>
                        {d.plazo}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs" style={{ color: C.textSec }}>{d.responsable_ventas}</td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap" style={{ color: C.textSec }}>{formatFecha(d.fecha_reclamo)}</td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap" style={{ color: C.textSec }}>{formatFecha(d.fecha_limite_reclamo)}</td>
                    <td className="px-3 py-3 text-xs max-w-32 truncate" style={{ color: C.textSec }}>{d.motivo}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <Tooltip title="Ver detalle">
                          <button onClick={() => { setDevolucionSeleccionada(d); setModalDetalle(true) }}
                            className="p-1.5 rounded-lg transition-colors" style={{ color: C.cyan }}
                            onMouseEnter={e => e.currentTarget.style.background='rgba(0,212,255,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                            <VisibilityRounded style={{ fontSize: '1rem' }} />
                          </button>
                        </Tooltip>
                        {d.estado !== 'Resuelto' && tieneRol('jefe_almacen','ventas') && (
                          <Tooltip title="Resolver caso">
                            <button onClick={() => { setDevolucionSeleccionada(d); setResolucion(''); setModalResolver(true) }}
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
              {filtradas.length} caso{filtradas.length !== 1 ? 's' : ''} mostrado{filtradas.length !== 1 ? 's' : ''}
              {devoluciones.length !== filtradas.length && ` de ${devoluciones.length} total`}
            </p>
          </div>
        </div>
      </div>

      {/* Modal Resolver */}
      <Dialog open={modalResolver} onClose={() => setModalResolver(false)}
        sx={{ '& .MuiDialog-paper':{ background:'#111111', border:`1px solid ${C.border}`, borderRadius:'16px', minWidth:420 }, '& .MuiDialogTitle-root':{ color:'white' }, '& .MuiDialogContent-root':{ color:'white' } }}>
        <DialogTitle sx={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:'1rem', fontWeight:600 }}>Resolver caso · {devolucionSeleccionada?.numero_caso}</span>
          <button onClick={() => setModalResolver(false)} style={{ color: C.textSec }}><CloseRounded /></button>
        </DialogTitle>
        <DialogContent>
          <div className="space-y-3 mt-2">
            <p className="text-xs" style={{ color: C.textSec }}>Cliente: <span className="text-white">{devolucionSeleccionada?.cliente}</span></p>
            <p className="text-xs" style={{ color: C.textSec }}>Motivo: <span className="text-white">{devolucionSeleccionada?.motivo}</span></p>
            <div>
              <label className="text-xs block mb-1" style={{ color: C.cyan }}>Resolución aplicada</label>
              <textarea value={resolucion} onChange={e => setResolucion(e.target.value)}
                placeholder="Describe la resolución aplicada al caso..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-white text-sm outline-none resize-none"
                style={{ background: 'rgba(255,255,255,0.05)', border:`1px solid rgba(0,212,255,0.3)` }} />
            </div>
          </div>
        </DialogContent>
        <DialogActions sx={{ px:3, pb:2 }}>
          <Button onClick={() => setModalResolver(false)} style={{ color: C.textSec, textTransform:'none' }}>Cancelar</Button>
          <Button onClick={handleResolver} disabled={procesando || !resolucion}
            style={{ background:'linear-gradient(135deg,#22c55e,#16a34a)', color:'white', borderRadius:8, textTransform:'none' }}>
            {procesando ? 'Guardando...' : 'Resolver caso'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Detalle */}
      <Dialog open={modalDetalle} onClose={() => setModalDetalle(false)} maxWidth="sm" fullWidth sx={dialogSx}>
        <DialogTitle sx={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:'1rem', fontWeight:600 }}>{devolucionSeleccionada?.numero_caso} · {devolucionSeleccionada?.cliente}</span>
          <button onClick={() => setModalDetalle(false)} style={{ color: C.textSec }}><CloseRounded /></button>
        </DialogTitle>
        <DialogContent>
          <div className="grid grid-cols-2 gap-4 text-xs mt-2">
            {[
              { label:'Pedido relacionado', value: <span className="font-mono">{devolucionSeleccionada?.numero_pedido}</span> },
              { label:'Estado', value: (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: estadoColor[devolucionSeleccionada?.estado]?.bg, color: estadoColor[devolucionSeleccionada?.estado]?.text }}>
                  {devolucionSeleccionada?.estado}
                </span>
              )},
              { label:'Fecha reclamo', value: formatFecha(devolucionSeleccionada?.fecha_reclamo) },
              { label:'Fecha límite',  value: formatFecha(devolucionSeleccionada?.fecha_limite_reclamo) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="mb-1" style={{ color: C.textSec }}>{label}</p>
                <p className="text-white font-medium">{value}</p>
              </div>
            ))}
            <div className="col-span-2">
              <p className="mb-1" style={{ color: C.textSec }}>Motivo</p>
              <p className="text-white">{devolucionSeleccionada?.motivo}</p>
            </div>
            {devolucionSeleccionada?.resolucion && (
              <div className="col-span-2">
                <p className="mb-1" style={{ color: C.textSec }}>Resolución</p>
                <p className="text-white">{devolucionSeleccionada?.resolucion}</p>
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
          <span style={{ fontSize:'1rem', fontWeight:600 }}>Devoluciones por mes</span>
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
                  itemStyle={{ color:'#ef4444' }}
                  formatter={v => [`${v} devoluciones`, 'Cantidad']} />
                <Bar dataKey="cantidad" fill="#ef4444" radius={[4,4,0,0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label:'Total casos',        value: devoluciones.length },
              { label:'Meses con actividad', value: datosPorMes.length },
              { label:'Resueltos',           value: devoluciones.filter(d => d.estado === 'Resuelto').length },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl p-3 text-center" style={{ background:'#0a0a0a', border:`1px solid ${C.border}` }}>
                <p className="text-lg font-bold" style={{ color:'#ef4444' }}>{value}</p>
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

export default Devoluciones