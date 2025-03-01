import { useEffect } from 'react';
import { NativeModules, Platform } from 'react-native';

const { AndroidPreventScreenshot } = NativeModules;

const usePreventScreenshot = () => {
  useEffect(() => {
    if (Platform.OS === 'android' && AndroidPreventScreenshot) {
      AndroidPreventScreenshot.activate();
      return () => AndroidPreventScreenshot.deactivate();
    }
  }, []);
};

export default usePreventScreenshot;
