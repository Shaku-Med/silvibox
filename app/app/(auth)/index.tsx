import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet,  
  TouchableOpacity, 
  StatusBar,
  Vibration,
  Animated,
  Platform,
  Dimensions,
  Modal,
  Alert,
  KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { SafeAreaView } from 'react-native';
import { ScrollView } from 'react-native';

const { width, height } = Dimensions.get('window');
const PIN_STORAGE_KEY = 'user_pin_code';
const PIN_MAX_LENGTH = 6;
const RETRY_ATTEMPTS_KEY = 'pin_retry_attempts';
const LOCKOUT_TIMESTAMP_KEY = 'pin_lockout_timestamp';

type PinMode = 'create' | 'login' | 'reset';

interface PinAuthProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const PinAuthScreen: React.FC<PinAuthProps> = ({ onSuccess, onCancel }) => {
  const [pin, setPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [oldPin, setOldPin] = useState<string>('');
  const [mode, setMode] = useState<PinMode>('login');
  const [isPinSet, setIsPinSet] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [resetModalVisible, setResetModalVisible] = useState<boolean>(false);
  const [animationValue] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(1));
  
  // Retry and lockout state
  const [retryAttempts, setRetryAttempts] = useState<number>(0);
  const [lockedUntil, setLockedUntil] = useState<number | any>(null);
  const [lockoutTimeRemaining, setLockoutTimeRemaining] = useState<number>(0);
  const [isBiometricsAvailable, setIsBiometricsAvailable] = useState<boolean>(false);
  
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const dotScale = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Check if PIN exists and biometrics availability on component mount
  useEffect(() => {
    checkExistingPin();
    checkBiometricsAvailability();
    checkLockoutStatus();
  }, []);

  // Timer for lockout countdown
  useEffect(() => {
    if (lockedUntil && lockedUntil > Date.now()) {
      const updateRemaining = () => {
        const remaining = Math.max(0, Math.ceil((lockedUntil as number - Date.now()) / 1000));
        setLockoutTimeRemaining(remaining);
        
        if (remaining <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setLockedUntil(null);
          resetRetryAttempts();
        }
      };
      
      updateRemaining();
      timerRef.current = setInterval(updateRemaining, 1000);
      
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }
  }, [lockedUntil]);

  const checkBiometricsAvailability = async () => {
    try {
      const biometricTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      setIsBiometricsAvailable(biometricTypes.length > 0);
    } catch (error) {
      console.error('Error checking biometrics:', error);
      setIsBiometricsAvailable(false);
    }
  };
  
  const checkLockoutStatus = async () => {
    try {
      const storedAttempts = await SecureStore.getItemAsync(RETRY_ATTEMPTS_KEY);
      const storedLockout = await SecureStore.getItemAsync(LOCKOUT_TIMESTAMP_KEY);
      
      if (storedAttempts) {
        setRetryAttempts(parseInt(storedAttempts, 10));
      }
      
      if (storedLockout) {
        const lockoutTimestamp = parseInt(storedLockout, 10);
        if (lockoutTimestamp > Date.now()) {
          setLockedUntil(lockoutTimestamp);
        } else {
          // Lockout expired
          await resetRetryAttempts();
        }
      }
    } catch (error) {
      console.error('Error checking lockout status:', error);
    }
  };

  const checkExistingPin = async () => {
    try {
      const storedPin = await SecureStore.getItemAsync(PIN_STORAGE_KEY);
      const hasPin = !!storedPin;
      setIsPinSet(hasPin);
      setMode(hasPin ? 'login' : 'create');
    } catch (error) {
      console.error('Error checking stored PIN:', error);
      setMode('create');
    }
  };
  
  useEffect(() => {
    // Reset state when mode changes
    setPin('');
    setConfirmPin('');
    setOldPin('');
    setErrorMessage('');
  }, [mode]);
  
