import { useColorScheme } from 'react-native';
import { useStore } from './useStore';

export const lightColors = {
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  primary: '#2563EB',
  inputBackground: '#F1F5F9',
  avatarBackground: '#DBEAFE',
  avatarText: '#1E3A8A',
};

export const darkColors = {
  background: '#0F172A',
  card: '#1E293B',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  border: '#334155',
  primary: '#3B82F6',
  inputBackground: '#0F172A', 
  avatarBackground: '#1E3A8A',
  avatarText: '#DBEAFE',
};

export function useThemeColors() {
  const { theme } = useStore();
  const systemColorScheme = useColorScheme();
  
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  
  return { colors: isDark ? darkColors : lightColors, isDark };
}
