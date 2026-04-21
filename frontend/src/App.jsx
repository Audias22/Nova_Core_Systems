import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inventario from './pages/Inventario'
import Pedidos from './pages/Pedidos'
import Recepciones from './pages/Recepciones'
import Despachos from './pages/Despachos'
import Devoluciones from './pages/Devoluciones'
import Alertas from './pages/Alertas'

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/inventario" element={
            <ProtectedRoute roles={['jefe_almacen', 'almacen', 'admin', 'compras', 'informatica']}>
              <Inventario />
            </ProtectedRoute>
          } />

          <Route path="/pedidos" element={
            <ProtectedRoute roles={['jefe_almacen', 'almacen', 'admin', 'ventas', 'informatica']}>
              <Pedidos />
            </ProtectedRoute>
          } />

          <Route path="/recepciones" element={
            <ProtectedRoute roles={['jefe_almacen', 'almacen', 'admin', 'compras', 'informatica']}>
              <Recepciones />
            </ProtectedRoute>
          } />

          <Route path="/despachos" element={
            <ProtectedRoute roles={['jefe_almacen', 'almacen', 'admin', 'flota', 'informatica']}>
              <Despachos />
            </ProtectedRoute>
          } />

          <Route path="/devoluciones" element={
            <ProtectedRoute roles={['jefe_almacen', 'almacen', 'admin', 'ventas', 'informatica']}>
              <Devoluciones />
            </ProtectedRoute>
          } />

          <Route path="/alertas" element={
            <ProtectedRoute roles={['jefe_almacen', 'almacen', 'admin', 'compras', 'ventas', 'informatica']}>
              <Alertas />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App