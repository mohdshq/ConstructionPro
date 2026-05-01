import { TouchableOpacity, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useThemeColors } from '../store/useThemeColors';

interface BackButtonProps {
    style?: StyleProp<ViewStyle>;
    color?: string; // Optional override color, otherwise uses theme text color
    onPress?: () => void; // Optional custom fallback
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function BackButton({ style, color, onPress }: BackButtonProps) {
    const router = useRouter();
    const { colors } = useThemeColors();
    
    // Scale animation state
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }]
        };
    });

    const handlePressIn = () => {
        scale.value = withSpring(0.9, { damping: 10, mass: 0.5, stiffness: 200 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 10, mass: 0.5, stiffness: 200 });
    };

    const handlePress = () => {
        if (onPress) {
            onPress();
        } else {
            router.back();
        }
    };

    return (
        <AnimatedTouchable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handlePress}
            activeOpacity={0.8}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            style={[styles.container, animatedStyle, style]}
        >
            <ArrowLeft 
                color={color || colors.text} 
                size={24} 
            />
        </AnimatedTouchable>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            web: { cursor: 'pointer' as any }
        })
    }
});
