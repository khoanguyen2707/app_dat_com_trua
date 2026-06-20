import { useAuth } from './auth';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Spinner } from './ui';

export function App() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="login-screen">
        <Spinner />
      </div>
    );
  }
  return user ? <Dashboard /> : <Login />;
}
