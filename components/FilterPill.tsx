import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';

interface FilterPillProps {
  label: string;
  isActive?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  activeOpacity?: number;
  icon?: React.ReactNode;
}

export const FilterPill: React.FC<FilterPillProps> = ({
  label,
  isActive = false,
  onPress,
  style,
  textStyle,
  activeOpacity = 0.75,
  icon,
}) => {
  return (
    <TouchableOpacity
      style={[styles.filterPill, isActive && styles.filterPillActive, style]}
      onPress={onPress}
      activeOpacity={activeOpacity}
    >
      {icon ? icon : null}
      <Text
        style={[
          styles.filterPillText,
          isActive && styles.filterPillTextActive,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#FFFFFF',
  },
  filterPillActive: {
    backgroundColor: '#0D0D0D',
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  filterPillTextActive: {
    color: '#C4FF0E',
  },
});
