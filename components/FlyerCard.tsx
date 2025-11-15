import React from 'react';
import { StyleSheet, Dimensions, Image } from 'react-native';
import { Flyer } from '.././types';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

interface FlyerCardProps {
  flyer: Flyer;
  isActive: boolean;
  onSwipe: (direction: 'right' | 'left') => void;
}

const { width: screenWidth } = Dimensions.get('window');
const SWIPE_THRESHOLD = screenWidth * 0.4;

const FlyerCard: React.FC<FlyerCardProps> = ({ flyer, isActive, onSwipe }) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      if (!isActive) return;
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      rotation.value = (event.translationX / screenWidth) * 20;
    })
    .onEnd((event) => {
      if (!isActive) return;
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        const direction = event.translationX > 0 ? 'right' : 'left';
        translateX.value = withTiming(Math.sign(event.translationX) * screenWidth * 1.5, { duration: 200 });
        rotation.value = withTiming(Math.sign(event.translationX) * 45, { duration: 200 });
        
        // Use runOnJS to call the React state update from the UI thread
        runOnJS(onSwipe)(direction);

      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        rotation.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.card, animatedStyle]}>
        <Image source={{ uri: flyer.imageUrl }} style={styles.image} resizeMode="cover" />
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#292524', // stone-800
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default FlyerCard;
