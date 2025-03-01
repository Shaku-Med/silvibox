import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Stack } from 'expo-router';

export default function Layout() {
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack initialRouteName={`(tabs)`} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </GestureHandlerRootView>
  );
}
