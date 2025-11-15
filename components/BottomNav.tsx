import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Icon from './Icon';
import { ViewType } from '../app/(tabs)/index';

interface BottomNavProps {
  activeView: ViewType;
  setView: (view: ViewType) => void;
}

const NavButton = ({ iconName, label, isActive, onClick }: { iconName: string, label: string, isActive: boolean, onClick: () => void }) => {
  const activeColor = '#a855f7'; // purple-500
  const inactiveColor = '#78716c'; // stone-500

  return (
    <Pressable
      onPress={onClick}
      style={({ pressed }) => [
        styles.navButton,
        pressed && styles.pressed,
      ]}
    >
      <Icon name={iconName} className="w-7 h-7" color={isActive ? activeColor : inactiveColor} />
      <Text style={[styles.label, { color: isActive ? activeColor : inactiveColor }]}>{label}</Text>
    </Pressable>
  );
};

const BottomNav: React.FC<BottomNavProps> = ({ activeView, setView }) => {
  return (
    <View style={styles.footer}>
      <View style={styles.nav}>
        <NavButton
          iconName="home"
          label="Home"
          isActive={activeView === 'feed'}
          onClick={() => setView('feed')}
        />
        
        <NavButton
          iconName="discover"
          label="Discover"
          isActive={activeView === 'explore'}
          onClick={() => setView('explore')}
        />
      </View>
    </View>
  );
};


const styles = StyleSheet.create({
  footer: {
    backgroundColor: 'rgba(28, 25, 23, 0.5)',
    borderTopWidth: 1,
    borderColor: 'rgba(41, 37, 36, 0.7)',
  },
  nav: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  pressed: {
    backgroundColor: 'rgba(41, 37, 36, 0.5)',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
});

export default BottomNav;
