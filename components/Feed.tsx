import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MOCK_FLYERS } from '.././constants';
import { Flyer } from '.././types';
import { addEventToCalendar } from '../utils/calendar';
import FlyerCard from './FlyerCard';

interface FeedProps {
  initialFlyers: Flyer[];
  showToast: (message: string) => void;
  addedEventIds: Set<string>;
  onEventAdded: (flyerId: string) => void;
}

const Feed: React.FC<FeedProps> = ({ initialFlyers, showToast, addedEventIds, onEventAdded }) => {
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const allFlyers = [...initialFlyers, ...MOCK_FLYERS];
    const uniqueFlyers = Array.from(new Set(allFlyers.map(f => f.id))).map(id => allFlyers.find(f => f.id === id));
    const sortedFlyers = (uniqueFlyers as Flyer[]).sort((a, b) => (b.likes - b.dislikes) - (a.likes - a.dislikes));
    setFlyers(sortedFlyers);
    setCurrentIndex(0);
  }, [initialFlyers]);

  const handleSwipe = async (direction: 'right' | 'left') => {
    if (direction === 'right') {
      const currentFlyer = flyers[currentIndex];
      
      // Calculate end date (assume 2 hours after start)
      const startDate = new Date(currentFlyer.eventDate);
      const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
      
      const success = await addEventToCalendar({
        title: currentFlyer.title,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        location: currentFlyer.location,
        description: currentFlyer.description
      });
      
      if (success) {
        onEventAdded(currentFlyer.id);
        showToast('Added to calendar');
      } else {
        showToast('Failed to add to calendar');
      }
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
          if (index < currentIndex) return null;
          return (
            <FlyerCard
              key={flyer.id}
              flyer={flyer}
              isActive={index === currentIndex}
              onSwipe={handleSwipe}
            />
          );
        }).reverse()}
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
    color: '#78716c',
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