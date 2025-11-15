import React from 'react';
import { ScrollView, Text, Pressable, StyleSheet, View } from 'react-native';
import { Category } from '.././types';
import { CATEGORIES } from '.././constants';

interface FilterBarProps {
  selectedCategory: Category | 'All';
  onSelectCategory: (category: Category | 'All') => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ selectedCategory, onSelectCategory }) => {
  const allCategories: (Category | 'All')[] = ['All', ...CATEGORIES];

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollView}>
        {allCategories.map(category => {
          const isSelected = category === selectedCategory;
          return (
            <Pressable
              key={category}
              onPress={() => onSelectCategory(category)}
              style={({pressed}) => [
                styles.button,
                isSelected ? styles.selectedButton : styles.unselectedButton,
                pressed && styles.pressedButton
              ]}
            >
              <Text style={isSelected ? styles.selectedText : styles.unselectedText}>
                {category}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(28, 25, 23, 0.7)',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  scrollView: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedButton: {
    backgroundColor: '#9333ea', // purple-600
  },
  unselectedButton: {
    backgroundColor: '#292524', // stone-800
  },
  pressedButton: {
      backgroundColor: '#44403c', // stone-700
  },
  selectedText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  unselectedText: {
    color: '#d6d3d1', // stone-300
    fontWeight: '500',
    fontSize: 14,
  },
});

export default FilterBar;
