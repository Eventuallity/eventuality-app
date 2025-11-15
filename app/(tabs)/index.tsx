import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View as ViewComponent, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Header from '../../components/Header';
import Feed from '../../components/Feed';
import BottomNav from '../../components/BottomNav';
import UploadModal from '../../components/UploadModal';
import Explore from '../../components/Explore';
import LogoutConfirmModal from '../../components/LogoutConfirmModal';
import Toast from '../../components/Toast';
import { Flyer } from '../.././types';
import { useRouter } from 'expo-router';
import { useAuth } from '../../auth-context';   // ⬅️ add this line

export type ViewType = 'feed' | 'explore';

const router = useRouter();

function App() {
  const { user, signOut } = useAuth();        // ⬅️ access current user + signOut
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [activeView, setActiveView] = useState<ViewType>('feed');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
    await signOut();                    // ⬅️ log out from Supabase
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
            {activeView === 'feed' && <Feed initialFlyers={flyers} showToast={showToast} />}
            {activeView === 'explore' && <Explore searchTerm={searchTerm} />}
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
    backgroundColor: '#1c1917', // stone-950
  },
  container: {
    flex: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#292524', // stone-800
  },
  main: {
    flex: 1,
    overflow: 'hidden',
  },
});

export default App;