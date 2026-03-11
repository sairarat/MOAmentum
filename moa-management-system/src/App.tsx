import { Outlet } from 'react-router-dom';

function App() {
  return (
    <div className="app-root">
      {/* AuthProvider is now in main.tsx wrapping the router */}
      <Outlet /> 
    </div>
  );
}

export default App;