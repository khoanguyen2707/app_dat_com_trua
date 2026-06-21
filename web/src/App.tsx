import { useAuth } from '@/context/AuthContext';
import { LoginScreen } from '@/features/auth/LoginScreen';
import { Dashboard } from '@/pages/Dashboard';
import { Spinner } from '@/components/ui';

export function App() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="login-screen">
        <Spinner />
      </div>
    );
  }
  return user ? <Dashboard /> : <LoginScreen />;
}
