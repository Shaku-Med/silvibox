import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';
import { useEffect } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';

export default function Layout() {
  useEffect(() => {
    ScreenOrientation.Orientation.LANDSCAPE_LEFT
  })
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer screenOptions={{ headerShown: false }}>
        <Drawer.Screen
          name="(tabs)"
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}
