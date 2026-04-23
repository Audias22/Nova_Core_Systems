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

// ── Paleta ───────────────────────────────────────────────────────────────────
const C = {
  bg: '#0a0a0a',
  card: '#1a1a1a',
  border: 'rgba(255,255,255,0.06)',
  cyan: '#00d4ff',
  textSec: 'rgba(255,255,255,0.35)',
}

const COLORES_ESTADO = {
  'Entregado':      '#22c55e',
  'Aprobado':       '#00d4ff',
  'En preparación': '#a855f7',
  'Despachado':     '#f97316',
  'Pendiente':      '#f59e0b',
  'Cancelado':      '#ef4444',
}

const COLORES_GRAFICO = ['#00d4ff','#0066ff','#a855f7','#22c55e','#f59e0b','#f97316']

const SISTEMAS = [
  { nombre:'ERP', descripcion:'Planificación de Recursos' },
  { nombre:'WMS', descripcion:'Gestión de Almacén' },
  { nombre:'CRM', descripcion:'Gestión de Clientes' },
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

// ── StatCard ─────────────────────────────────────────────────────────────────
const StatCard = ({ titulo, valor, icono, color, subtitulo }) => (
  <div className="rounded-xl p-5 flex items-center gap-4"
    style={{ background: C.card, border: `1px solid ${C.border}` }}>
    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: `${color}18` }}>
      <span style={{ color }}>{icono}</span>
    </div>
    <div>
      <p className="text-xs font-medium" style={{ color: C.textSec }}>{titulo}</p>
      <p className="text-white text-2xl font-bold">{valor}</p>
      {subtitulo && <p className="text-xs mt-0.5" style={{ color: C.textSec }}>{subtitulo}</p>}
    </div>
  </div>
)

