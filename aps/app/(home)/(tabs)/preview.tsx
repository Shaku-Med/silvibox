// File: app/preview.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { handleAuthContext } from '@/app/Context/Context';

export default function PreviewScreen() {
  const router = useRouter();
  const { goback, setgoback } = handleAuthContext();
  const { uri, name } = useLocalSearchParams();
  const [fileInfo, setFileInfo] = useState<FileSystem.FileInfo | null>(null);
  const [fileContent, setFileContent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (uri && name) loadFileInfo();
  }, [uri, name]);

  const handleVerify = (objects: any) => {
    try {
      setgoback(objects);
      router.push('/(auth)');
    } catch {
      Alert.alert('Access Denied', 'You are not allowed to do anything here.');
    }
  };

  const loadFileInfo = async () => {
    try {
      const info = await FileSystem.getInfoAsync(uri as string);
      setFileInfo(info);

      const extension = name?.split('.').pop()?.toLowerCase();

      if (['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi'].includes(extension)) {
        setFileContent({ type: 'image' });
      } else if (extension === 'pdf') {
        setFileContent({ type: 'pdf' });
      } else if (['txt', 'md', 'js', 'json', 'html', 'css', 'xml'].includes(extension)) {
        const content = await FileSystem.readAsStringAsync(uri as string);
        setFileContent({ type: 'text', content });
      } else {
        setFileContent({ type: 'unsupported' });
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to load file: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const shareFile = async () => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }
      await Sharing.shareAsync(uri as string);
    } catch (error: any) {
      Alert.alert('Error', `Failed to share: ${error.message}`);
    }
  };

  const saveToDevice = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Cannot save file without permissions');
        return;
      }
      const asset = await MediaLibrary.createAssetAsync(uri as string);
      await MediaLibrary.createAlbumAsync('ExpoFileManager', asset, false);
      Alert.alert('Success', `Saved ${name} to your device`);
    } catch (error: any) {
      Alert.alert('Error', `Failed to save to device: ${error.message}`);
    }
  };

  const deleteFile = async () => {
    Alert.alert('Delete File', `Are you sure you want to delete ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await FileSystem.deleteAsync(uri as string);
            router.back();
          } catch (error: any) {
            Alert.alert('Error', `Failed to delete: ${error.message}`);
          }
        },
      },
    ]);
  };

  const callS: any = () => ({
    shareFile,
    saveToDevice,
    deleteFile,
  });

  const GMT = async (action?: string) => {
    const g = goback;
    if (g && typeof g === 'object') {
      if (g.verified === true || action) {
        await callS()[action || g?.action]?.();
        return true;
      }
    }
    return null;
  };

  useFocusEffect(
    useCallback(() => {
      GMT();
    }, [])
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200EE" />
          <Text style={styles.loadingText}>Loading file...</Text>
        </View>
      );
    }

    switch (fileContent?.type) {
      case 'image':
        return <Image source={{ uri }} style={styles.imagePreview} resizeMode="contain" />;
      case 'pdf':
        return <WebView source={{ uri }} style={styles.webView} />;
      case 'text':
        return (
          <ScrollView style={styles.textContainer}>
            <Text style={styles.textContent}>{fileContent.content}</Text>
          </ScrollView>
        );
      default:
        return (
          <View style={styles.unsupportedContainer}>
            <Ionicons name="document-outline" size={64} color="#6200EE" />
            <Text style={styles.unsupportedText}>This file type cannot be previewed</Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {name}
        </Text>
      </View>

      <View style={styles.contentContainer}>{renderContent()}</View>

      <View style={styles.footer}>
        {['shareFile', 'saveToDevice', 'deleteFile'].map((action, index) => (
          <TouchableOpacity
            key={action}
            style={styles.footerButton}
            onPress={async () => {
              const result = await GMT(action);
              if (!result) {
                handleVerify({
                  returnto: { endpoint: '/(home)/(tabs)/preview', params: { uri, name } },
                  action,
                });
              }
            }}
          >
            <Ionicons
              name={action === 'deleteFile' ? 'trash-outline' : action === 'saveToDevice' ? 'download-outline' : 'share-outline'}
              size={24}
              color={action === 'deleteFile' ? '#F44336' : '#6200EE'}
            />
            <Text style={[styles.footerButtonText, action === 'deleteFile' && { color: '#F44336' }]}>
              {action === 'deleteFile' ? 'Delete' : action === 'saveToDevice' ? 'Save' : 'Share'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#6200EE', flexDirection: 'row', alignItems: 'center', padding: 16 },
  backButton: { marginRight: 16 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', flex: 1 },
  contentContainer: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#6200EE' },
  imagePreview: { flex: 1, width: '100%', backgroundColor: 'black' },
  webView: { flex: 1 },
  footer: { flexDirection: 'row', justifyContent: 'space-around', padding: 16, backgroundColor: 'white' },
  footerButton: { alignItems: 'center' },
  footerButtonText: { marginTop: 4, fontSize: 12, color: '#6200EE' },
});
