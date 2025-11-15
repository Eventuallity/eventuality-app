import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flyer } from '.././types';
import { MOCK_FLYERS } from '.././constants';
import FlyerCard from './FlyerCard';

interface FeedProps {
  initialFlyers: Flyer[];
  showToast: (message: string) => void;
}

const Feed: React.FC<FeedProps> = ({ initialFlyers, showToast }) => {
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const allFlyers = [...initialFlyers, ...MOCK_FLYERS];
    const uniqueFlyers = Array.from(new Set(allFlyers.map(f => f.id))).map(id => allFlyers.find(f => f.id === id));
    const sortedFlyers = (uniqueFlyers as Flyer[]).sort((a, b) => (b.likes - b.dislikes) - (a.likes - a.dislikes));
    setFlyers(sortedFlyers);
    setCurrentIndex(0);
  }, [initialFlyers]);

  const handleSwipe = (direction: 'right' | 'left') => {
    if (direction === 'right') {
      showToast('Added to calendar');
    }
    setCurrentIndex((prevIndex) => (prevIndex + 1) % flyers.length);
  };

  if (flyers.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading flyers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cardContainer}>
        {flyers.map((flyer, index) => {
          if (index < currentIndex) return null; // Don't render swiped cards
          return (
            <FlyerCard
              key={flyer.id}
              flyer={flyer}
              isActive={index === currentIndex}
              onSwipe={handleSwipe}
            />
          );
        }).reverse() /* Reverse to stack them correctly */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1c1917',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#78716c', // stone-500
  },
  container: {
    flex: 1,
    backgroundColor: '#1c1917',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 16,
  },
  cardContainer: {
    width: '100%',
    height: '100%',
    maxHeight: '85%',
    maxWidth: 400,
  },
});

export default Feed;
