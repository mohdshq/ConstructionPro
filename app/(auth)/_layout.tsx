import { Stack } from 'expo-router';
import { useThemeColors } from '../../store/useThemeColors';

export default function AuthLayout() {
    const { colors } = useThemeColors();

    return (
        <Stack screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background }
        }}>
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="forgot-password" />
        </Stack>
    );
}
