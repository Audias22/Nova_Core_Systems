import { useState } from 'react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

const Layout = ({ children, titulo }) => {
  const [sidebarAbierto, setSidebarAbierto] = useState(true)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0a0a0a' }}>
      <Sidebar abierto={sidebarAbierto} onToggle={() => setSidebarAbierto(!sidebarAbierto)} />
      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
        style={{ marginLeft: sidebarAbierto ? '220px' : '60px' }}>
        <Navbar titulo={titulo} />
        <main className="flex-1 overflow-y-auto p-6" style={{ background: '#0a0a0a' }}>
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout