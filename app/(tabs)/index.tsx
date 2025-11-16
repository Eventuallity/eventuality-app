import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, View as ViewComponent } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../auth-context';
import BottomNav from '../../components/BottomNav';
import Explore from '../../components/Explore';
import Feed from '../../components/Feed';
import Header from '../../components/Header';
import LogoutConfirmModal from '../../components/LogoutConfirmModal';
import Toast from '../../components/Toast';
import UploadModal from '../../components/UploadModal';
import { supabase } from '../../supabase-client';
import { Flyer } from '../../types';

export type ViewType = 'feed' | 'explore';

function App() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [activeView, setActiveView] = useState<ViewType>('feed');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Shared state for tracking which events have been added to calendar
  const [addedEventIds, setAddedEventIds] = useState<Set<string>>(new Set());

  const handleOpenUpload = () => setIsUploadModalOpen(true);
  const handleCloseUpload = () => setIsUploadModalOpen(false);

  const handleLogoutClick = () => setIsLogoutModalOpen(true);
  const handleCloseLogoutModal = () => setIsLogoutModalOpen(false);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleConfirmLogout = async () => {
    setIsLogoutModalOpen(false);
    await signOut();
    showToast('Logged out successfully');
    setTimeout(() => {
      router.replace('/login');
    }, 1000);
  };

  const handleUploadSuccess = (newFlyer: Flyer) => {
    setFlyers(prev => [newFlyer, ...prev]);
    handleCloseUpload();
    setActiveView('feed');
  };

  const handleToggleSearch = (active: boolean) => {
    setIsSearchActive(active);
    if (active) {
      setActiveView('explore');
    }
    if (!active) {
      setSearchTerm('');
    }
  };

  const handleEventAdded = (flyerId: string) => {
    setAddedEventIds(prev => new Set(prev).add(flyerId));
  };

  const handleEventRemoved = (flyerId: string) => {
    setAddedEventIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(flyerId);
      return newSet;
    });
  };

  // Re-hydrate added events for the signed-in user so UI persists across sessions
  useEffect(() => {
    if (!user?.email) {
      setAddedEventIds(new Set());
      return;
    }

    const loadAddedEvents = async () => {
      const { data, error } = await supabase
        .from('calendar_add')
        .select('image_id')
        .eq('email', user.email);

      if (error) {
        console.error('Failed to load calendar additions', error);
        return;
      }

      const ids = (data ?? [])
        .map(row => row.image_id)
        .filter((id): id is string => Boolean(id));

      setAddedEventIds(new Set(ids));
    };

    loadAddedEvents();
  }, [user?.email]);

  return (
    <GestureHandlerRootView style={styles.gestureHandler}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#1c1917" />
        <ViewComponent style={styles.container}>
          <Header 
            onUploadClick={handleOpenUpload}
            onLogoutClick={handleLogoutClick}
            isSearchActive={isSearchActive}
            searchTerm={searchTerm}
            onToggleSearch={handleToggleSearch}
            onSearchTermChange={setSearchTerm}
          />
          <ViewComponent style={styles.main}>
            {activeView === 'feed' && (
              <Feed 
                initialFlyers={flyers} 
                showToast={showToast}
                addedEventIds={addedEventIds}
                onEventAdded={handleEventAdded}
              />
            )}
            {activeView === 'explore' && (
              <Explore 
                searchTerm={searchTerm} 
                showToast={showToast}
                addedEventIds={addedEventIds}
                onEventAdded={handleEventAdded}
                onEventRemoved={handleEventRemoved}
              />
            )}
          </ViewComponent>
          <BottomNav activeView={activeView} setView={setActiveView} /> 

          <UploadModal 
            visible={isUploadModalOpen} 
            onClose={handleCloseUpload} 
            onUploadSuccess={handleUploadSuccess} 
          />
          <LogoutConfirmModal 
            visible={isLogoutModalOpen} 
            onClose={handleCloseLogoutModal} 
            onConfirm={handleConfirmLogout} 
          />
          <Toast message={toastMessage} />
        </ViewComponent>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureHandler: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#1c1917',
  },
  container: {
    flex: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#292524',
  },
  main: {
    flex: 1,
    overflow: 'hidden',
  },
});

export default App;
