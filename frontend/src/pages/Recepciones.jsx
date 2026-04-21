import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { getRecepciones } from '../api/recepciones'
import { CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button, Tooltip } from '@mui/material'
import { VisibilityRounded } from '@mui/icons-material'
import { formatFecha } from '../utils/fecha'

const estadoColor = {
  'Pendiente': { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
  'Inspeccionada': { bg: 'rgba(0,212,255,0.15)', text: '#00d4ff' },
  'Registrada': { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' }
}

const dialogSx = {
  '& .MuiDialog-paper': { background: '#0d1b3e', border: '1px solid #1e3a6e', borderRadius: '16px' },
  '& .MuiDialogTitle-root': { color: 'white' },
  '& .MuiDialogContent-root': { color: 'white' },
}

const Recepciones = () => {
  const [recepciones, setRecepciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [modalDetalle, setModalDetalle] = useState(false)
  const [recepcionSeleccionada, setRecepcionSeleccionada] = useState(null)

  useEffect(() => {
    const cargar = async () => {
      try {
        const data = await getRecepciones()
        setRecepciones(data)
      } catch (e) {
        console.error(e)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  const filtradas = recepciones.filter(r =>
    r.numero_recepcion?.toLowerCase().includes(filtro.toLowerCase()) ||
    r.proveedor?.toLowerCase().includes(filtro.toLowerCase()) ||
    r.pais_origen?.toLowerCase().includes(filtro.toLowerCase())
  )

  if (cargando) return (
    <Layout titulo="Recepciones">
      <div className="flex items-center justify-center h-64">
        <CircularProgress sx={{ color: '#00d4ff' }} />
      </div>
    </Layout>
  )

  return (
    <Layout titulo="Recepciones">
      <div className="space-y-5">

        <div className="grid grid-cols-3 gap-4">
          {['Pendiente', 'Inspeccionada', 'Registrada'].map(estado => (
            <div key={estado} className="rounded-xl p-4 border border-blue-900/30 text-center"
              style={{ background: 'rgba(13,27,62,0.6)' }}>
              <p className="text-2xl font-bold" style={{ color: estadoColor[estado]?.text }}>
                {recepciones.filter(r => r.estado === estado).length}
              </p>
              <p className="text-slate-400 text-xs mt-1">{estado}</p>
            </div>
          ))}
        </div>

        <input
          type="text"
          placeholder="Buscar por número, proveedor o país..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg text-white text-sm outline-none"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,212,255,0.2)' }}
        />

        <div className="rounded-xl border border-blue-900/30 overflow-hidden"
          style={{ background: 'rgba(13,27,62,0.6)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
                  {['Número', 'Proveedor', 'País', 'Estado', 'Registrado por', 'Fecha', 'Productos', 'Unid. recibidas', 'Unid. aprobadas', 'Acciones'].map(h => (
                    <th key={h} className="text-left text-slate-400 font-medium px-3 py-3 text-xs whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.map((r) => (
                  <tr key={r.id_recepcion} className="border-t border-blue-900/10 hover:bg-white/5 transition-colors">
                    <td className="px-3 py-3 text-blue-400 font-mono text-xs whitespace-nowrap">{r.numero_recepcion}</td>
                    <td className="px-3 py-3 text-white text-xs">{r.proveedor}</td>
                    <td className="px-3 py-3 text-slate-300 text-xs whitespace-nowrap">{r.pais_origen}</td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                        style={{ background: estadoColor[r.estado]?.bg, color: estadoColor[r.estado]?.text }}>
                        {r.estado}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-300 text-xs">{r.registrado_por}</td>
                    <td className="px-3 py-3 text-slate-400 text-xs whitespace-nowrap">{formatFecha(r.fecha_recepcion)}</td>
                    <td className="px-3 py-3 text-white text-xs text-center">{r.total_productos}</td>
                    <td className="px-3 py-3 text-white text-xs text-center">{r.unidades_recibidas}</td>
                    <td className="px-3 py-3 text-xs text-center">
                      <span className={r.unidades_aprobadas < r.unidades_recibidas ? 'text-yellow-400' : 'text-green-400'}>
                        {r.unidades_aprobadas}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <Tooltip title="Ver detalle">
                        <button onClick={() => { setRecepcionSeleccionada(r); setModalDetalle(true) }}
                          className="p-1.5 rounded-lg hover:bg-blue-500/20 transition-colors text-blue-400">
                          <VisibilityRounded style={{ fontSize: '1rem' }} />
                        </button>
                      </Tooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={modalDetalle} onClose={() => setModalDetalle(false)} maxWidth="sm" fullWidth sx={dialogSx}>
        <DialogTitle>
          {recepcionSeleccionada?.numero_recepcion} · {recepcionSeleccionada?.proveedor}
        </DialogTitle>
        <DialogContent>
          <div className="grid grid-cols-2 gap-4 text-xs mt-2">
            <div>
              <p className="text-slate-400 mb-1">País de origen</p>
              <p className="text-white font-medium">{recepcionSeleccionada?.pais_origen}</p>
            </div>
            <div>
              <p className="text-slate-400 mb-1">Estado</p>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium inline-block whitespace-nowrap"
                style={{ background: estadoColor[recepcionSeleccionada?.estado]?.bg, color: estadoColor[recepcionSeleccionada?.estado]?.text }}>
                {recepcionSeleccionada?.estado}
              </span>
            </div>
            <div>
              <p className="text-slate-400 mb-1">Fecha de recepción</p>
              <p className="text-white font-medium">{formatFecha(recepcionSeleccionada?.fecha_recepcion)}</p>
            </div>
            <div>
              <p className="text-slate-400 mb-1">Registrado por</p>
              <p className="text-white font-medium">{recepcionSeleccionada?.registrado_por}</p>
            </div>
            <div>
              <p className="text-slate-400 mb-1">Unidades recibidas</p>
              <p className="text-white font-semibold">{recepcionSeleccionada?.unidades_recibidas}</p>
            </div>
            <div>
              <p className="text-slate-400 mb-1">Unidades aprobadas</p>
              <p className="font-semibold" style={{ color: recepcionSeleccionada?.unidades_aprobadas < recepcionSeleccionada?.unidades_recibidas ? '#f59e0b' : '#22c55e' }}>
                {recepcionSeleccionada?.unidades_aprobadas}
              </p>
            </div>
          </div>
        </DialogContent>
        <DialogActions className="px-6 pb-4">
          <Button onClick={() => setModalDetalle(false)} style={{ color: '#64748b' }}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}

export default Recepciones