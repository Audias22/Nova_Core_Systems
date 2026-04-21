import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { getInventario } from '../api/inventario'
import { getPedidos } from '../api/pedidos'
import { getDespachos } from '../api/despachos'
import { getAlertasActivas } from '../api/alertas'
import { getDevoluciones } from '../api/devoluciones'
import api from '../api/axios'
import {
  Inventory2, ShoppingCart, LocalShipping,
  Notifications, AssignmentReturn, TrendingUp,
  Storage, People, CheckCircle, Monitor,
  LocalShippingOutlined, AssignmentTurnedIn
} from '@mui/icons-material'
import { CircularProgress } from '@mui/material'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line, CartesianGrid
} from 'recharts'
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

const SISTEMAS = [
  { nombre: 'ERP', descripcion: 'Planificación de Recursos' },
  { nombre: 'WMS', descripcion: 'Gestión de Almacén' },
  { nombre: 'CRM', descripcion: 'Gestión de Clientes' },
]

const LABEL_ROL = {
  admin:        'Administrador',
  jefe_almacen: 'Jefe de Almacén',
  almacen:      'Almacén',
  ventas:       'Ventas',
  compras:      'Compras',
  flota:        'Flota',
  informatica:  'Informática',
}

const COLORES_ESTADO = {
  'Entregado':     '#22c55e',
  'Aprobado':      '#00d4ff',
  'En preparación':'#a855f7',
  'Despachado':    '#f97316',
  'Pendiente':     '#f59e0b',
  'Cancelado':     '#ef4444',
}

