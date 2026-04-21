import { useState } from 'react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

const Layout = ({ children, titulo }) => {
  const [sidebarAbierto, setSidebarAbierto] = useState(true)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#060d1f' }}>
      <Sidebar abierto={sidebarAbierto} onToggle={() => setSidebarAbierto(!sidebarAbierto)} />
      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
        style={{ marginLeft: sidebarAbierto ? '200px' : '56px' }}>
        <Navbar titulo={titulo} />
        <main className="flex-1 overflow-y-auto p-5">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout