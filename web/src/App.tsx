import { useAuth } from '@/context/AuthContext';
import { LoginScreen } from '@/features/auth/LoginScreen';
import { Dashboard } from '@/pages/Dashboard';
import { Spinner } from '@/components/ui';
import { ActivityIndicator } from '@/components/layout/ActivityIndicator';

export function App() {
  const { user, loading } = useAuth();
  return (
    <>
      <ActivityIndicator />
      {loading ? (
        <div className="login-screen">
          <Spinner />
        </div>
      ) : user ? (
        <Dashboard />
      ) : (
        <LoginScreen />
      )}
    </>
  );
}
