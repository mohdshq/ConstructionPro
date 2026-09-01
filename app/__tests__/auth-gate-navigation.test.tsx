(global as any).__DEV__ = true;

import React from 'react';
import { render, act, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import RootLayout from '../_layout';
import RegisterScreen from '../(auth)/register';
import ForgotPasswordScreen from '../(auth)/forgot-password';
import { useAuthStore, __resetAuthInitForTests } from '../../store/useAuthStore';
import { useStore } from '../../store/useStore';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'fs';
import path from 'path';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockDismissTo = jest.fn();

jest.mock('expo-router', () => {
  const React = require('react');

  const Stack: any = ({ children }: any) => {
    return React.createElement('Stack', null, children);
  };

  Stack.Screen = ({ name, options }: any) => {
    return React.createElement('StackScreen', { name, options, testID: `screen-${name}` });
  };

  Stack.Protected = ({ guard, children }: any) => {
    return guard ? children : null;
  };

  return {
    useRouter: () => ({
      push: mockPush,
      replace: mockReplace,
      back: mockBack,
      dismissTo: mockDismissTo,
    }),
    Link: ({ children, href, asChild }: any) => children,
    Stack,
  };
});

jest.mock('../../hooks/use-color-scheme', () => ({
  useColorScheme: () => 'dark',
}));

jest.mock('../../store/useThemeColors', () => ({
  useThemeColors: () => ({
    colors: {
      background: '#0F172A',
      text: '#F8FAFC',
      card: '#1E293B',
      border: '#334155',
      inputBackground: '#1E293B',
      textMuted: '#94A3B8',
      primary: '#2563EB',
    },
    isDark: true,
  }),
}));

jest.mock('../../components/OfflineBanner', () => ({
  OfflineBanner: () => null,
}));

jest.mock('../../components/OfflineGraceBanner', () => ({
  OfflineGraceBanner: () => null,
}));

jest.mock('../../lib/usePushNotifications', () => ({
  usePushNotifications: jest.fn(),
}));

jest.mock('../../lib/ai/useEnrichmentWorker', () => ({
  useEnrichmentWorker: jest.fn(),
}));

jest.mock('../../lib/powersync/lifecycle', () => ({
  setupPowerSync: jest.fn().mockResolvedValue(undefined),
  teardownPowerSync: jest.fn().mockResolvedValue(undefined),
  clearPowerSyncForNewUser: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../lib/powersync/system', () => ({
  powersync: {},
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      getSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      refreshSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  },
}));

