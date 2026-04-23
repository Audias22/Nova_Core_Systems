import { useState, useEffect, useRef } from 'react'
import Layout from '../components/Layout'
import { getPedidos, aprobarPedido } from '../api/pedidos'
import { CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button, Tooltip } from '@mui/material'
import { CheckCircleRounded, VisibilityRounded, BarChartRounded, CloseRounded } from '@mui/icons-material'
import { useAuth } from '../context/AuthContext'
import { formatFecha } from '../utils/fecha'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts'

// ── Paleta ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#0a0a0a',
  card: '#1a1a1a',
  thead: '#141414',
  border: 'rgba(255,255,255,0.06)',
  cyan: '#00d4ff',
  textSec: 'rgba(255,255,255,0.35)',
}

const estadoColor = {
  'Pendiente':      { bg: 'rgba(245,158,11,0.15)',  text: '#f59e0b' },
  'Aprobado':       { bg: 'rgba(0,212,255,0.15)',   text: '#00d4ff' },
  'En preparación': { bg: 'rgba(168,85,247,0.15)',  text: '#a855f7' },
  'Despachado':     { bg: 'rgba(34,197,94,0.15)',   text: '#22c55e' },
  'Entregado':      { bg: 'rgba(100,116,139,0.15)', text: '#94a3b8' },
  'Cancelado':      { bg: 'rgba(239,68,68,0.15)',   text: '#ef4444' },
}

const dialogSx = {
  '& .MuiDialog-paper': {
    background: '#111111',
    border: `1px solid ${C.border}`,
    borderRadius: '16px',
  },
  '& .MuiDialogTitle-root': { color: 'white' },
  '& .MuiDialogContent-root': { color: 'white' },
}

// ── Parseo de fecha GMT ──────────────────────────────────────────────────────
// fecha_pedido llega como "Wed, 22 Apr 2026 00:00:00 GMT"
const parseFecha = (f) => {
  if (!f) return null
  const d = new Date(f)
  return isNaN(d.getTime()) ? null : d
}

const FILTROS_TIEMPO = [
  { label: '7D',  dias: 7 },
  { label: '30D', dias: 30 },
  { label: '90D', dias: 90 },
  { label: 'Todo', dias: null },
]