// ── Tooltip personalizado recharts ────────────────────────────────────────────
const tooltipStyle = {
  contentStyle: { background:'#1a1a1a', border:`1px solid ${C.border}`, borderRadius:8, color:'#fff', fontSize:12 },
  labelStyle:   { color:'white', fontWeight:600 },
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { usuario, tieneRol } = useAuth()
  const [datos, setDatos]   = useState({ inventario:[], pedidos:[], despachos:[], alertas:[], devoluciones:[] })
  const [usuarios, setUsuarios] = useState([])
  const [stats, setStats]   = useState(null)
  const [cargando, setCargando] = useState(true)

  const puedeVerInventario = tieneRol('jefe_almacen','almacen','admin','compras','informatica')
  const puedeVerPedidos    = tieneRol('jefe_almacen','almacen','admin','ventas','informatica')
  const puedeVerDespachos  = tieneRol('jefe_almacen','almacen','admin','flota','informatica')
  const puedeVerAlertas    = tieneRol('jefe_almacen','almacen','admin','compras','informatica')
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
        const res = await Promise.all(promesas)
        setDatos({ inventario:res[0], pedidos:res[1], despachos:res[2], alertas:res[3], devoluciones:res[4] })
        if (esInformatica) { setUsuarios(res[5]); setStats(res[6]) }
      } catch (e) { console.error(e) }
      finally { setCargando(false) }
    }
    cargar()
  }, [])

  // ── Derivados ───────────────────────────────────────────────────────────────
  const pedidosPendientes     = datos.pedidos.filter(p => p.estado === 'Pendiente').length
  const despachosEnTransito   = datos.despachos.filter(d => d.estado === 'En tránsito').length
  const productosStockCritico = datos.inventario.filter(i => i.estado_stock === 'critico').length

  const categorias = datos.inventario.reduce((acc, item) => {
    const cat = item.categoria
    acc[cat] = (acc[cat] || 0) + item.cantidad_disponible
    return acc
  }, {})
  const datosGrafico = Object.entries(categorias).map(([nombre, cantidad]) => ({
    nombre: nombre === 'Almacenamiento' ? 'Almacen.' : nombre.split(' ')[0],
    nombreCompleto: nombre, cantidad
  }))

  // Jefe almacén
  const estadosPedidos = Object.entries(
    datos.pedidos.reduce((acc, p) => { acc[p.estado] = (acc[p.estado]||0)+1; return acc }, {})
  ).map(([nombre, valor]) => ({ nombre, valor }))

  const despachosPorMes = datos.despachos.reduce((acc, d) => {
    if (!d.fecha_despacho) return acc
    const f   = new Date(d.fecha_despacho)
    const mes = f.toLocaleDateString('es-GT', { month:'short', year:'2-digit' })
    acc[mes] = (acc[mes]||0)+1
    return acc
  }, {})
  const datosDespachosMes = Object.entries(despachosPorMes).map(([mes,total]) => ({ mes,total })).slice(-6)

  const despachosCompletados   = datos.despachos.filter(d => d.estado === 'Entregado').length
  const despachosSinIncidencia = datos.despachos.filter(d => d.estado !== 'Con incidencia').length
  const precisionDespachos     = datos.despachos.length > 0
    ? Math.round((despachosSinIncidencia / datos.despachos.length) * 100) : 100
  const devolucionesResueltas  = datos.devoluciones.filter(d => d.estado === 'Resuelto').length

  // Informática
  const usuariosPorRol = usuarios.reduce((acc, u) => {
    if (!acc[u.rol]) acc[u.rol] = []
    acc[u.rol].push(u)
    return acc
  }, {})

  if (cargando) return (
    <Layout titulo="Dashboard">
      <div className="flex items-center justify-center h-64">
        <CircularProgress sx={{ color: C.cyan }} />
      </div>
    </Layout>
  )

  return (
    <Layout titulo="Dashboard">
      <div className="space-y-6">

        {/* Bienvenida */}
        <div className="rounded-xl p-5" style={{
          background: 'linear-gradient(135deg, rgba(0,212,255,0.06), rgba(0,102,255,0.06))',
          border: `1px solid rgba(0,212,255,0.12)`,
        }}>
          <div className="flex items-center gap-3">
            <TrendingUp style={{ color: C.cyan }} />
            <div>
              <p className="text-white font-semibold">Bienvenido, {usuario?.nombre?.split(' ')[0]}</p>
              <p className="text-sm" style={{ color: C.cyan }}>
                {usuario?.cargo} · {new Date().toLocaleDateString('es-GT', {
                  weekday:'long', year:'numeric', month:'long', day:'numeric'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Stats generales */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {puedeVerInventario && (
            <StatCard titulo="Productos en bodega" valor={datos.inventario.length}
              icono={<Inventory2 />} color={C.cyan} subtitulo="referencias activas" />
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

        {/* ── JEFE ALMACÉN ──────────────────────────────────────────────────── */}
        {esJefeAlmacen && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard titulo="Pedidos entregados" valor={datos.pedidos.filter(p=>p.estado==='Entregado').length}
                icono={<AssignmentTurnedIn />} color="#22c55e" subtitulo="total confirmados" />
              <StatCard titulo="Despachos completados" valor={despachosCompletados}
                icono={<LocalShippingOutlined />} color={C.cyan} subtitulo="entregados al cliente" />
              <StatCard titulo="Devoluciones resueltas" valor={devolucionesResueltas}
                icono={<AssignmentReturn />} color="#a855f7" subtitulo="casos cerrados" />
              <StatCard titulo="Precisión despachos" valor={`${precisionDespachos}%`}
                icono={<CheckCircle />} color="#f59e0b" subtitulo="sin incidencias" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Dona: estado de pedidos */}
              <div className="rounded-xl p-5" style={{ background: C.card, border:`1px solid ${C.border}` }}>
                <p className="text-white font-semibold mb-4">Estado de pedidos</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={estadosPedidos} dataKey="valor" nameKey="nombre"
                      cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                      {estadosPedidos.map((e,i) => <Cell key={i} fill={COLORES_ESTADO[e.nombre]||'#64748b'} />)}
                    </Pie>
                    <Tooltip {...tooltipStyle} formatter={(v,n) => [v,n]} />
                    <Legend formatter={v => <span style={{ color: C.textSec, fontSize:11 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Línea: despachos por mes */}
              <div className="rounded-xl p-5" style={{ background: C.card, border:`1px solid ${C.border}` }}>
                <p className="text-white font-semibold mb-4">Despachos por mes</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={datosDespachosMes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="mes" tick={{ fill: C.textSec, fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: C.textSec, fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyle} formatter={v => [v,'Despachos']} />
                    <Line type="monotone" dataKey="total" stroke={C.cyan} strokeWidth={2.5}
                      dot={{ fill: C.cyan, r:4 }} activeDot={{ r:6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── INFORMÁTICA ───────────────────────────────────────────────────── */}
        {esInformatica && (
          <div className="space-y-6">
            {/* Estado sistemas */}
            <div className="rounded-xl p-5" style={{ background: C.card, border:`1px solid ${C.border}` }}>
              <div className="flex items-center gap-2 mb-4">
                <Monitor style={{ color: C.cyan, fontSize:'1.1rem' }} />
                <p className="text-white font-semibold">Estado de sistemas</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {SISTEMAS.map(s => (
                  <div key={s.nombre} className="rounded-lg p-4 flex items-center gap-3"
                    style={{ background:'rgba(255,255,255,0.02)', border:`1px solid ${C.border}` }}>
                    <CheckCircle style={{ color:'#22c55e', fontSize:'1.4rem' }} />
                    <div>
                      <p className="text-white font-bold text-sm">{s.nombre}</p>
                      <p className="text-xs" style={{ color: C.textSec }}>{s.descripcion}</p>
                      <p className="text-green-400 text-xs font-medium mt-0.5">Operativo</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Stats BD */}
              {stats && (
                <div className="rounded-xl p-5" style={{ background: C.card, border:`1px solid ${C.border}` }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Storage style={{ color: C.cyan, fontSize:'1.1rem' }} />
                    <p className="text-white font-semibold">Base de datos</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label:'Usuarios',               valor: stats.usuarios,              color: C.cyan },
                      { label:'Productos',               valor: stats.productos,              color:'#0066ff' },
                      { label:'Clientes',                valor: stats.clientes,               color:'#a855f7' },
                      { label:'Pedidos',                 valor: stats.pedidos,                color:'#f59e0b' },
                      { label:'Recepciones',             valor: stats.recepciones,            color:'#22c55e' },
                      { label:'Despachos',               valor: stats.despachos,              color:'#f97316' },
                      { label:'Devoluciones',            valor: stats.devoluciones,           color:'#ef4444' },
                      { label:'Movim. inventario',       valor: stats.movimientos_inventario, color:'#64748b' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between p-2 rounded-lg"
                        style={{ background:'rgba(255,255,255,0.02)' }}>
                        <p className="text-xs" style={{ color: C.textSec }}>{item.label}</p>
                        <p className="font-bold text-sm" style={{ color: item.color }}>{item.valor}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Usuarios */}
              <div className="rounded-xl p-5" style={{ background: C.card, border:`1px solid ${C.border}` }}>
                <div className="flex items-center gap-2 mb-4">
                  <People style={{ color: C.cyan, fontSize:'1.1rem' }} />
                  <p className="text-white font-semibold">Usuarios del sistema</p>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {Object.entries(usuariosPorRol).map(([rol, lista]) => (
                    <div key={rol}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: C.cyan }}>
                        {LABEL_ROL[rol] || rol}
                      </p>
                      {lista.map(u => (
                        <div key={u.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg mb-0.5"
                          style={{ background:'rgba(255,255,255,0.02)' }}>
                          <div>
                            <p className="text-white text-xs">{u.nombre}</p>
                            <p className="text-xs" style={{ color: C.textSec }}>{u.cargo}</p>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              background: u.activo ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                              color:      u.activo ? '#22c55e' : '#ef4444',
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

        {/* ── GRÁFICO INVENTARIO + ALERTAS ─────────────────────────────────── */}
        {(puedeVerInventario || puedeVerAlertas) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {puedeVerInventario && (
              <div className="rounded-xl p-5" style={{ background: C.card, border:`1px solid ${C.border}` }}>
                <p className="text-white font-semibold mb-4">Inventario por categoría</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={datosGrafico} barSize={32}>
                    <XAxis dataKey="nombre" tick={{ fill: C.textSec, fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: C.textSec, fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyle} cursor={{ fill:'rgba(0,212,255,0.04)' }}
                      formatter={v => [v,'Unidades']}
                      labelFormatter={(l,p) => p?.[0]?.payload?.nombreCompleto || l} />
                    <Bar dataKey="cantidad" radius={[6,6,0,0]}>
                      {datosGrafico.map((_,i) => <Cell key={i} fill={COLORES_GRAFICO[i % COLORES_GRAFICO.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {puedeVerAlertas && (
              <div className="rounded-xl p-5" style={{ background: C.card, border:`1px solid ${C.border}` }}>
                <p className="text-white font-semibold mb-4">Alertas activas</p>
                {datos.alertas.length === 0 ? (
                  <div className="flex items-center justify-center h-40">
                    <p className="text-sm" style={{ color: C.textSec }}>Sin alertas activas</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {datos.alertas.slice(0,6).map(alerta => (
                      <div key={alerta.id_alerta} className="flex items-start gap-3 p-3 rounded-lg"
                        style={{ background:'rgba(255,255,255,0.02)', border:`1px solid ${C.border}` }}>
                        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                          style={{ background: alerta.tipo_alerta === 'Stock bajo' ? '#ef4444' : '#f59e0b' }} />
                        <div>
                          <p className="text-white text-xs font-medium">{alerta.tipo_alerta}</p>
                          <p className="text-xs" style={{ color: C.textSec }}>{alerta.descripcion}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── DESPACHOS RECIENTES (solo flota) ─────────────────────────────── */}
        {puedeVerDespachos && !puedeVerPedidos && (
          <div className="rounded-xl p-5" style={{ background: C.card, border:`1px solid ${C.border}` }}>
            <p className="text-white font-semibold mb-4">Despachos recientes</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: C.border }}>
                    {['Pedido','Cliente','Estado','Municipio','F. despacho'].map(h => (
                      <th key={h} className="text-left font-medium pb-3 pr-4 text-xs" style={{ color: C.textSec }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {datos.despachos.slice(0,5).map(d => (
                    <tr key={d.id_despacho} className="border-b" style={{ borderColor: C.border }}>
                      <td className="py-3 pr-4 font-mono text-xs" style={{ color: C.cyan }}>{d.numero_pedido}</td>
                      <td className="py-3 pr-4 text-white text-xs">{d.cliente}</td>
                      <td className="py-3 pr-4">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            background: d.estado==='Entregado'   ? 'rgba(34,197,94,0.15)'  :
                                        d.estado==='En tránsito' ? 'rgba(0,212,255,0.15)'  : 'rgba(239,68,68,0.15)',
                            color:      d.estado==='Entregado'   ? '#22c55e' :
                                        d.estado==='En tránsito' ? '#00d4ff' : '#ef4444',
                          }}>
                          {d.estado}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-xs" style={{ color: C.textSec }}>{d.municipio_entrega}</td>
                      <td className="py-3 text-xs"      style={{ color: C.textSec }}>{formatFecha(d.fecha_despacho)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PEDIDOS RECIENTES ─────────────────────────────────────────────── */}
        {puedeVerPedidos && (
          <div className="rounded-xl p-5" style={{ background: C.card, border:`1px solid ${C.border}` }}>
            <p className="text-white font-semibold mb-4">Pedidos recientes</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: C.border }}>
                    {['Número','Cliente','Estado','Total','Fecha'].map(h => (
                      <th key={h} className="text-left font-medium pb-3 pr-4 text-xs" style={{ color: C.textSec }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {datos.pedidos.slice(0,5).map(p => (
                    <tr key={p.id_pedido} className="border-b" style={{ borderColor: C.border }}>
                      <td className="py-3 pr-4 font-mono text-xs" style={{ color: C.cyan }}>{p.numero_pedido}</td>
                      <td className="py-3 pr-4 text-white text-xs">{p.cliente}</td>
                      <td className="py-3 pr-4">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            background: p.estado==='Entregado' ? 'rgba(34,197,94,0.15)'  :
                                        p.estado==='Pendiente' ? 'rgba(245,158,11,0.15)' :
                                        p.estado==='Cancelado' ? 'rgba(239,68,68,0.15)'  : 'rgba(0,212,255,0.15)',
                            color:      p.estado==='Entregado' ? '#22c55e' :
                                        p.estado==='Pendiente' ? '#f59e0b' :
                                        p.estado==='Cancelado' ? '#ef4444' : '#00d4ff',
                          }}>
                          {p.estado}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-white text-xs font-semibold">
                        Q{Number(p.total).toLocaleString('es-GT',{minimumFractionDigits:2})}
                      </td>
                      <td className="py-3 text-xs" style={{ color: C.textSec }}>{formatFecha(p.fecha_pedido)}</td>
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