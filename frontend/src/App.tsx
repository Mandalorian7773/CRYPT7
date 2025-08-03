import {Routes, Route} from 'react-router-dom';
import Home from './pages/Home.tsx';
import Wallets from './pages/Wallets.tsx'
import Navbar from './components/Navbar.tsx'
import Explore from './pages/Explore.tsx';
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from './utils/store.ts';
import Locker from './pages/locked.tsx'

export default function App () {
  const dispatch = useDispatch();
  const isUnlocked = useSelector((state: RootState) => state.wallet.isUnlocked);
  
  return (
    <>
      {isUnlocked ? (
      <>
        <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/wallets" element={<Wallets />} />
          </Routes>
      </>
      ) : (
      <Locker />
    )}
    </>
  )
}

