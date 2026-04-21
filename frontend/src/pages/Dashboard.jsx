import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { getInventario } from '../api/inventario'
import { getPedidos } from '../api/pedidos'
import { getDespachos } from '../api/despachos'
import { getAlertasActivas } from '../api/alertas'
import { getDevoluciones } from '../api/devoluciones'
import {
  Inventory2, ShoppingCart, LocalShipping,
  Notifications, AssignmentReturn, TrendingUp
} from '@mui/icons-material'
import { CircularProgress } from '@mui/material'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatFecha } from '../utils/fecha'

const StatCard = ({ titulo, valor, icono, color, subtitulo }) => (
  <div className="rounded-xl p-5 border border-blue-900/30 flex items-center gap-4"
    style={{ background: 'rgba(13,27,62,0.6)' }}>
    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: `${color}20` }}>
      <span style={{ color }}>{icono}</span>
    </div>
    <div>
      <p className="text-slate-400 text-xs font-medium">{titulo}</p>
      <p className="text-white text-2xl font-bold">{valor}</p>
      {subtitulo && <p className="text-slate-500 text-xs mt-0.5">{subtitulo}</p>}
    </div>
  </div>
)

const Dashboard = () => {
  const { usuario, tieneRol } = useAuth()
  const [datos, setDatos] = useState({
    inventario: [], pedidos: [], despachos: [],
    alertas: [], devoluciones: []
  })
  const [cargando, setCargando] = useState(true)

  // Permisos de visibilidad por rol
  const puedeVerInventario = tieneRol('jefe_almacen', 'almacen', 'admin', 'compras', 'informatica')
  const puedeVerPedidos    = tieneRol('jefe_almacen', 'almacen', 'admin', 'ventas', 'informatica')
  const puedeVerDespachos  = tieneRol('jefe_almacen', 'almacen', 'admin', 'flota', 'informatica')
  const puedeVerAlertas    = tieneRol('jefe_almacen', 'almacen', 'admin', 'compras', 'informatica')

  useEffect(() => {
    const cargar = async () => {
      try {
        const [
          inventario,
          pedidos,
          despachos,
          alertas,
          devoluciones
        ] = await Promise.all([
          puedeVerInventario ? getInventario()      : Promise.resolve([]),
          puedeVerPedidos    ? getPedidos()         : Promise.resolve([]),
          puedeVerDespachos  ? getDespachos()       : Promise.resolve([]),
          puedeVerAlertas    ? getAlertasActivas()  : Promise.resolve([]),
          puedeVerPedidos    ? getDevoluciones()    : Promise.resolve([])
        ])
        setDatos({ inventario, pedidos, despachos, alertas, devoluciones })
      } catch (e) {
        console.error(e)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  const pedidosPendientes      = datos.pedidos.filter(p => p.estado === 'Pendiente').length
  const despachosEnTransito    = datos.despachos.filter(d => d.estado === 'En tránsito').length
  const productosStockCritico  = datos.inventario.filter(i => i.estado_stock === 'critico').length

  const categorias = datos.inventario.reduce((acc, item) => {
    const cat = item.categoria
    if (!acc[cat]) acc[cat] = 0
    acc[cat] += item.cantidad_disponible
    return acc
  }, {})

  const datosGrafico = Object.entries(categorias).map(([nombre, cantidad]) => ({
    nombre: nombre === 'Almacenamiento' ? 'Almacen.' : nombre.split(' ')[0],
    nombreCompleto: nombre,
    cantidad
  }))

  const coloresGrafico = ['#00d4ff', '#0066ff', '#a855f7', '#22c55e', '#f59e0b', '#f97316']

  if (cargando) return (
    <Layout titulo="Dashboard">
      <div className="flex items-center justify-center h-64">
        <CircularProgress sx={{ color: '#00d4ff' }} />
      </div>
    </Layout>
  )

  return (
    <Layout titulo="Dashboard">
      <div className="space-y-6">

        {/* Bienvenida */}
        <div className="rounded-xl p-5 border border-blue-900/30"
          style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(0,102,255,0.08))' }}>
          <div className="flex items-center gap-3">
            <TrendingUp style={{ color: '#00d4ff' }} />
            <div>
              <p className="text-white font-semibold">Bienvenido, {usuario?.nombre?.split(' ')[0]}</p>
              <p className="text-blue-400 text-sm">
                {usuario?.cargo} · {new Date().toLocaleDateString('es-GT', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Stats — solo las que el rol puede ver */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {puedeVerInventario && (
            <StatCard
              titulo="Productos en bodega"
              valor={datos.inventario.length}
              icono={<Inventory2 />}
              color="#00d4ff"
              subtitulo="referencias activas"
            />
          )}
          {puedeVerPedidos && (
            <StatCard
              titulo="Pedidos pendientes"
              valor={pedidosPendientes}
              icono={<ShoppingCart />}
              color="#f59e0b"
              subtitulo="por aprobar"
            />
          )}
          {puedeVerDespachos && (
            <StatCard
              titulo="En tránsito"
              valor={despachosEnTransito}
              icono={<LocalShipping />}
              color="#22c55e"
              subtitulo="despachos activos"
            />
          )}
          {puedeVerAlertas && (
            <StatCard
              titulo="Alertas activas"
              valor={datos.alertas.length}
              icono={<Notifications />}
              color="#ef4444"
              subtitulo="requieren atención"
            />
          )}
          {puedeVerInventario && (
            <StatCard
              titulo="Stock crítico"
              valor={productosStockCritico}
              icono={<AssignmentReturn />}
              color="#a855f7"
              subtitulo="bajo mínimo"
            />
          )}
        </div>

        {/* Sección central: gráfico y/o alertas según rol */}
        {(puedeVerInventario || puedeVerAlertas) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Gráfico inventario por categoría */}
            {puedeVerInventario && (
              <div className="rounded-xl p-5 border border-blue-900/30"
                style={{ background: 'rgba(13,27,62,0.6)' }}>
                <p className="text-white font-semibold mb-4">Inventario por categoría</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={datosGrafico} barSize={32}>
                    <XAxis dataKey="nombre" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#0d1b3e', border: '1px solid #1e3a6e', borderRadius: 8, color: '#fff' }}
                      cursor={{ fill: 'rgba(0,212,255,0.05)' }}
                      formatter={(value) => [value, 'Unidades']}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.nombreCompleto || label}
                    />
                    <Bar dataKey="cantidad" radius={[6, 6, 0, 0]}>
                      {datosGrafico.map((_, index) => (
                        <Cell key={index} fill={coloresGrafico[index % coloresGrafico.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Alertas recientes */}
            {puedeVerAlertas && (
              <div className="rounded-xl p-5 border border-blue-900/30"
                style={{ background: 'rgba(13,27,62,0.6)' }}>
                <p className="text-white font-semibold mb-4">Alertas activas</p>
                {datos.alertas.length === 0 ? (
                  <div className="flex items-center justify-center h-40">
                    <p className="text-slate-500 text-sm">Sin alertas activas</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {datos.alertas.slice(0, 6).map((alerta) => (
                      <div key={alerta.id_alerta}
                        className="flex items-start gap-3 p-3 rounded-lg border border-blue-900/20"
                        style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                          style={{ background: alerta.tipo_alerta === 'Stock bajo' ? '#ef4444' : '#f59e0b' }} />
                        <div>
                          <p className="text-white text-xs font-medium">{alerta.tipo_alerta}</p>
                          <p className="text-slate-400 text-xs">{alerta.descripcion}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Despachos recientes — solo para flota */}
        {puedeVerDespachos && !puedeVerPedidos && (
          <div className="rounded-xl p-5 border border-blue-900/30"
            style={{ background: 'rgba(13,27,62,0.6)' }}>
            <p className="text-white font-semibold mb-4">Despachos recientes</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-blue-900/30">
                    <th className="text-left text-slate-400 font-medium pb-3 pr-4">Pedido</th>
                    <th className="text-left text-slate-400 font-medium pb-3 pr-4">Cliente</th>
                    <th className="text-left text-slate-400 font-medium pb-3 pr-4">Estado</th>
                    <th className="text-left text-slate-400 font-medium pb-3 pr-4">Municipio</th>
                    <th className="text-left text-slate-400 font-medium pb-3">F. despacho</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.despachos.slice(0, 5).map((despacho) => (
                    <tr key={despacho.id_despacho} className="border-b border-blue-900/10">
                      <td className="py-3 pr-4 text-blue-400 font-mono text-xs">{despacho.numero_pedido}</td>
                      <td className="py-3 pr-4 text-white text-xs">{despacho.cliente}</td>
                      <td className="py-3 pr-4">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            background: despacho.estado === 'Entregado' ? 'rgba(34,197,94,0.15)' :
                              despacho.estado === 'En tránsito' ? 'rgba(0,212,255,0.15)' : 'rgba(239,68,68,0.15)',
                            color: despacho.estado === 'Entregado' ? '#22c55e' :
                              despacho.estado === 'En tránsito' ? '#00d4ff' : '#ef4444'
                          }}>
                          {despacho.estado}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-400 text-xs">{despacho.municipio_entrega}</td>
                      <td className="py-3 text-slate-400 text-xs">{formatFecha(despacho.fecha_despacho)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pedidos recientes — roles que pueden ver pedidos */}
        {puedeVerPedidos && (
          <div className="rounded-xl p-5 border border-blue-900/30"
            style={{ background: 'rgba(13,27,62,0.6)' }}>
            <p className="text-white font-semibold mb-4">Pedidos recientes</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-blue-900/30">
                    <th className="text-left text-slate-400 font-medium pb-3 pr-4">Número</th>
                    <th className="text-left text-slate-400 font-medium pb-3 pr-4">Cliente</th>
                    <th className="text-left text-slate-400 font-medium pb-3 pr-4">Estado</th>
                    <th className="text-left text-slate-400 font-medium pb-3 pr-4">Total</th>
                    <th className="text-left text-slate-400 font-medium pb-3">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.pedidos.slice(0, 5).map((pedido) => (
                    <tr key={pedido.id_pedido} className="border-b border-blue-900/10">
                      <td className="py-3 pr-4 text-blue-400 font-mono text-xs">{pedido.numero_pedido}</td>
                      <td className="py-3 pr-4 text-white text-xs">{pedido.cliente}</td>
                      <td className="py-3 pr-4">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            background: pedido.estado === 'Entregado' ? 'rgba(34,197,94,0.15)' :
                              pedido.estado === 'Pendiente' ? 'rgba(245,158,11,0.15)' :
                                pedido.estado === 'Cancelado' ? 'rgba(239,68,68,0.15)' : 'rgba(0,212,255,0.15)',
                            color: pedido.estado === 'Entregado' ? '#22c55e' :
                              pedido.estado === 'Pendiente' ? '#f59e0b' :
                                pedido.estado === 'Cancelado' ? '#ef4444' : '#00d4ff'
                          }}>
                          {pedido.estado}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-white text-xs">
                        Q{Number(pedido.total).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 text-slate-400 text-xs">{pedido.fecha_pedido}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </Layout>
  )
}

export default Dashboard