describe('Declarative Auth Gate & Navigation (_layout.tsx, register.tsx, forgot-password.tsx)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    __resetAuthInitForTests();
    await AsyncStorage.clear();
    useStore.setState({ isPremium: true });
    jest.spyOn(useStore.persist, 'hasHydrated').mockReturnValue(true);
    jest.spyOn(useStore.persist, 'onFinishHydration').mockImplementation((cb: any) => {
      cb();
      return () => {};
    });
  });

  describe('(a) Auth stack single login screen on registration & password reset', () => {
    it('calls router.dismissTo(/(auth)/login) after successful registration to maintain stack depth 1', async () => {
      const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { session: null, user: { id: 'new-user' } },
        error: null,
      });

      const { getByPlaceholderText, getAllByPlaceholderText, getAllByText } = await render(<RegisterScreen />);

      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('John Doe'), 'New User');
        fireEvent.changeText(getByPlaceholderText('name@company.com'), 'newuser@test.com');
        const passwordInputs = getAllByPlaceholderText('••••••••');
        fireEvent.changeText(passwordInputs[0], 'Password123!');
        fireEvent.changeText(passwordInputs[1], 'Password123!');
      });

      const createButtons = getAllByText('Create Account');
      const submitBtn = createButtons[createButtons.length - 1];

      await act(async () => {
        fireEvent.press(submitBtn);
      });

      expect(mockAlert).toHaveBeenCalledWith(
        'Registration Successful',
        'Please check your email to verify your account.',
        expect.arrayContaining([expect.objectContaining({ text: 'OK' })])
      );

      const alertCall = mockAlert.mock.calls[0];
      const buttons = alertCall[2] as any[];
      const okButton = buttons.find((b) => b.text === 'OK');
      expect(okButton).toBeDefined();

      // Trigger OK action
      okButton.onPress();

      // Assert router.dismissTo('/(auth)/login') is called
      expect(mockDismissTo).toHaveBeenCalledWith('/(auth)/login');
      expect(mockPush).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('calls router.dismissTo(/(auth)/login) from forgot password screen', async () => {
      (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
        data: {},
        error: null,
      });

      const { getByPlaceholderText, getByText } = await render(<ForgotPasswordScreen />);

      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('name@company.com'), 'test@example.com');
      });

      const sendButton = getByText('Send Reset Link');
      await act(async () => {
        fireEvent.press(sendButton);
      });

      const returnButton = getByText('Return to Login');
      await act(async () => {
        fireEvent.press(returnButton);
      });

      expect(mockDismissTo).toHaveBeenCalledWith('/(auth)/login');
      expect(mockPush).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('(b) & (c) Declarative Stack.Protected route visibility', () => {
    it('(b) with authMode signed-out: only (auth) group renders, (tabs) and root screens do not', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      useAuthStore.setState({
        isInitialized: true,
        authMode: 'signed-out',
        user: null,
      });

      const { container } = await render(<RootLayout />);
      const screenNodes = (container as any).findAll((node: any) => node.type === 'StackScreen');
      const renderedScreenNames = screenNodes.map((n: any) => n.props.name);

      // (auth) screen MUST be rendered
      expect(renderedScreenNames).toContain('(auth)');

      // Protected authenticated screens MUST NOT be rendered
      expect(renderedScreenNames).not.toContain('(tabs)');
      expect(renderedScreenNames).not.toContain('settings');
      expect(renderedScreenNames).not.toContain('daily-report');
      expect(renderedScreenNames).not.toContain('quick-log');
      expect(renderedScreenNames).not.toContain('project');
      expect(renderedScreenNames).not.toContain('project/[id]');
      expect(renderedScreenNames).not.toContain('concrete-calculator');
    });

    it('(c) with authMode online: (tabs), settings, and all root screens render, (auth) does not', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: { id: 'test-user' } } },
        error: null,
      });

      useAuthStore.setState({
        isInitialized: true,
        authMode: 'online',
        user: { id: 'test-user' } as any,
      });

      const { container } = await render(<RootLayout />);
      const screenNodes = (container as any).findAll((node: any) => node.type === 'StackScreen');
      const renderedScreenNames = screenNodes.map((n: any) => n.props.name);

      // (auth) screen MUST NOT be rendered
      expect(renderedScreenNames).not.toContain('(auth)');

      // (tabs) and root screens MUST be rendered
      expect(renderedScreenNames).toContain('(tabs)');
      expect(renderedScreenNames).toContain('modal');
      expect(renderedScreenNames).toContain('ai-wizard');
      expect(renderedScreenNames).toContain('settings');
      expect(renderedScreenNames).toContain('daily-report');
      expect(renderedScreenNames).toContain('quick-log');
      expect(renderedScreenNames).toContain('saved-calculations');
      expect(renderedScreenNames).toContain('converter');

      // Real project subroutes
      expect(renderedScreenNames).toContain('project/[id]');
      expect(renderedScreenNames).toContain('project/create');
      expect(renderedScreenNames).toContain('project/[id]/activity');
      expect(renderedScreenNames).toContain('project/[id]/team');
      expect(renderedScreenNames).toContain('project/[id]/drawings/index');
      expect(renderedScreenNames).toContain('project/[id]/drawings/[drawingId]');
      expect(renderedScreenNames).toContain('project/[id]/report/create');
      expect(renderedScreenNames).toContain('project/[id]/report/[reportId]');
      expect(renderedScreenNames).toContain('project/[id]/snags/index');
      expect(renderedScreenNames).toContain('project/[id]/snags/create');
      expect(renderedScreenNames).toContain('project/[id]/snags/report');
      expect(renderedScreenNames).toContain('project/[id]/snags/[snagId]');

      // 'project' bare route is not in renderedScreenNames
      expect(renderedScreenNames).not.toContain('project');

      // All 15 calculators
      expect(renderedScreenNames).toContain('asphalt-calculator');
      expect(renderedScreenNames).toContain('block-calculator');
      expect(renderedScreenNames).toContain('concrete-calculator');
      expect(renderedScreenNames).toContain('duct-calculator');
      expect(renderedScreenNames).toContain('dynamic-calculator');
      expect(renderedScreenNames).toContain('hvac-calculator');
      expect(renderedScreenNames).toContain('labor-calculator');
      expect(renderedScreenNames).toContain('ohms-calculator');
      expect(renderedScreenNames).toContain('pipe-calculator');
      expect(renderedScreenNames).toContain('pour-calculator');
      expect(renderedScreenNames).toContain('rebar-calculator');
      expect(renderedScreenNames).toContain('soil-calculator');
      expect(renderedScreenNames).toContain('stair-calculator');
      expect(renderedScreenNames).toContain('tile-calculator');
      expect(renderedScreenNames).toContain('voltage-calculator');
    });
  });

  describe('(d) Auth transitions without imperative navigation', () => {
    it('flipping signed-out -> online -> signed-out fires NO imperative navigation and switches declarative screens', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      // 1. Start signed-out
      useAuthStore.setState({
        isInitialized: true,
        authMode: 'signed-out',
        user: null,
        session: null,
        offlineUser: null,
      });

      const { container, rerender } = await render(<RootLayout />);

      let screenNodes = (container as any).findAll((node: any) => node.type === 'StackScreen');
      let names = screenNodes.map((n: any) => n.props.name);
      expect(names).toEqual(['(auth)']);
      expect(mockReplace).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();

      // 2. Transition signed-out -> online
      await act(async () => {
        useAuthStore.setState({
          authMode: 'online',
          user: { id: 'test-user' } as any,
          session: { user: { id: 'test-user' } } as any,
          offlineUser: null,
          isInitialized: true,
        });
        await rerender(<RootLayout />);
      });

      screenNodes = (container as any).findAll((node: any) => node.type === 'StackScreen');
      names = screenNodes.map((n: any) => n.props.name);
      expect(names).toContain('(tabs)');
      expect(names).not.toContain('(auth)');
      expect(mockReplace).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();

      // 3. Transition online -> signed-out
      await act(async () => {
        useAuthStore.setState({
          authMode: 'signed-out',
          user: null,
          session: null,
          offlineUser: null,
          isInitialized: true,
        });
        await rerender(<RootLayout />);
      });

      screenNodes = (container as any).findAll((node: any) => node.type === 'StackScreen');
      names = screenNodes.map((n: any) => n.props.name);
      expect(names).toEqual(['(auth)']);
      expect(mockReplace).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('(e) Settings sign-out regression test', () => {
    it('asserts app/settings.tsx contains no imperative router.replace/push to an auth route', () => {
      const settingsContent = fs.readFileSync(path.resolve(__dirname, '../settings.tsx'), 'utf8');

      // Must not navigate imperatively to login / auth upon sign out
      expect(settingsContent).not.toMatch(/router\.(replace|push)\s*\(\s*['"`]\/?\(?auth\)?/);
      expect(settingsContent).not.toMatch(/router\.(replace|push)\s*\(\s*['"`][^'"`]*login/);
    });
  });
});
