import { NavLink } from 'react-router-dom'
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from './../utils/store.ts';
import { lockWallet } from './../utils/walletLocker.ts';

const Navbar = () => {
  const dispatch = useDispatch();
  const isUnlocked = useSelector((state: RootState) => state.wallet.isUnlocked);
  const handleLock = () => {
    dispatch(lockWallet());
  }

  return (
    <nav className="bg-gray-950 text-white px-6 py-4 flex justify-center items-center shadow">
      <div className="flex gap-10">
        <NavLink to="/" className={({ isActive }: { isActive: boolean }) => isActive ? 'text-blue-400 font-semibold' : 'hover:text-blue-300'}>Home</NavLink>
        <NavLink to="/explore" className={({ isActive }: { isActive: boolean }) => isActive ? 'text-blue-400 font-semibold' : 'hover:text-blue-300'}>Explore</NavLink>
        <NavLink to="/wallets" className={({ isActive }: { isActive: boolean }) => isActive ? 'text-blue-400 font-semibold' : 'hover:text-blue-300'}>Wallets</NavLink>
        {isUnlocked && <button className="bg-black w-20 rounded-xl" onClick={handleLock}>Lock</button>}
      </div>
    </nav>
  )
}

export default Navbar;
