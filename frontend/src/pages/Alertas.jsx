import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { getAlertas, resolverAlerta, generarAlertasAutomaticas } from '../api/alertas'
import { CircularProgress, Tooltip } from '@mui/material'
import { CheckCircleRounded, AutorenewRounded } from '@mui/icons-material'
import { useAuth } from '../context/AuthContext'
import { formatFecha } from '../utils/fecha'

const tipoColor = {
  'Stock bajo': { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
  'Sin movimiento': { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
  'Mora cliente': { bg: 'rgba(168,85,247,0.15)', text: '#a855f7' },
  'Garantía proveedor': { bg: 'rgba(0,212,255,0.15)', text: '#00d4ff' }
}

const estadoColor = {
  'Activa': { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
  'Resuelta': { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
  'Ignorada': { bg: 'rgba(100,116,139,0.15)', text: '#64748b' }
}

const Alertas = () => {
  const { tieneRol } = useAuth()

  // Solo jefe_almacen y almacen pueden generar y resolver alertas
  // admin solo puede resolver, no generar
  // ventas, compras, informatica solo pueden ver
  const puedeGenerar = tieneRol('jefe_almacen', 'almacen')
  const puedeResolver = tieneRol('jefe_almacen', 'almacen', 'admin')

  const [alertas, setAlertas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Activa')
  const [procesando, setProcesando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const cargar = async () => {
    try {
      const data = await getAlertas()
      setAlertas(data)
    } catch (e) {
      console.error(e)
    } finally {
      setCargando(false)
    }
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
    } finally {
      setProcesando(false)
    }
  }

  const filtradas = alertas.filter(a => {
    const matchTexto = a.descripcion?.toLowerCase().includes(filtro.toLowerCase()) ||
      a.producto?.toLowerCase().includes(filtro.toLowerCase()) ||
      a.cliente?.toLowerCase().includes(filtro.toLowerCase())
    const matchEstado = filtroEstado ? a.estado === filtroEstado : true
    return matchTexto && matchEstado
  })

  const activas = alertas.filter(a => a.estado === 'Activa').length
  const resueltas = alertas.filter(a => a.estado === 'Resuelta').length
  const stockBajo = alertas.filter(a => a.tipo_alerta === 'Stock bajo' && a.estado === 'Activa').length
  const sinMovimiento = alertas.filter(a => a.tipo_alerta === 'Sin movimiento' && a.estado === 'Activa').length

  if (cargando) return (
    <Layout titulo="Alertas">
      <div className="flex items-center justify-center h-64">
        <CircularProgress sx={{ color: '#00d4ff' }} />
      </div>
    </Layout>
  )

  return (
    <Layout titulo="Alertas del Sistema">
      <div className="space-y-5">

        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-xl p-4 border border-red-900/30 text-center"
            style={{ background: 'rgba(239,68,68,0.05)' }}>
            <p className="text-2xl font-bold text-red-400">{activas}</p>
            <p className="text-slate-400 text-xs mt-1">Activas</p>
          </div>
          <div className="rounded-xl p-4 border border-green-900/30 text-center"
            style={{ background: 'rgba(34,197,94,0.05)' }}>
            <p className="text-2xl font-bold text-green-400">{resueltas}</p>
            <p className="text-slate-400 text-xs mt-1">Resueltas</p>
          </div>
          <div className="rounded-xl p-4 border border-red-900/30 text-center"
            style={{ background: 'rgba(239,68,68,0.05)' }}>
            <p className="text-2xl font-bold text-red-400">{stockBajo}</p>
            <p className="text-slate-400 text-xs mt-1">Stock bajo activas</p>
          </div>
          <div className="rounded-xl p-4 border border-yellow-900/30 text-center"
            style={{ background: 'rgba(245,158,11,0.05)' }}>
            <p className="text-2xl font-bold text-yellow-400">{sinMovimiento}</p>
            <p className="text-slate-400 text-xs mt-1">Sin movimiento activas</p>
          </div>
        </div>

        {mensaje && (
          <div className="px-4 py-3 rounded-lg text-sm"
            style={{
              background: mensaje.includes('Error') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
              color: mensaje.includes('Error') ? '#ef4444' : '#22c55e',
              border: `1px solid ${mensaje.includes('Error') ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`
            }}>
            {mensaje}
          </div>
        )}

        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Buscar por descripción, producto o cliente..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-lg text-white text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,212,255,0.2)' }}
          />
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-4 py-2.5 rounded-lg text-white text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,212,255,0.2)' }}>
            <option value="" style={{ background: '#0d1b3e' }}>Todos los estados</option>
            <option value="Activa" style={{ background: '#0d1b3e' }}>Activas</option>
            <option value="Resuelta" style={{ background: '#0d1b3e' }}>Resueltas</option>
            <option value="Ignorada" style={{ background: '#0d1b3e' }}>Ignoradas</option>
          </select>
          {puedeGenerar && (
            <button onClick={handleGenerar} disabled={procesando}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-all whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg, #00d4ff, #0066ff)' }}>
              <AutorenewRounded style={{ fontSize: '1rem' }} className={procesando ? 'animate-spin' : ''} />
              Generar alertas
            </button>
          )}
        </div>

        <div className="rounded-xl border border-blue-900/30 overflow-hidden"
          style={{ background: 'rgba(13,27,62,0.6)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
                  {['Tipo', 'Sistema', 'Estado', 'Producto', 'Cliente', 'Descripción', 'F. generación', 'F. resolución', 'Acciones'].map(h => (
                    <th key={h} className="text-left text-slate-400 font-medium px-3 py-3 text-xs whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.map((a) => (
                  <tr key={a.id_alerta} className="border-t border-blue-900/10 hover:bg-white/5 transition-colors">
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                        style={{ background: tipoColor[a.tipo_alerta]?.bg, color: tipoColor[a.tipo_alerta]?.text }}>
                        {a.tipo_alerta}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-300 text-xs font-mono whitespace-nowrap">{a.sistema_origen}</td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                        style={{ background: estadoColor[a.estado]?.bg, color: estadoColor[a.estado]?.text }}>
                        {a.estado}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-300 text-xs">{a.producto || '—'}</td>
                    <td className="px-3 py-3 text-slate-300 text-xs">{a.cliente || '—'}</td>
                    <td className="px-3 py-3 text-white text-xs max-w-48 truncate">{a.descripcion}</td>
                    <td className="px-3 py-3 text-slate-400 text-xs whitespace-nowrap">{formatFecha(a.fecha_generacion)}</td>
                    <td className="px-3 py-3 text-slate-400 text-xs whitespace-nowrap">{formatFecha(a.fecha_resolucion)}</td>
                    <td className="px-3 py-3">
                      {a.estado === 'Activa' && puedeResolver && (
                        <Tooltip title="Marcar como resuelta">
                          <button onClick={() => handleResolver(a.id_alerta)}
                            className="p-1.5 rounded-lg hover:bg-green-500/20 transition-colors text-green-400">
                            <CheckCircleRounded style={{ fontSize: '1rem' }} />
                          </button>
                        </Tooltip>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Alertas