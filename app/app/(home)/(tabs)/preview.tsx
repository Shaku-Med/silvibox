// app/preview.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';

const { width, height } = Dimensions.get('window');

export default function PreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const uri = decodeURIComponent(params.uri || '');
  const name = decodeURIComponent(params.name || '');
  
  const fileExtension = name.split('.').pop().toLowerCase();
  let previewType = 'unknown';
  
  if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
    previewType = 'image';
  } else if (['mp4', 'mov', 'avi'].includes(fileExtension)) {
    previewType = 'video';
  } else if (['mp3', 'wav', 'ogg'].includes(fileExtension)) {
    previewType = 'audio';
  } else if (['pdf'].includes(fileExtension)) {
    previewType = 'pdf';
  } else if (['txt', 'md', 'json', 'js', 'html', 'css'].includes(fileExtension)) {
    previewType = 'text';
  }

  const saveFileToDevice = async () => {
    try {
      const isSharingAvailable = await Sharing.isAvailableAsync();
      
      if (isSharingAvailable) {
        await Sharing.shareAsync(uri);
      } else {
        const asset = await MediaLibrary.createAssetAsync(uri);
        await MediaLibrary.createAlbumAsync('ExpoFileSystem', asset, false);
        Alert.alert('Success', `File saved to your device's media library`);
      }
    } catch (error) {
      console.error('Error saving file:', error);
      Alert.alert('Error', 'Failed to save file to device');
    }
  };

  const getIconForFile = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return { name: 'file-pdf-box', color: '#FF5252' };
      case 'doc':
      case 'docx':
        return { name: 'file-word', color: '#2196F3' };
      case 'xls':
      case 'xlsx':
        return { name: 'file-excel', color: '#4CAF50' };
      case 'ppt':
      case 'pptx':
        return { name: 'file-powerpoint', color: '#FF9800' };
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return { name: 'file-image', color: '#9C27B0' };
      case 'mp3':
      case 'wav':
      case 'ogg':
        return { name: 'file-music', color: '#00BCD4' };
      case 'mp4':
      case 'mov':
      case 'avi':
        return { name: 'file-video', color: '#E91E63' };
      case 'zip':
      case 'rar':
      case '7z':
        return { name: 'zip-box', color: '#795548' };
      case 'txt':
      case 'md':
        return { name: 'file-document', color: '#607D8B' };
      case 'js':
      case 'json':
      case 'html':
      case 'css':
        return { name: 'code-tags', color: '#FF9800' };
      default:
        return { name: 'file-outline', color: '#9E9E9E' };
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: name,
          headerStyle: {
            backgroundColor: '#6200EE',
          },
          headerTintColor: '#fff',
          headerRight: () => (
            <TouchableOpacity
              onPress={saveFileToDevice}
              style={styles.headerButton}
            >
              <Feather name="download" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          ),
        }}
      />
      
      <View style={styles.previewContent}>
        {previewType === 'image' ? (
          <Image 
            source={{ uri }} 
            style={styles.previewImage} 
            resizeMode="contain" 
          />
        ) : previewType === 'video' ? (
          <Video
            source={{ uri }}
            style={styles.previewVideo}
            useNativeControls
            resizeMode="contain"
            isLooping
          />
        ) : previewType === 'audio' ? (
          <View style={styles.unsupportedPreview}>
            <MaterialCommunityIcons
              name="file-music"
              size={100}
              color="#00BCD4"
            />
            <Text style={styles.previewText}>Audio file preview unavailable</Text>
            <TouchableOpacity 
              style={styles.previewButton}
              onPress={saveFileToDevice}
            >
              <Text style={styles.previewButtonText}>Save to Device</Text>
            </TouchableOpacity>
          </View>
        ) : previewType === 'pdf' ? (
          <View style={styles.unsupportedPreview}>
            <MaterialCommunityIcons
              name="file-pdf-box"
              size={100}
              color="#FF5252"
            />
            <Text style={styles.previewText}>PDF file preview unavailable</Text>
            <TouchableOpacity 
              style={styles.previewButton}
              onPress={saveFileToDevice}
            >
              <Text style={styles.previewButtonText}>Save to Device</Text>
            </TouchableOpacity>
          </View>
        ) : previewType === 'text' ? (
          <View style={styles.unsupportedPreview}>
            <MaterialCommunityIcons
              name="file-document"
              size={100}
              color="#607D8B"
            />
            <Text style={styles.previewText}>Text file preview unavailable</Text>
            <TouchableOpacity 
              style={styles.previewButton}
              onPress={saveFileToDevice}
            >
              <Text style={styles.previewButtonText}>Save to Device</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.unsupportedPreview}>
            <MaterialCommunityIcons 
              name={getIconForFile(name).name} 
              size={100} 
              color={getIconForFile(name).color} 
            />
            <Text style={styles.previewText}>Preview not available</Text>
            <Text style={styles.previewSubtext}>File type: {fileExtension}</Text>
            <TouchableOpacity 
              style={styles.previewButton}
              onPress={saveFileToDevice}
            >
              <Text style={styles.previewButtonText}>Save to Device</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerButton: {
    marginRight: 15,
  },
  previewContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: width - 40,
    height: height - 150,
  },
  previewVideo: {
    width: width - 40,
    height: height - 150,
  },
  unsupportedPreview: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  previewSubtext: {
    color: '#ccc',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 5,
  },
  previewButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 30,
    backgroundColor: '#6200EE',
    borderRadius: 5,
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});