// ── Componente principal ─────────────────────────────────────────────────────
const Pedidos = () => {
  const { tieneRol } = useAuth()
  const [pedidos, setPedidos]               = useState([])
  const [cargando, setCargando]             = useState(true)
  const [filtro, setFiltro]                 = useState('')
  const [filtroEstado, setFiltroEstado]     = useState('')
  const [filtroDias, setFiltroDias]         = useState(null)   // null = Todo
  const [modalDetalle, setModalDetalle]     = useState(false)
  const [modalGrafica, setModalGrafica]     = useState(false)
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null)
  const [procesando, setProcesando]         = useState(false)
  const [mensaje, setMensaje]               = useState('')

  const cargar = async () => {
    try {
      const data = await getPedidos()
      setPedidos(data)
    } catch (e) {
      console.error(e)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const handleAprobar = async (id_pedido) => {
    setProcesando(true)
    try {
      await aprobarPedido(id_pedido)
      await cargar()
      setMensaje('Pedido aprobado correctamente')
      setTimeout(() => setMensaje(''), 3000)
    } catch (e) {
      setMensaje(e.response?.data?.error || 'Error al aprobar pedido')
      setTimeout(() => setMensaje(''), 3000)
    } finally {
      setProcesando(false)
    }
  }

  // ── Filtrado ───────────────────────────────────────────────────────────────
  const ahora = new Date()

  const filtrados = pedidos.filter(p => {
    const matchTexto  = p.numero_pedido?.toLowerCase().includes(filtro.toLowerCase()) ||
                        p.cliente?.toLowerCase().includes(filtro.toLowerCase())
    const matchEstado = filtroEstado ? p.estado === filtroEstado : true

    let matchTiempo = true
    if (filtroDias !== null) {
      const fecha = parseFecha(p.fecha_pedido)
      if (fecha) {
        const diffMs  = ahora - fecha
        const diffDias = diffMs / (1000 * 60 * 60 * 24)
        matchTiempo = diffDias <= filtroDias
      } else {
        matchTiempo = false
      }
    }

    return matchTexto && matchEstado && matchTiempo
  })

  const estados = [...new Set(pedidos.map(p => p.estado))]

  // ── Datos para gráfica: pedidos por mes (todos los pedidos, sin filtro de tiempo) ──
  const datosPorMes = (() => {
    const mapa = {}
    pedidos.forEach(p => {
      const fecha = parseFecha(p.fecha_pedido)
      if (!fecha) return
      const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
      const etiqueta = fecha.toLocaleDateString('es-GT', { month: 'short', year: 'numeric' })
      if (!mapa[clave]) mapa[clave] = { mes: etiqueta, cantidad: 0, total: 0 }
      mapa[clave].cantidad += 1
      mapa[clave].total += Number(p.total || 0)
    })
    return Object.keys(mapa).sort().map(k => mapa[k])
  })()

  // ── Cards resumen ──────────────────────────────────────────────────────────
  const resumenEstados = ['Pendiente', 'Aprobado', 'Despachado', 'Entregado']

  if (cargando) return (
    <Layout titulo="Pedidos">
      <div className="flex items-center justify-center h-64">
        <CircularProgress sx={{ color: C.cyan }} />
      </div>
    </Layout>
  )

  return (
    <Layout titulo="Pedidos">
      <div className="space-y-5">

        {/* ── Cards resumen ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4">
          {resumenEstados.map(estado => (
            <div
              key={estado}
              onClick={() => setFiltroEstado(filtroEstado === estado ? '' : estado)}
              className="rounded-xl p-4 text-center cursor-pointer transition-all"
              style={{
                background: filtroEstado === estado
                  ? `${estadoColor[estado]?.bg}`
                  : C.card,
                border: `1px solid ${filtroEstado === estado ? estadoColor[estado]?.text + '40' : C.border}`,
              }}
            >
              <p className="text-2xl font-bold" style={{ color: estadoColor[estado]?.text }}>
                {pedidos.filter(p => p.estado === estado).length}
              </p>
              <p className="text-xs mt-1" style={{ color: C.textSec }}>{estado}</p>
            </div>
          ))}
        </div>

        {/* ── Mensaje ────────────────────────────────────────────────────── */}
        {mensaje && (
          <div className="px-4 py-3 rounded-lg text-sm" style={{
            background: mensaje.includes('Error') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
            color: mensaje.includes('Error') ? '#ef4444' : '#22c55e',
            border: `1px solid ${mensaje.includes('Error') ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
          }}>
            {mensaje}
          </div>
        )}

        {/* ── Controles: filtro texto + estado + tiempo + gráfica ─────────── */}
        <div className="flex flex-wrap gap-3 items-center">

          {/* Búsqueda */}
          <input
            type="text"
            placeholder="Buscar por número de pedido o cliente..."
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            className="flex-1 min-w-48 px-4 py-2.5 rounded-lg text-white text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}` }}
          />

          {/* Select estado */}
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            className="px-4 py-2.5 rounded-lg text-white text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}` }}
          >
            <option value="" style={{ background: '#1a1a1a' }}>Todos los estados</option>
            {estados.map(e => (
              <option key={e} value={e} style={{ background: '#1a1a1a' }}>{e}</option>
            ))}
          </select>

          {/* Filtro tiempo */}
          <div className="flex gap-1 rounded-lg p-1" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            {FILTROS_TIEMPO.map(({ label, dias }) => (
              <button
                key={label}
                onClick={() => setFiltroDias(dias)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                style={{
                  background: filtroDias === dias ? C.cyan : 'transparent',
                  color: filtroDias === dias ? '#000' : C.textSec,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Botón gráfica */}
          <Tooltip title="Ver pedidos por mes">
            <button
              onClick={() => setModalGrafica(true)}
              className="p-2.5 rounded-lg transition-all"
              style={{ background: C.card, border: `1px solid ${C.border}`, color: C.cyan }}
            >
              <BarChartRounded style={{ fontSize: '1.2rem' }} />
            </button>
          </Tooltip>
        </div>

        {/* ── Tabla ──────────────────────────────────────────────────────── */}
        <div className="rounded-xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: C.thead }}>
                  {['Número', 'Cliente', 'Tipo', 'Estado', 'Total', 'Fecha', 'Aprobado por', 'Acciones'].map(h => (
                    <th key={h} className="text-left font-medium px-4 py-3 text-xs whitespace-nowrap"
                      style={{ color: C.textSec }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm" style={{ color: C.textSec }}>
                      No hay pedidos que coincidan con los filtros.
                    </td>
                  </tr>
                ) : filtrados.map(pedido => (
                  <tr key={pedido.id_pedido}
                    className="border-t transition-colors hover:bg-white/[0.03]"
                    style={{ borderColor: C.border }}>
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap" style={{ color: C.cyan }}>
                      {pedido.numero_pedido}
                    </td>
                    <td className="px-4 py-3 text-white text-xs">{pedido.cliente}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.textSec }}>
                      {pedido.tipo_cliente}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                        style={{
                          background: estadoColor[pedido.estado]?.bg,
                          color: estadoColor[pedido.estado]?.text,
                        }}>
                        {pedido.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white text-xs font-semibold whitespace-nowrap">
                      Q{Number(pedido.total).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: C.textSec }}>
                      {formatFecha(pedido.fecha_pedido)}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: C.textSec }}>
                      {pedido.aprobado_por || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Tooltip title="Ver detalle">
                          <button
                            onClick={() => { setPedidoSeleccionado(pedido); setModalDetalle(true) }}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: C.cyan }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,255,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <VisibilityRounded style={{ fontSize: '1rem' }} />
                          </button>
                        </Tooltip>
                        {pedido.estado === 'Pendiente' && tieneRol('jefe_almacen', 'admin') && (
                          <Tooltip title="Aprobar pedido">
                            <button
                              onClick={() => handleAprobar(pedido.id_pedido)}
                              disabled={procesando}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ color: '#22c55e' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,197,94,0.1)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
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

          {/* Footer tabla */}
          <div className="px-4 py-2.5 border-t" style={{ borderColor: C.border }}>
            <p className="text-xs" style={{ color: C.textSec }}>
              {filtrados.length} pedido{filtrados.length !== 1 ? 's' : ''} mostrado{filtrados.length !== 1 ? 's' : ''}
              {pedidos.length !== filtrados.length && ` de ${pedidos.length} total`}
            </p>
          </div>
        </div>
      </div>

      {/* ── Modal Detalle ───────────────────────────────────────────────────── */}
      <Dialog open={modalDetalle} onClose={() => setModalDetalle(false)} maxWidth="sm" fullWidth sx={dialogSx}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '1rem', fontWeight: 600 }}>
            {pedidoSeleccionado?.numero_pedido} · {pedidoSeleccionado?.cliente}
          </span>
          <button onClick={() => setModalDetalle(false)} style={{ color: C.textSec }}>
            <CloseRounded />
          </button>
        </DialogTitle>
        <DialogContent>
          <div className="grid grid-cols-2 gap-4 mt-2 text-xs">
            {[
              { label: 'Estado', value: (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: estadoColor[pedidoSeleccionado?.estado]?.bg, color: estadoColor[pedidoSeleccionado?.estado]?.text }}>
                  {pedidoSeleccionado?.estado}
                </span>
              )},
              { label: 'Tipo de cliente', value: pedidoSeleccionado?.tipo_cliente },
              { label: 'Fecha del pedido', value: formatFecha(pedidoSeleccionado?.fecha_pedido) },
              { label: 'Total', value: `Q${Number(pedidoSeleccionado?.total || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}` },
              { label: 'Cliente', value: pedidoSeleccionado?.cliente },
              { label: 'Aprobado por', value: pedidoSeleccionado?.aprobado_por || '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="mb-1" style={{ color: C.textSec }}>{label}</p>
                <p className="text-white font-medium">{value}</p>
              </div>
            ))}
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setModalDetalle(false)} style={{ color: C.textSec, textTransform: 'none' }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Modal Gráfica ───────────────────────────────────────────────────── */}
      <Dialog open={modalGrafica} onClose={() => setModalGrafica(false)} maxWidth="md" fullWidth sx={dialogSx}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '1rem', fontWeight: 600 }}>Pedidos por mes</span>
          <button onClick={() => setModalGrafica(false)} style={{ color: C.textSec }}>
            <CloseRounded />
          </button>
        </DialogTitle>
        <DialogContent>
          {datosPorMes.length === 0 ? (
            <p className="text-center py-10 text-sm" style={{ color: C.textSec }}>Sin datos para mostrar.</p>
          ) : (
            <div style={{ height: 320, marginTop: 8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosPorMes} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="mes"
                    tick={{ fill: C.textSec, fontSize: 11 }}
                    axisLine={{ stroke: C.border }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: C.textSec, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <ReTooltip
                    contentStyle={{ background: '#1a1a1a', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: 'white', fontWeight: 600 }}
                    itemStyle={{ color: C.cyan }}
                    formatter={(value) => [`${value} pedidos`, 'Cantidad']}
                  />
                  <Bar dataKey="cantidad" fill={C.cyan} radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Resumen debajo de la gráfica */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: 'Total pedidos', value: pedidos.length },
              { label: 'Meses con actividad', value: datosPorMes.length },
              { label: 'Promedio / mes', value: datosPorMes.length ? Math.round(pedidos.length / datosPorMes.length) : 0 },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl p-3 text-center"
                style={{ background: '#0a0a0a', border: `1px solid ${C.border}` }}>
                <p className="text-lg font-bold" style={{ color: C.cyan }}>{value}</p>
                <p className="text-xs mt-0.5" style={{ color: C.textSec }}>{label}</p>
              </div>
            ))}
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setModalGrafica(false)} style={{ color: C.textSec, textTransform: 'none' }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}

export default Pedidos