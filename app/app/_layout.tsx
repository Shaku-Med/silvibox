import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthContext } from './Context/Context';
import IsAuth from './IsAuth/IsAuth';
import {Provider as PaperProvider } from 'react-native-paper';
// import { enableScreens } from 'react-native-screens';

import { AlertsProvider } from 'react-native-paper-alerts';
import { Platform } from 'react-native';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  let x = useRef<boolean>(false)
  let [goback, setgoback] = useState<string | any>(null)

  // let DisableScreen = async () => {
  //   if (Platform.OS === 'android') {
  //     const FLAG_SECURE = 0x00002000;
  //     const activity = require('react-native').NativeModules.UIManager.getViewManagerConfig('RCTRootView').Constants;
  //     const context = require('react-native').NativeModules.UIManager.dispatchViewManagerCommand;

  //     context(activity, 'setFlags', [FLAG_SECURE, FLAG_SECURE]);
  //   } else if (Platform.OS === 'ios') {
  //     require('react-native').NativeModules.Screens.setSecure(true);
  //   }
  // }

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <PaperProvider>
          <AlertsProvider>
            <AuthContext.Provider value={{x, goback, setgoback}}>
              <Slot/>
            </AuthContext.Provider>
          </AlertsProvider>
        </PaperProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
