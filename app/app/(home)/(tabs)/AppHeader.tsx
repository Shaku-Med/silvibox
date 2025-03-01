// File: components/AppHeader.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const AppHeader = ({
  title,
  showBack,
  onBack,
  isSelectionMode,
  selectedCount,
  onCancelSelection,
  onDelete,
  onRename,
  onShare
}: any) => {
  const renderNormalHeader = () => (
    <View style={styles.header}>
      {showBack && (
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
      )}
      <Text style={styles.title}>{title}</Text>
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => router.push('/create-file', { currentPath: title !== 'My Files' ? title : '' })}
      >
        <Ionicons name="create-outline" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );

  const renderSelectionHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={onCancelSelection} style={styles.backButton}>
        <Ionicons name="close" size={24} color="white" />
      </TouchableOpacity>
      <Text style={styles.title}>{selectedCount} selected</Text>
      <View style={styles.actionContainer}>
        {selectedCount === 1 && (
          <TouchableOpacity style={styles.actionButton} onPress={onRename}>
            <Ionicons name="create-outline" size={24} color="white" />
          </TouchableOpacity>
        )}
        {selectedCount === 1 && (
          <TouchableOpacity style={styles.actionButton} onPress={onShare}>
            <Ionicons name="share-outline" size={24} color="white" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.actionButton} onPress={onDelete}>
          <Ionicons name="trash-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return isSelectionMode ? renderSelectionHeader() : renderNormalHeader();
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#6200EE',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    elevation: 4,
    marginTop: 15
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  actionContainer: {
    flexDirection: 'row',
  },
  actionButton: {
    marginLeft: 16,
  },
});

export default AppHeader;