const Dashboard = () => {
  const { usuario, tieneRol } = useAuth()
  const [datos, setDatos] = useState({
    inventario: [], pedidos: [], despachos: [],
    alertas: [], devoluciones: []
  })
  const [usuarios, setUsuarios] = useState([])
  const [stats, setStats] = useState(null)
  const [cargando, setCargando] = useState(true)

  const puedeVerInventario = tieneRol('jefe_almacen', 'almacen', 'admin', 'compras', 'informatica')
  const puedeVerPedidos    = tieneRol('jefe_almacen', 'almacen', 'admin', 'ventas', 'informatica')
  const puedeVerDespachos  = tieneRol('jefe_almacen', 'almacen', 'admin', 'flota', 'informatica')
  const puedeVerAlertas    = tieneRol('jefe_almacen', 'almacen', 'admin', 'compras', 'informatica')
  const esInformatica      = tieneRol('informatica')
  const esJefeAlmacen      = tieneRol('jefe_almacen')

  useEffect(() => {
    const cargar = async () => {
      try {
        const promesas = [
          puedeVerInventario ? getInventario()     : Promise.resolve([]),
          puedeVerPedidos    ? getPedidos()        : Promise.resolve([]),
          puedeVerDespachos  ? getDespachos()      : Promise.resolve([]),
          puedeVerAlertas    ? getAlertasActivas() : Promise.resolve([]),
          puedeVerPedidos    ? getDevoluciones()   : Promise.resolve([]),
        ]
        if (esInformatica) {
          promesas.push(api.get('/auth/usuarios').then(r => r.data))
          promesas.push(api.get('/auth/stats').then(r => r.data))
        }
        const resultados = await Promise.all(promesas)
        setDatos({
          inventario:   resultados[0],
          pedidos:      resultados[1],
          despachos:    resultados[2],
          alertas:      resultados[3],
          devoluciones: resultados[4],
        })
        if (esInformatica) {
          setUsuarios(resultados[5])
          setStats(resultados[6])
        }
      } catch (e) {
        console.error(e)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  const pedidosPendientes     = datos.pedidos.filter(p => p.estado === 'Pendiente').length
  const despachosEnTransito   = datos.despachos.filter(d => d.estado === 'En tránsito').length
  const productosStockCritico = datos.inventario.filter(i => i.estado_stock === 'critico').length

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

  // Datos exclusivos jefe_almacen
  const estadosPedidos = Object.entries(
    datos.pedidos.reduce((acc, p) => {
      acc[p.estado] = (acc[p.estado] || 0) + 1
      return acc
    }, {})
  ).map(([nombre, valor]) => ({ nombre, valor }))

  const despachosPorMes = datos.despachos.reduce((acc, d) => {
    if (!d.fecha_despacho) return acc
    const fecha = new Date(d.fecha_despacho)
    const mes = fecha.toLocaleDateString('es-GT', { month: 'short', year: '2-digit' })
    acc[mes] = (acc[mes] || 0) + 1
    return acc
  }, {})
  const datosDespachosMes = Object.entries(despachosPorMes)
    .map(([mes, total]) => ({ mes, total }))
    .slice(-6)

  const despachosCompletados  = datos.despachos.filter(d => d.estado === 'Entregado').length
  const despachosSinIncidencia = datos.despachos.filter(d => d.estado !== 'Con incidencia').length
  const precisionDespachos = datos.despachos.length > 0
    ? Math.round((despachosSinIncidencia / datos.despachos.length) * 100)
    : 100
  const devolucionesResueltas = datos.devoluciones.filter(d => d.estado === 'Resuelto').length

  const usuariosPorRol = usuarios.reduce((acc, u) => {
    if (!acc[u.rol]) acc[u.rol] = []
    acc[u.rol].push(u)
    return acc
  }, {})

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

        {/* Stats generales */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {puedeVerInventario && (
            <StatCard titulo="Productos en bodega" valor={datos.inventario.length}
              icono={<Inventory2 />} color="#00d4ff" subtitulo="referencias activas" />
          )}
          {puedeVerPedidos && (
            <StatCard titulo="Pedidos pendientes" valor={pedidosPendientes}
              icono={<ShoppingCart />} color="#f59e0b" subtitulo="por aprobar" />
          )}
          {puedeVerDespachos && (
            <StatCard titulo="En tránsito" valor={despachosEnTransito}
              icono={<LocalShipping />} color="#22c55e" subtitulo="despachos activos" />
          )}
          {puedeVerAlertas && (
            <StatCard titulo="Alertas activas" valor={datos.alertas.length}
              icono={<Notifications />} color="#ef4444" subtitulo="requieren atención" />
          )}
          {puedeVerInventario && (
            <StatCard titulo="Stock crítico" valor={productosStockCritico}
              icono={<AssignmentReturn />} color="#a855f7" subtitulo="bajo mínimo" />
          )}
        </div>

        {/* ══════════════════════════════════════════════
            SECCIÓN EXCLUSIVA JEFE ALMACÉN
        ══════════════════════════════════════════════ */}
        {esJefeAlmacen && (
          <div className="space-y-6">

            {/* KPIs operativos */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard titulo="Pedidos entregados" valor={datos.pedidos.filter(p => p.estado === 'Entregado').length}
                icono={<AssignmentTurnedIn />} color="#22c55e" subtitulo="total confirmados" />
              <StatCard titulo="Despachos completados" valor={despachosCompletados}
                icono={<LocalShippingOutlined />} color="#00d4ff" subtitulo="entregados al cliente" />
              <StatCard titulo="Devoluciones resueltas" valor={devolucionesResueltas}
                icono={<AssignmentReturn />} color="#a855f7" subtitulo="casos cerrados" />
              <StatCard titulo="Precisión despachos" valor={`${precisionDespachos}%`}
                icono={<CheckCircle />} color="#f59e0b" subtitulo="sin incidencias" />
            </div>

            {/* Gráfica estado de pedidos + despachos por mes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Dona: estado de pedidos */}
              <div className="rounded-xl p-5 border border-blue-900/30"
                style={{ background: 'rgba(13,27,62,0.6)' }}>
                <p className="text-white font-semibold mb-4">Estado de pedidos</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={estadosPedidos}
                      dataKey="valor"
                      nameKey="nombre"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {estadosPedidos.map((entry, index) => (
                        <Cell key={index} fill={COLORES_ESTADO[entry.nombre] || '#64748b'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#0d1b3e', border: '1px solid #1e3a6e', borderRadius: 8, color: '#fff' }}
                      formatter={(value, name) => [value, name]}
                    />
                    <Legend
                      formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Línea: despachos por mes */}
              <div className="rounded-xl p-5 border border-blue-900/30"
                style={{ background: 'rgba(13,27,62,0.6)' }}>
                <p className="text-white font-semibold mb-4">Despachos por mes</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={datosDespachosMes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#0d1b3e', border: '1px solid #1e3a6e', borderRadius: 8, color: '#fff' }}
                      formatter={(value) => [value, 'Despachos']}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#00d4ff"
                      strokeWidth={2.5}
                      dot={{ fill: '#00d4ff', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            SECCIÓN EXCLUSIVA INFORMÁTICA
        ══════════════════════════════════════════════ */}
        {esInformatica && (
          <div className="space-y-6">

            {/* Estado de sistemas */}
            <div className="rounded-xl p-5 border border-blue-900/30"
              style={{ background: 'rgba(13,27,62,0.6)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Monitor style={{ color: '#00d4ff', fontSize: '1.1rem' }} />
                <p className="text-white font-semibold">Estado de sistemas</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {SISTEMAS.map(s => (
                  <div key={s.nombre} className="rounded-lg p-4 border border-blue-900/20 flex items-center gap-3"
                    style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <CheckCircle style={{ color: '#22c55e', fontSize: '1.4rem' }} />
                    <div>
                      <p className="text-white font-bold text-sm">{s.nombre}</p>
                      <p className="text-slate-400 text-xs">{s.descripcion}</p>
                      <p className="text-green-400 text-xs font-medium mt-0.5">Operativo</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats BD + Usuarios */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {stats && (
                <div className="rounded-xl p-5 border border-blue-900/30"
                  style={{ background: 'rgba(13,27,62,0.6)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Storage style={{ color: '#00d4ff', fontSize: '1.1rem' }} />
                    <p className="text-white font-semibold">Base de datos</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Usuarios',              valor: stats.usuarios,              color: '#00d4ff' },
                      { label: 'Productos',              valor: stats.productos,              color: '#0066ff' },
                      { label: 'Clientes',               valor: stats.clientes,               color: '#a855f7' },
                      { label: 'Pedidos',                valor: stats.pedidos,                color: '#f59e0b' },
                      { label: 'Recepciones',            valor: stats.recepciones,            color: '#22c55e' },
                      { label: 'Despachos',              valor: stats.despachos,              color: '#f97316' },
                      { label: 'Devoluciones',           valor: stats.devoluciones,           color: '#ef4444' },
                      { label: 'Movimientos inventario', valor: stats.movimientos_inventario, color: '#64748b' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between p-2 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <p className="text-slate-400 text-xs">{item.label}</p>
                        <p className="font-bold text-sm" style={{ color: item.color }}>{item.valor}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-xl p-5 border border-blue-900/30"
                style={{ background: 'rgba(13,27,62,0.6)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <People style={{ color: '#00d4ff', fontSize: '1.1rem' }} />
                  <p className="text-white font-semibold">Usuarios del sistema</p>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {Object.entries(usuariosPorRol).map(([rol, lista]) => (
                    <div key={rol}>
                      <p className="text-blue-400 text-xs font-semibold uppercase tracking-wide mb-1">
                        {LABEL_ROL[rol] || rol}
                      </p>
                      {lista.map(u => (
                        <div key={u.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg mb-0.5"
                          style={{ background: 'rgba(255,255,255,0.02)' }}>
                          <div>
                            <p className="text-white text-xs">{u.nombre}</p>
                            <p className="text-slate-500 text-xs">{u.cargo}</p>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              background: u.activo ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                              color: u.activo ? '#22c55e' : '#ef4444'
                            }}>
                            {u.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gráfico inventario y alertas */}
        {(puedeVerInventario || puedeVerAlertas) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        {/* Despachos recientes — solo flota */}
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

        {/* Pedidos recientes */}
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
                      <td className="py-3 text-slate-400 text-xs">{formatFecha(pedido.fecha_pedido)}</td>
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