  const runDotAnimation = () => {
    Animated.sequence([
      Animated.timing(dotScale, {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(dotScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleNumberPress = (num: string) => {
    if (lockedUntil && lockedUntil > Date.now()) {
      // Don't allow input during lockout
      return;
    }
    
    const currentLength = getCurrentPinLength();
    
    if (currentLength < PIN_MAX_LENGTH) {
      // Determine which pin state to update
      if (mode === 'reset' && oldPin.length < PIN_MAX_LENGTH && pin.length === 0) {
        setOldPin(prev => prev + num);
      } else if (mode === 'reset' && oldPin.length === PIN_MAX_LENGTH && pin.length < PIN_MAX_LENGTH && confirmPin.length === 0) {
        setPin(prev => prev + num);
      } else if ((mode === 'create' || mode === 'reset') && pin.length === PIN_MAX_LENGTH && confirmPin.length < PIN_MAX_LENGTH) {
        setConfirmPin(prev => prev + num);
      } else {
        setPin(prev => prev + num);
      }
      
      Vibration.vibrate(20);
      runDotAnimation();
    }
  };
  
  const getCurrentPinLength = (): number => {
    if (mode === 'reset') {
      if (oldPin.length < PIN_MAX_LENGTH) return oldPin.length;
      if (pin.length < PIN_MAX_LENGTH) return pin.length;
      return confirmPin.length;
    } else if (mode === 'create') {
      if (pin.length < PIN_MAX_LENGTH) return pin.length;
      return confirmPin.length;
    }
    return pin.length;
  };
  
  const getCurrentPinValue = (): string => {
    if (mode === 'reset') {
      if (oldPin.length < PIN_MAX_LENGTH) return oldPin;
      if (pin.length < PIN_MAX_LENGTH) return pin;
      return confirmPin;
    } else if (mode === 'create') {
      if (pin.length < PIN_MAX_LENGTH) return pin;
      return confirmPin;
    }
    return pin;
  };
  
  const handleDelete = () => {
    if (lockedUntil && lockedUntil > Date.now()) {
      // Don't allow input during lockout
      return;
    }
    
    if (mode === 'reset') {
      if (confirmPin.length > 0) {
        setConfirmPin(prev => prev.slice(0, -1));
      } else if (pin.length > 0) {
        setPin(prev => prev.slice(0, -1));
      } else if (oldPin.length > 0) {
        setOldPin(prev => prev.slice(0, -1));
      }
    } else if (mode === 'create') {
      if (confirmPin.length > 0) {
        setConfirmPin(prev => prev.slice(0, -1));
      } else if (pin.length > 0) {
        setPin(prev => prev.slice(0, -1));
      }
    } else if (pin.length > 0) {
      setPin(prev => prev.slice(0, -1));
    }
    
    Vibration.vibrate(30);
  };
  
  const handleDeleteLongPress = () => {
    if (lockedUntil && lockedUntil > Date.now()) {
      // Don't allow input during lockout
      return;
    }
    
    if (mode === 'reset') {
      if (confirmPin.length > 0) {
        setConfirmPin('');
      } else if (pin.length > 0) {
        setPin('');
      } else {
        setOldPin('');
      }
    } else if (mode === 'create') {
      if (confirmPin.length > 0) {
        setConfirmPin('');
      } else {
        setPin('');
      }
    } else {
      setPin('');
    }
    
    Vibration.vibrate(50);
  };

  const incrementRetryAttempts = async () => {
    try {
      const newAttempts = retryAttempts + 1;
      setRetryAttempts(newAttempts);
      await SecureStore.setItemAsync(RETRY_ATTEMPTS_KEY, newAttempts.toString());
      
      // Apply lockout if needed
      if (newAttempts >= 3) {
        const lockoutTime = calculateLockoutTime(newAttempts);
        const lockoutUntil = Date.now() + lockoutTime;
        setLockedUntil(lockoutUntil);
        await SecureStore.setItemAsync(LOCKOUT_TIMESTAMP_KEY, lockoutUntil.toString());
      }
    } catch (error) {
      console.error('Error updating retry attempts:', error);
    }
  };
  
  const resetRetryAttempts = async () => {
    try {
      setRetryAttempts(0);
      setLockedUntil(null);
      setLockoutTimeRemaining(0);
      await SecureStore.deleteItemAsync(RETRY_ATTEMPTS_KEY);
      await SecureStore.deleteItemAsync(LOCKOUT_TIMESTAMP_KEY);
    } catch (error) {
      console.error('Error resetting retry attempts:', error);
    }
  };
  
  const calculateLockoutTime = (attempts: number): number => {
    // Progressive lockout durations
    if (attempts === 3) return 30 * 1000; // 30 seconds
    if (attempts === 4) return 60 * 1000; // 1 minute
    if (attempts === 5) return 5 * 60 * 1000; // 5 minutes
    if (attempts >= 6) return 15 * 60 * 1000; // 15 minutes
    return 0;
  };

  const savePin = async (pinToSave: string) => {
    try {
      await SecureStore.setItemAsync(PIN_STORAGE_KEY, pinToSave);
      setIsPinSet(true);
      setPin('');
      setConfirmPin('');
      setErrorMessage('');
      
      // Success animation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        if (onSuccess) onSuccess();
        // Reset the animation
        fadeAnim.setValue(1);
      });
      
      // Reset retry attempts on successful PIN save
      await resetRetryAttempts();
      
      return true;
    } catch (error) {
      console.error('Error saving PIN:', error);
      setErrorMessage('Failed to save PIN. Please try again.');
      runShakeAnimation();
      return false;
    }
  };

  const verifyPin = async (enteredPin: string) => {
    if (lockedUntil && lockedUntil > Date.now()) {
      const remainingTime = Math.ceil((lockedUntil - Date.now()) / 1000);
      setErrorMessage(`Too many attempts. Try again in ${remainingTime}s.`);
      return false;
    }
    
    try {
      const storedPin = await SecureStore.getItemAsync(PIN_STORAGE_KEY);
      if (enteredPin === storedPin) {
        // PIN is correct, proceed with app access
        setPin('');
        setErrorMessage('');
        
        // Success animation
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          if (onSuccess) onSuccess();
          // Reset the animation
          fadeAnim.setValue(1);
        });
        
        // Reset retry attempts on successful verification
        await resetRetryAttempts();
        
        return true;
      } else {
        await incrementRetryAttempts();
        
        if (retryAttempts + 1 >= 3) {
          const lockoutTime = calculateLockoutTime(retryAttempts + 1);
          const remainingSecs = Math.ceil(lockoutTime / 1000);
          setErrorMessage(`Too many attempts. Try again in ${remainingSecs}s.`);
        } else {
          const remainingAttempts = 3 - (retryAttempts + 1);
          setErrorMessage(`Incorrect PIN. ${remainingAttempts} attempts remaining.`);
        }
        
        runShakeAnimation();
        setTimeout(() => setPin(''), 500);
        return false;
      }
    } catch (error) {
      console.error('Error verifying PIN:', error);
      setErrorMessage('Error verifying PIN. Please try again.');
      runShakeAnimation();
      return false;
    }
  };

  const runShakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
    
    Vibration.vibrate([0, 50, 100, 50]);
  };

  const authenticateWithBiometrics = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to reset your PIN',
        fallbackLabel: 'Use PIN',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      
      if (result.success) {
        setMode('reset');
        setResetModalVisible(false);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      Alert.alert(
        'Authentication Failed',
        'Please try again or use your current PIN to reset.'
      );
      return false;
    }
  };

