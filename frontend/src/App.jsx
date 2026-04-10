import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { AppProvider } from './context';
import Dashboard from './pages/Dashboard';
import Sessions from './pages/Sessions';
import Rules from './pages/Rules';
import Logs from './pages/Logs';
import './App.css';

function Sidebar() {
  return (
    <nav className="sidebar">
      <h1 className="app-title">zapWay</h1>
      <ul className="nav-menu">
        <li>
          <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
            Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink to="/sessions" className={({ isActive }) => isActive ? 'active' : ''}>
            Sessões
          </NavLink>
        </li>
        <li>
          <NavLink to="/rules" className={({ isActive }) => isActive ? 'active' : ''}>
            Regras
          </NavLink>
        </li>
        <li>
          <NavLink to="/logs" className={({ isActive }) => isActive ? 'active' : ''}>
            Logs
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}

function Layout({ children }) {
  return (
    <div className="app">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="sessions" element={<Sessions />} />
            <Route path="rules" element={<Rules />} />
            <Route path="logs" element={<Logs />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
