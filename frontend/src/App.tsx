import {Routes, Route} from 'react-router-dom';
import Home from './pages/Home.tsx';
import Wallets from './pages/Wallets.tsx'
import Navbar from './components/Navbar.tsx'
import Explore from './pages/Explore.tsx';


export default function App () {
  return (
    <>
    <div>
      <Navbar/>
    </div>

      <Routes>
          <Route path='/' element={<Home />}/>
          <Route path='/explore' element={<Explore />}/>
          <Route path='/wallets' element={<Wallets />}/>
      </Routes>
     
    </>
  )
}