  const handleSubmit = async () => {
    if (lockedUntil && lockedUntil > Date.now()) {
      return;
    }
    
    if (mode === 'create') {
      if (pin.length === PIN_MAX_LENGTH && confirmPin.length === 0) {
        // Move to confirmation step
        Animated.timing(animationValue, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
        return;
      }
      
      if (pin.length === PIN_MAX_LENGTH && confirmPin.length === PIN_MAX_LENGTH) {
        if (pin === confirmPin) {
          await savePin(pin);
          setMode('login');
        } else {
          setErrorMessage('PINs do not match. Please try again.');
          setPin('');
          setConfirmPin('');
          runShakeAnimation();
        }
      } else {
        setErrorMessage('Please enter all 6 digits.');
        runShakeAnimation();
      }
    } else if (mode === 'login') {
      if (pin.length === PIN_MAX_LENGTH) {
        await verifyPin(pin);
      } else {
        setErrorMessage('Please enter all 6 digits.');
        runShakeAnimation();
      }
    } else if (mode === 'reset') {
      if (oldPin.length === PIN_MAX_LENGTH && pin.length === 0) {
        // Verify old PIN before allowing reset
        const verified = await verifyPin(oldPin);
        if (verified) {
          setErrorMessage('');
          // Proceed to new PIN entry
          return;
        }
        
        setOldPin('');
        return;
      }
      
      if (oldPin.length === PIN_MAX_LENGTH && pin.length === PIN_MAX_LENGTH && confirmPin.length === 0) {
        // Move to confirmation step
        return;
      }
      
      if (oldPin.length === PIN_MAX_LENGTH && pin.length === PIN_MAX_LENGTH && confirmPin.length === PIN_MAX_LENGTH) {
        if (pin === confirmPin) {
          await savePin(pin);
          setMode('login');
          setResetModalVisible(false);
        } else {
          setErrorMessage('New PINs do not match. Please try again.');
          setPin('');
          setConfirmPin('');
          runShakeAnimation();
        }
      } else {
        setErrorMessage('Please enter all 6 digits.');
        runShakeAnimation();
      }
    }
  };
  
  const renderPinDots = () => {
    const currentValue = getCurrentPinValue();
    let dots = [];
    
    for (let i = 0; i < PIN_MAX_LENGTH; i++) {
      const isActive: any = currentValue.length > i;
      const dotScale: any = isActive && i === currentValue.length - 1 ? 2 : 1;
      
      dots.push(
        <Animated.View 
          key={i} 
          style={[
            styles.pinDot, 
            isActive ? styles.pinDotFilled : {},
            isActive && i === currentValue.length - 1 ? {
              transform: [{ scale: dotScale }]
            } : {}
          ]}
        />
      );
    }
    
    return dots;
  };

  const renderNumberButtons = () => {
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const isDisabled = !!(lockedUntil && lockedUntil > Date.now());
    
    return (
      <ThemedView style={styles.numberPad}>
        {numbers.map(num => (
          <TouchableOpacity
            key={num}
            style={[
              styles.numberButton,
              isDisabled ? styles.disabledButton : {}
            ]}
            onPress={() => handleNumberPress(num.toString())}
            activeOpacity={isDisabled ? 1 : 0.7}
            disabled={isDisabled}
          >
            <ThemedText style={[
              styles.numberButtonText,
              isDisabled ? styles.disabledButtonText : {}
            ]}>
              {num}
            </ThemedText>
          </TouchableOpacity>
        ))}
        
        {isPinSet && mode === 'login' ? (
          <TouchableOpacity 
            style={[
              styles.numberButton,
              isDisabled ? styles.disabledButton : {}
            ]} 
            onPress={() => setResetModalVisible(true)}
            activeOpacity={isDisabled ? 1 : 0.7}
            disabled={isDisabled}
          >
            <Ionicons 
              name="refresh-outline" 
              size={24} 
              color={isDisabled ? "#999" : "#333"} 
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[
              styles.numberButton,
              isDisabled ? styles.disabledButton : {}
            ]} 
            activeOpacity={isDisabled ? 1 : 0.7}
            disabled={isDisabled}
          >
            <ThemedText style={[
              styles.specialButtonIcon,
              isDisabled ? styles.disabledButtonText : {}
            ]}>
              *
            </ThemedText>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[
            styles.numberButton,
            isDisabled ? styles.disabledButton : {}
          ]}
          onPress={() => handleNumberPress('0')}
          activeOpacity={isDisabled ? 1 : 0.7}
          disabled={isDisabled}
        >
          <ThemedText style={[
            styles.numberButtonText,
            isDisabled ? styles.disabledButtonText : {}
          ]}>
            0
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.numberButton,
            isDisabled ? styles.disabledButton : {}
          ]}
          onPress={handleDelete}
          onLongPress={handleDeleteLongPress}
          delayLongPress={300}
          activeOpacity={isDisabled ? 1 : 0.7}
          disabled={isDisabled}
        >
          <Ionicons 
            name="backspace-outline" 
            size={24} 
            color={isDisabled ? "#999" : "#333"} 
          />
        </TouchableOpacity>
      </ThemedView>
    );
  };

  const getScreenTitle = () => {
    if (lockedUntil && lockedUntil > Date.now()) {
      return "Account Locked";
    }
    
    if (mode === 'create') {
      return confirmPin.length > 0 ? "Confirm PIN" : "Create PIN";
    } else if (mode === 'reset') {
      if (oldPin.length < PIN_MAX_LENGTH) return "Enter Current PIN";
      if (pin.length < PIN_MAX_LENGTH) return "Create New PIN";
      return "Confirm New PIN";
    } else {
      return "Enter PIN";
    }
  };

  const getScreenSubtitle = () => {
    if (lockedUntil && lockedUntil > Date.now()) {
      return `Too many incorrect attempts. Try again in ${lockoutTimeRemaining}s.`;
    }
    
    if (mode === 'create') {
      return confirmPin.length > 0 
        ? "Please re-enter your 6-digit PIN to confirm" 
        : "Please create a 6-digit PIN code";
    } else if (mode === 'reset') {
      if (oldPin.length < PIN_MAX_LENGTH) return "Enter your current PIN code";
      if (pin.length < PIN_MAX_LENGTH) return "Create a new 6-digit PIN code";
      return "Please re-enter your new PIN to confirm";
    } else {
      return "Please enter your 6-digit PIN code";
    }
  };

  const renderResetModal = () => {
    return (
      <Modal
        visible={resetModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setResetModalVisible(false)}
      >
        <ThemedView style={[styles.modalOverlay]}>
          <ThemedView style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Reset PIN</ThemedText>
            <ThemedText style={styles.modalText}>
              {isBiometricsAvailable 
                ? "How would you like to authenticate to reset your PIN?" 
                : "Do you want to reset your PIN?"}
            </ThemedText>
            
            <ThemedView style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setResetModalVisible(false)}
              >
                <ThemedText style={styles.modalButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              
              {isBiometricsAvailable && (
                <TouchableOpacity 
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                  onPress={authenticateWithBiometrics}
                >
                  <ThemedText style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>
                    {Platform.OS === 'ios' ? 'Use Face ID/Touch ID' : 'Use Biometrics'}
                  </ThemedText>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={() => {
                  setResetModalVisible(false);
                  setMode('reset');
                }}
              >
                <ThemedText style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>
                  {isBiometricsAvailable ? 'Use PIN' : 'Reset'}
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </Modal>
    );
  };

  return (
    <ThemedView style={{flex: 1}}>
       <ScrollView style={{flex: 1, 
        
       }}>
        <SafeAreaView style={{flex: 1}}>
            <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
              <StatusBar barStyle={Platform.OS === 'ios' ? "dark-content" : "light-content"} />
              
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidView}
              >
                <ThemedView style={styles.header}>
                  <ThemedText style={styles.title}>{getScreenTitle()}</ThemedText>
                  <ThemedText style={styles.subtitle}>{getScreenSubtitle()}</ThemedText>
                  
                  {errorMessage && !lockedUntil ? (
                    <Animated.View style={{ transform: [{ translateX: shakeAnimation }] }}>
                      <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
                    </Animated.View>
                  ) : null}
                </ThemedView>
                
                <Animated.View
                  style={[
                    styles.pinContainer,
                    { transform: [{ translateX: shakeAnimation }] }
                  ]}
                >
                  {renderPinDots()}
                </Animated.View>
                
                <ThemedView style={styles.buttonContainer}>
                  {renderNumberButtons()}
                  
                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      getCurrentPinLength() === PIN_MAX_LENGTH && (!lockedUntil || lockedUntil <= Date.now()) 
                        ? styles.submitButtonActive 
                        : {},
                      lockedUntil && lockedUntil > Date.now() ? styles.disabledButton : {}
                    ]}
                    onPress={handleSubmit}
                    activeOpacity={0.8}
                    disabled={lockedUntil && lockedUntil > Date.now()}
                  >
                    <ThemedText style={[
                      styles.submitButtonText,
                      getCurrentPinLength() === PIN_MAX_LENGTH && (!lockedUntil || lockedUntil <= Date.now()) 
                        ? styles.submitButtonTextActive 
                        : {},
                      lockedUntil && lockedUntil > Date.now() ? styles.disabledButtonText : {}
                    ]}>
                      {mode === 'create' && pin.length === PIN_MAX_LENGTH && confirmPin.length === 0 
                        ? "Next" 
                        : "Confirm"}
                    </ThemedText>
                  </TouchableOpacity>
                  
                  {mode !== 'login' && (
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        if (isPinSet) {
                          setMode('login');
                        } else if (onCancel) {
                          onCancel();
                        }
                      }}
                      disabled={lockedUntil && lockedUntil > Date.now()}
                    >
                      <ThemedText style={[
                        styles.cancelButtonText,
                        lockedUntil && lockedUntil > Date.now() ? styles.disabledButtonText : {}
                      ]}>
                        Cancel
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                </ThemedView>
              </KeyboardAvoidingView>
              
              {renderResetModal()}
            </Animated.View>
          </SafeAreaView>
       </ScrollView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 20,
    paddingVertical: 5
  },
  title: {
    fontSize: 28,
    fontWeight: Platform.OS === 'ios' ? '700' : 'bold',
    marginBottom: 12,
    padding: 5
  },
  subtitle: {
    fontSize: 16,
    color: Platform.OS === 'ios' ? '#8A8A8E' : '#757575',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: Platform.OS === 'ios' ? '#FF3B30' : '#F44336',
    marginTop: 12,
    textAlign: 'center',
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 50,
  },
  pinDot: {
    width: Platform.OS === 'ios' ? 16 : 18,
    height: Platform.OS === 'ios' ? 16 : 18,
    borderRadius: Platform.OS === 'ios' ? 8 : 9,
    borderWidth: Platform.OS === 'ios' ? 1 : 1.5,
    borderColor: Platform.OS === 'ios' ? '#C7C7CC' : '#BDBDBD',
    marginHorizontal: 12,
  },
  pinDotFilled: {
    backgroundColor: Platform.OS === 'ios' ? '#007AFF' : '#2196F3',
    borderColor: Platform.OS === 'ios' ? '#007AFF' : '#2196F3',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  numberPad: {
    width: width > 400 ? '80%' : '90%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  numberButton: {
    width: width > 400 ? 75 : width / 5,
    height: width > 400 ? 75 : width / 5,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 8,
    borderRadius: Platform.OS === 'ios' ? 38 : 40,
    backgroundColor: Platform.OS === 'ios' ? '#F2F2F7' : '#F5F5F5',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  numberButtonText: {
    fontSize: 28,
    fontWeight: '500',
    color: Platform.OS === 'ios' ? '#000000' : '#212121',
    paddingVertical: 5,
  },
  specialButtonIcon: {
    fontSize: 28,
    fontWeight: '500',
    color: Platform.OS === 'ios' ? '#8A8A8E' : '#757575',
  },
  submitButton: {
    width: '80%',
    height: 56,
    borderRadius: 28,
    backgroundColor: Platform.OS === 'ios' ? '#F2F2F7' : '#EEEEEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  submitButtonActive: {
    backgroundColor: Platform.OS === 'ios' ? '#007AFF' : '#2196F3',
    ...Platform.select({
      ios: {
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: Platform.OS === 'ios' ? '#8A8A8E' : '#9E9E9E',
  },
  submitButtonTextActive: {
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingVertical: 15,
    marginTop: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    color: Platform.OS === 'ios' ? '#007AFF' : '#2196F3',
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: width * 0.8,
    backgroundColor: Platform.OS === 'ios' ? '#FFFFFF' : '#FAFAFA',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: Platform.OS === 'ios' ? '#000000' : '#212121',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    color: Platform.OS === 'ios' ? '#8A8A8E' : '#757575',
  },
  modalButtons: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    flexWrap: 'wrap',
    gap: 2
  },
  modalButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  modalButtonCancel: {
    backgroundColor: Platform.OS === 'ios' ? '#F2F2F7' : '#EEEEEE',
  },
  modalButtonConfirm: {
    backgroundColor: Platform.OS === 'ios' ? '#007AFF' : '#2196F3',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Platform.OS === 'ios' ? '#8A8A8E' : '#757575',
  },
  modalButtonTextConfirm: {
    color: '#FFFFFF',
  },
  disabledButtonText: {
    color: '#999',
    pointerEvents: 'none'
  },
  disabledButton: {
    backgroundColor: '#F2F2F7',
    color: '#999',
    pointerEvents: 'none'
  }
});

export default PinAuthScreen;