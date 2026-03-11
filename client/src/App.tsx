import Navbar from './components/Navbar';
import Home from './pages/Home';
import SoftBackdrop from './components/SoftBackdrop';
import Footer from './components/Footer';
import LenisScroll from './components/lenis';
import { Route, Routes } from 'react-router-dom';
import Generator from './pages/Generator';
import Result from './pages/result.tsx';
import Mygeneration from './pages/Mygeneration.tsx';
import Community from './pages/Community.tsx';
import Loading from './pages/Loading.tsx';

function App() {
	return (
		<>
			<SoftBackdrop />
			<LenisScroll />
			<Navbar />
		  <Routes>
				<Route path='/' element={<Home />}/>
				<Route path='/generate' element={<Generator />}/>
				<Route path='/result/:projectId' element={<Result />}/>
				<Route path='/my-generation' element={<Mygeneration />}/>
				<Route path='/Community' element={<Community />}/>
				<Route path='/loading' element={<Loading />}/>
			</Routes>
			
			<Footer />
		</>
	);
}
export default App;