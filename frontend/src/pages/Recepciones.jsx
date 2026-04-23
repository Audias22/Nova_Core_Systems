import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { getRecepciones } from '../api/recepciones'
import { CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button, Tooltip } from '@mui/material'
import { VisibilityRounded, CloseRounded, BarChartRounded } from '@mui/icons-material'
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
  'Pendiente':    { bg: 'rgba(245,158,11,0.15)',  text: '#f59e0b' },
  'Inspeccionada':{ bg: 'rgba(0,212,255,0.15)',   text: '#00d4ff' },
  'Registrada':   { bg: 'rgba(34,197,94,0.15)',   text: '#22c55e' },
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

const Recepciones = () => {
  const [recepciones, setRecepciones] = useState([])
  const [cargando, setCargando]       = useState(true)
  const [filtro, setFiltro]           = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroDias, setFiltroDias]   = useState(null)
  const [modalDetalle, setModalDetalle] = useState(false)
  const [modalGrafica, setModalGrafica] = useState(false)
  const [recepcionSeleccionada, setRecepcionSeleccionada] = useState(null)

  useEffect(() => {
    const cargar = async () => {
      try { const data = await getRecepciones(); setRecepciones(data) }
      catch (e) { console.error(e) }
      finally { setCargando(false) }
    }
    cargar()
  }, [])

  const ahora = new Date()

  const filtradas = recepciones.filter(r => {
    const matchTexto  = r.numero_recepcion?.toLowerCase().includes(filtro.toLowerCase()) ||
                        r.proveedor?.toLowerCase().includes(filtro.toLowerCase()) ||
                        r.pais_origen?.toLowerCase().includes(filtro.toLowerCase())
    const matchEstado = filtroEstado ? r.estado === filtroEstado : true
    let matchTiempo   = true
    if (filtroDias !== null) {
      const f = parseFecha(r.fecha_recepcion)
      matchTiempo = f ? (ahora - f) / 86400000 <= filtroDias : false
    }
    return matchTexto && matchEstado && matchTiempo
  })

  const datosPorMes = (() => {
    const mapa = {}
    recepciones.forEach(r => {
      const f = parseFecha(r.fecha_recepcion); if (!f) return
      const clave = `${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,'0')}`
      const etiq  = f.toLocaleDateString('es-GT', { month: 'short', year: 'numeric' })
      if (!mapa[clave]) mapa[clave] = { mes: etiq, cantidad: 0 }
      mapa[clave].cantidad++
    })
    return Object.keys(mapa).sort().map(k => mapa[k])
  })()

  const estados = ['Pendiente', 'Inspeccionada', 'Registrada']

  if (cargando) return (
    <Layout titulo="Recepciones">
      <div className="flex items-center justify-center h-64">
        <CircularProgress sx={{ color: C.cyan }} />
      </div>
    </Layout>
  )

  return (
    <Layout titulo="Recepciones">
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
                {recepciones.filter(r => r.estado === estado).length}
              </p>
              <p className="text-xs mt-1" style={{ color: C.textSec }}>{estado}</p>
            </div>
          ))}
        </div>

        {/* Controles */}
        <div className="flex flex-wrap gap-3 items-center">
          <input type="text" placeholder="Buscar por número, proveedor o país..."
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

          <Tooltip title="Ver recepciones por mes">
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
                  {['Número','Proveedor','País','Estado','Registrado por','Fecha','Productos','Unid. recibidas','Unid. aprobadas','Acciones'].map(h => (
                    <th key={h} className="text-left font-medium px-3 py-3 text-xs whitespace-nowrap" style={{ color: C.textSec }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-10 text-center text-sm" style={{ color: C.textSec }}>No hay recepciones que coincidan.</td></tr>
                ) : filtradas.map(r => (
                  <tr key={r.id_recepcion} className="border-t transition-colors hover:bg-white/[0.03]" style={{ borderColor: C.border }}>
                    <td className="px-3 py-3 font-mono text-xs whitespace-nowrap" style={{ color: C.cyan }}>{r.numero_recepcion}</td>
                    <td className="px-3 py-3 text-white text-xs">{r.proveedor}</td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap" style={{ color: C.textSec }}>{r.pais_origen}</td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                        style={{ background: estadoColor[r.estado]?.bg, color: estadoColor[r.estado]?.text }}>
                        {r.estado}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs" style={{ color: C.textSec }}>{r.registrado_por}</td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap" style={{ color: C.textSec }}>{formatFecha(r.fecha_recepcion)}</td>
                    <td className="px-3 py-3 text-white text-xs text-center">{r.total_productos}</td>
                    <td className="px-3 py-3 text-white text-xs text-center">{r.unidades_recibidas}</td>
                    <td className="px-3 py-3 text-xs text-center">
                      <span style={{ color: r.unidades_aprobadas < r.unidades_recibidas ? '#f59e0b' : '#22c55e' }}>
                        {r.unidades_aprobadas}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <Tooltip title="Ver detalle">
                        <button onClick={() => { setRecepcionSeleccionada(r); setModalDetalle(true) }}
                          className="p-1.5 rounded-lg transition-colors" style={{ color: C.cyan }}
                          onMouseEnter={e => e.currentTarget.style.background='rgba(0,212,255,0.1)'}
                          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                          <VisibilityRounded style={{ fontSize: '1rem' }} />
                        </button>
                      </Tooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t" style={{ borderColor: C.border }}>
            <p className="text-xs" style={{ color: C.textSec }}>
              {filtradas.length} recepción{filtradas.length !== 1 ? 'es' : ''} mostrada{filtradas.length !== 1 ? 's' : ''}
              {recepciones.length !== filtradas.length && ` de ${recepciones.length} total`}
            </p>
          </div>
        </div>
      </div>

      {/* Modal Detalle */}
      <Dialog open={modalDetalle} onClose={() => setModalDetalle(false)} maxWidth="sm" fullWidth sx={dialogSx}>
        <DialogTitle sx={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:'1rem', fontWeight:600 }}>{recepcionSeleccionada?.numero_recepcion} · {recepcionSeleccionada?.proveedor}</span>
          <button onClick={() => setModalDetalle(false)} style={{ color: C.textSec }}><CloseRounded /></button>
        </DialogTitle>
        <DialogContent>
          <div className="grid grid-cols-2 gap-4 text-xs mt-2">
            {[
              { label: 'País de origen',      value: recepcionSeleccionada?.pais_origen },
              { label: 'Estado',              value: (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: estadoColor[recepcionSeleccionada?.estado]?.bg, color: estadoColor[recepcionSeleccionada?.estado]?.text }}>
                  {recepcionSeleccionada?.estado}
                </span>
              )},
              { label: 'Fecha de recepción',  value: formatFecha(recepcionSeleccionada?.fecha_recepcion) },
              { label: 'Registrado por',      value: recepcionSeleccionada?.registrado_por },
              { label: 'Unidades recibidas',  value: recepcionSeleccionada?.unidades_recibidas },
              { label: 'Unidades aprobadas',  value: (
                <span style={{ color: recepcionSeleccionada?.unidades_aprobadas < recepcionSeleccionada?.unidades_recibidas ? '#f59e0b' : '#22c55e', fontWeight:600 }}>
                  {recepcionSeleccionada?.unidades_aprobadas}
                </span>
              )},
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="mb-1" style={{ color: C.textSec }}>{label}</p>
                <p className="text-white font-medium">{value}</p>
              </div>
            ))}
          </div>
        </DialogContent>
        <DialogActions sx={{ px:3, pb:2 }}>
          <Button onClick={() => setModalDetalle(false)} style={{ color: C.textSec, textTransform:'none' }}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal Gráfica */}
      <Dialog open={modalGrafica} onClose={() => setModalGrafica(false)} maxWidth="md" fullWidth sx={dialogSx}>
        <DialogTitle sx={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:'1rem', fontWeight:600 }}>Recepciones por mes</span>
          <button onClick={() => setModalGrafica(false)} style={{ color: C.textSec }}><CloseRounded /></button>
        </DialogTitle>
        <DialogContent>
          <div style={{ height: 300, marginTop: 8 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosPorMes} margin={{ top:4, right:16, left:0, bottom:4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="mes" tick={{ fill: C.textSec, fontSize:11 }} axisLine={{ stroke: C.border }} tickLine={false} />
                <YAxis tick={{ fill: C.textSec, fontSize:11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <ReTooltip
                  contentStyle={{ background:'#1a1a1a', border:`1px solid ${C.border}`, borderRadius:8, fontSize:12 }}
                  labelStyle={{ color:'white', fontWeight:600 }}
                  itemStyle={{ color: C.cyan }}
                  formatter={v => [`${v} recepciones`, 'Cantidad']} />
                <Bar dataKey="cantidad" fill={C.cyan} radius={[4,4,0,0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label:'Total recepciones',    value: recepciones.length },
              { label:'Meses con actividad',  value: datosPorMes.length },
              { label:'Promedio / mes',        value: datosPorMes.length ? Math.round(recepciones.length / datosPorMes.length) : 0 },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl p-3 text-center" style={{ background:'#0a0a0a', border:`1px solid ${C.border}` }}>
                <p className="text-lg font-bold" style={{ color: C.cyan }}>{value}</p>
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

export default Recepciones