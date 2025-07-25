import { NavLink } from 'react-router-dom'

const Navbar = () => {
  return (
    <nav className="bg-gray-950 text-white px-6 py-4 flex justify-center items-center shadow">
      <div className="flex gap-10">
        <NavLink to="/" end className={({ isActive }: { isActive: boolean }) => isActive ? 'text-blue-400 font-semibold' : 'hover:text-blue-300'}>Home</NavLink>
        <NavLink to="/explore" className={({ isActive }: { isActive: boolean }) => isActive ? 'text-blue-400 font-semibold' : 'hover:text-blue-300'}>Explore</NavLink>
        <NavLink to="/wallets" className={({ isActive }: { isActive: boolean }) => isActive ? 'text-blue-400 font-semibold' : 'hover:text-blue-300'}>Wallets</NavLink>
      </div>
    </nav>
  )
}

export default Navbar 