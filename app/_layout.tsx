import { Stack, useRouter, useSegments } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../auth-context';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  React.useEffect(() => {
    if (loading) return;

    const inTabsGroup = segments[0] === '(tabs)';
    const inAuthScreens = segments[0] === 'login' || segments[0] === 'register';

    if (!user && inTabsGroup) {
      // Not logged in but trying to access tabs → send to login
      router.replace('/login');
    } else if (user && inAuthScreens) {
      // Logged in but on auth screens → send to home
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, router]);

  if (loading) {
    // While Supabase checks the stored session
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#1c1917',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator color="#a855f7" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthGate>
    </AuthProvider>
  );
}
