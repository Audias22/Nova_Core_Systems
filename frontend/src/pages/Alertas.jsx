import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { getAlertas, resolverAlerta, generarAlertasAutomaticas } from '../api/alertas'
import { CircularProgress, Tooltip } from '@mui/material'
import { CheckCircleRounded, AutorenewRounded } from '@mui/icons-material'
import { useAuth } from '../context/AuthContext'
import { formatFecha } from '../utils/fecha'

const C = {
  bg: '#0a0a0a',
  card: '#1a1a1a',
  thead: '#141414',
  border: 'rgba(255,255,255,0.06)',
  cyan: '#00d4ff',
  textSec: 'rgba(255,255,255,0.35)',
}

const tipoColor = {
  'Stock bajo':         { bg: 'rgba(239,68,68,0.15)',  text: '#ef4444' },
  'Sin movimiento':     { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
  'Mora cliente':       { bg: 'rgba(168,85,247,0.15)', text: '#a855f7' },
  'Garantía proveedor': { bg: 'rgba(0,212,255,0.15)',  text: '#00d4ff' },
}

const estadoColor = {
  'Activa':   { bg: 'rgba(239,68,68,0.15)',  text: '#ef4444' },
  'Resuelta': { bg: 'rgba(34,197,94,0.15)',  text: '#22c55e' },
  'Ignorada': { bg: 'rgba(100,116,139,0.15)',text: '#64748b' },
}

const Alertas = () => {
  const { tieneRol } = useAuth()
  const puedeGenerar  = tieneRol('jefe_almacen', 'almacen')
  const puedeResolver = tieneRol('jefe_almacen', 'almacen', 'admin')

  const [alertas, setAlertas]           = useState([])
  const [cargando, setCargando]         = useState(true)
  const [filtro, setFiltro]             = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Activa')
  const [procesando, setProcesando]     = useState(false)
  const [mensaje, setMensaje]           = useState('')

  const cargar = async () => {
    try { const data = await getAlertas(); setAlertas(data) }
    catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])

  const handleResolver = async (id_alerta) => {
    try {
      await resolverAlerta(id_alerta)
      await cargar()
      setMensaje('Alerta resuelta correctamente')
      setTimeout(() => setMensaje(''), 3000)
    } catch (e) {
      setMensaje(e.response?.data?.error || 'Error al resolver alerta')
      setTimeout(() => setMensaje(''), 3000)
    }
  }

  const handleGenerar = async () => {
    setProcesando(true)
    try {
      const data = await generarAlertasAutomaticas()
      await cargar()
      setMensaje(data.mensaje)
      setTimeout(() => setMensaje(''), 4000)
    } catch (e) {
      setMensaje(e.response?.data?.error || 'Error al generar alertas')
      setTimeout(() => setMensaje(''), 3000)
    } finally {
      setProcesando(false)
    }
  }

  const filtradas = alertas.filter(a => {
    const matchTexto  = a.descripcion?.toLowerCase().includes(filtro.toLowerCase()) ||
                        a.producto?.toLowerCase().includes(filtro.toLowerCase()) ||
                        a.cliente?.toLowerCase().includes(filtro.toLowerCase())
    const matchEstado = filtroEstado ? a.estado === filtroEstado : true
    return matchTexto && matchEstado
  })

  const activas      = alertas.filter(a => a.estado === 'Activa').length
  const resueltas    = alertas.filter(a => a.estado === 'Resuelta').length
  const stockBajo    = alertas.filter(a => a.tipo_alerta === 'Stock bajo' && a.estado === 'Activa').length
  const sinMovimient = alertas.filter(a => a.tipo_alerta === 'Sin movimiento' && a.estado === 'Activa').length

  const cards = [
    { label:'Activas',              value: activas,      color:'#ef4444', bg:'rgba(239,68,68,0.08)',   border:'rgba(239,68,68,0.2)',   key:'activas' },
    { label:'Resueltas',            value: resueltas,    color:'#22c55e', bg:'rgba(34,197,94,0.08)',   border:'rgba(34,197,94,0.2)',   key:'resueltas' },
    { label:'Stock bajo activas',   value: stockBajo,    color:'#ef4444', bg:'rgba(239,68,68,0.08)',   border:'rgba(239,68,68,0.2)',   key:'stock' },
    { label:'Sin movimiento activas',value: sinMovimient,color:'#f59e0b', bg:'rgba(245,158,11,0.08)', border:'rgba(245,158,11,0.2)', key:'sinmov' },
  ]

  if (cargando) return (
    <Layout titulo="Alertas">
      <div className="flex items-center justify-center h-64">
        <CircularProgress sx={{ color: C.cyan }} />
      </div>
    </Layout>
  )

  return (
    <Layout titulo="Alertas del Sistema">
      <div className="space-y-5">

        {/* Cards */}
        <div className="grid grid-cols-4 gap-4">
          {cards.map(c => (
            <div key={c.key} className="rounded-xl p-4 text-center"
              style={{ background: c.bg, border: `1px solid ${c.border}` }}>
              <p className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</p>
              <p className="text-xs mt-1" style={{ color: C.textSec }}>{c.label}</p>
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
          <input type="text" placeholder="Buscar por descripción, producto o cliente..."
            value={filtro} onChange={e => setFiltro(e.target.value)}
            className="flex-1 min-w-48 px-4 py-2.5 rounded-lg text-white text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}` }} />

          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
            className="px-4 py-2.5 rounded-lg text-white text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}` }}>
            <option value="" style={{ background:'#1a1a1a' }}>Todos los estados</option>
            <option value="Activa"   style={{ background:'#1a1a1a' }}>Activas</option>
            <option value="Resuelta" style={{ background:'#1a1a1a' }}>Resueltas</option>
            <option value="Ignorada" style={{ background:'#1a1a1a' }}>Ignoradas</option>
          </select>

          {puedeGenerar && (
            <button onClick={handleGenerar} disabled={procesando}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-black text-sm font-medium transition-all whitespace-nowrap"
              style={{ background: C.cyan }}>
              <AutorenewRounded style={{ fontSize:'1rem' }} className={procesando ? 'animate-spin' : ''} />
              Generar alertas
            </button>
          )}
        </div>

        {/* Tabla */}
        <div className="rounded-xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: C.thead }}>
                  {['Tipo','Sistema','Estado','Producto','Cliente','Descripción','F. generación','F. resolución','Acciones'].map(h => (
                    <th key={h} className="text-left font-medium px-3 py-3 text-xs whitespace-nowrap" style={{ color: C.textSec }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-sm" style={{ color: C.textSec }}>No hay alertas que coincidan.</td></tr>
                ) : filtradas.map(a => (
                  <tr key={a.id_alerta} className="border-t transition-colors hover:bg-white/[0.03]" style={{ borderColor: C.border }}>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                        style={{ background: tipoColor[a.tipo_alerta]?.bg, color: tipoColor[a.tipo_alerta]?.text }}>
                        {a.tipo_alerta}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs whitespace-nowrap" style={{ color: C.textSec }}>{a.sistema_origen}</td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                        style={{ background: estadoColor[a.estado]?.bg, color: estadoColor[a.estado]?.text }}>
                        {a.estado}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs" style={{ color: C.textSec }}>{a.producto || '—'}</td>
                    <td className="px-3 py-3 text-xs" style={{ color: C.textSec }}>{a.cliente || '—'}</td>
                    <td className="px-3 py-3 text-white text-xs max-w-48 truncate">{a.descripcion}</td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap" style={{ color: C.textSec }}>{formatFecha(a.fecha_generacion)}</td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap" style={{ color: C.textSec }}>{a.fecha_resolucion ? formatFecha(a.fecha_resolucion) : '—'}</td>
                    <td className="px-3 py-3">
                      {a.estado === 'Activa' && puedeResolver && (
                        <Tooltip title="Marcar como resuelta">
                          <button onClick={() => handleResolver(a.id_alerta)}
                            className="p-1.5 rounded-lg transition-colors" style={{ color:'#22c55e' }}
                            onMouseEnter={e => e.currentTarget.style.background='rgba(34,197,94,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                            <CheckCircleRounded style={{ fontSize:'1rem' }} />
                          </button>
                        </Tooltip>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t" style={{ borderColor: C.border }}>
            <p className="text-xs" style={{ color: C.textSec }}>
              {filtradas.length} alerta{filtradas.length !== 1 ? 's' : ''} mostrada{filtradas.length !== 1 ? 's' : ''}
              {alertas.length !== filtradas.length && ` de ${alertas.length} total`}
            </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Alertas