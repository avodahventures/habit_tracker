import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface NotificationBannerProps {
  title: string;
  body: string;
  visible: boolean;
  onDismiss: () => void;
  isCelebration?: boolean;
  isMini?: boolean;
}

export function NotificationBanner({
  title,
  body,
  visible,
  onDismiss,
  isCelebration = false,
  isMini = false,
}: NotificationBannerProps) {
  const { currentTheme } = useTheme();
  const translateY = useRef(new Animated.Value(-300)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
      ]).start();

      // Mini banner auto-dismisses faster (3 seconds)
      // Regular banner dismisses after 6 seconds
      const duration = isMini ? 3000 : 6000;
      const timer = setTimeout(() => {
        dismissBanner();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const dismissBanner = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -300,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.8,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible) {
    return null;
  }

  // Mini celebration - small banner at top, no overlay
  if (isMini) {
    return (
      <Animated.View
        style={[
          styles.miniBannerContainer,
          {
            borderLeftColor: '#22C55E',
            transform: [{ translateY }],
            opacity,
          },
        ]}
      >
        <View style={styles.miniBannerContent}>
          <View style={styles.miniEmojiRow}>
            {['⭐', '✨', '🙏'].map((emoji, index) => (
              <MiniConfettiEmoji key={index} emoji={emoji} index={index} />
            ))}
          </View>
          <View style={styles.miniBannerTextContainer}>
            <Text style={styles.miniBannerTitle}>{title}</Text>
            <Text style={styles.miniBannerBody}>{body}</Text>
          </View>
          <TouchableOpacity onPress={dismissBanner} style={styles.dismissButton}>
            <Text style={styles.dismissText}>✕</Text>
          </TouchableOpacity>
        </View>
        <AutoDismissBar color='#22C55E' duration={3000} />
      </Animated.View>
    );
  }

  // Full celebration modal
  if (isCelebration) {
    return (
      <>
        {/* Full screen dark overlay */}
        <Animated.View
          style={[styles.fullOverlay, { opacity: overlayOpacity }]}
        >
          <TouchableOpacity
            style={styles.overlayTouchable}
            onPress={dismissBanner}
            activeOpacity={1}
          />
        </Animated.View>

        {/* Celebration card */}
        <Animated.View
          style={[
            styles.celebrationWrapper,
            {
              opacity,
              transform: [{ scale }, { translateY }],
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.confettiRow}>
            {['🎉', '✨', '🙏', '⭐', '🎊', '💫', '🌟', '🎈'].map((emoji, index) => (
              <ConfettiEmoji key={index} emoji={emoji} index={index} />
            ))}
          </View>

          <View style={styles.celebrationCard}>
            <Text style={styles.celebrationEmoji}>🎉</Text>
            <Text style={styles.celebrationTitle}>{title}</Text>
            <Text style={styles.celebrationBody}>{body}</Text>

            <View style={styles.dotsRow}>
              {['🙏', '📖', '✨', '💙', '⭐'].map((emoji, index) => (
                <Text key={index} style={styles.dotEmoji}>{emoji}</Text>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.celebrationButton, { backgroundColor: currentTheme.accent }]}
              onPress={dismissBanner}
            >
              <Text style={styles.celebrationButtonText}>
                Praise God! 🙌
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </>
    );
  }

  // Regular reminder banner
  return (
    <>
      <Animated.View
        style={[styles.topOverlay, { opacity: overlayOpacity }]}
        pointerEvents="none"
      />

      <Animated.View
        style={[
          styles.bannerContainer,
          {
            borderLeftColor: currentTheme.accent,
            transform: [{ translateY }],
            opacity,
          },
        ]}
      >
        <View style={styles.bannerContent}>
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>{title}</Text>
            <Text style={styles.bannerBody}>{body}</Text>
          </View>
          <TouchableOpacity onPress={dismissBanner} style={styles.dismissButton}>
            <Text style={styles.dismissText}>✕</Text>
          </TouchableOpacity>
        </View>
        <AutoDismissBar color={currentTheme.accent} duration={6000} />
      </Animated.View>
    </>
  );
}

// Mini star burst emoji
function MiniConfettiEmoji({ emoji, index }: { emoji: string; index: number }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = index * 80;
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 6,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.Text
      style={[
        styles.miniEmoji,
        { opacity, transform: [{ scale }] },
      ]}
    >
      {emoji}
    </Animated.Text>
  );
}

// Full confetti emoji for celebration
function ConfettiEmoji({ emoji, index }: { emoji: string; index: number }) {
  const translateY = useRef(new Animated.Value(-50)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = index * 100;
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const rotation = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-30deg', '30deg'],
  });

  return (
    <Animated.Text
      style={[
        styles.confettiEmoji,
        {
          opacity,
          transform: [{ translateY }, { rotate: rotation }],
        },
      ]}
    >
      {emoji}
    </Animated.Text>
  );
}

// Shrinking progress bar
function AutoDismissBar({ color, duration }: { color: string; duration: number }) {
  const widthAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: 0,
      duration,
      useNativeDriver: false,
    }).start();
  }, []);

  return (
    <View style={styles.progressBarContainer}>
      <Animated.View
        style={[
          styles.progressBar,
          { backgroundColor: color, flex: widthAnim },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Full screen overlay
  fullOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    zIndex: 9998,
  },
  overlayTouchable: {
    flex: 1,
  },
  // Overlay behind regular banner
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 9997,
  },
  // Regular reminder banner
  bannerContainer: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    borderRadius: 16,
    borderLeftWidth: 5,
    backgroundColor: '#1A1A2E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 9999,
    overflow: 'hidden',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  bannerTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#FFFFFF',
  },
  bannerBody: {
    fontSize: 14,
    lineHeight: 20,
    color: '#D1D5DB',
  },
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
  },
  progressBar: {
    height: 4,
  },
  // Mini celebration banner
  miniBannerContainer: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    borderRadius: 14,
    borderLeftWidth: 5,
    backgroundColor: '#14532D', // Dark green
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 9999,
    overflow: 'hidden',
  },
  miniBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  miniEmojiRow: {
    flexDirection: 'row',
    gap: 2,
  },
  miniEmoji: {
    fontSize: 18,
  },
  miniBannerTextContainer: {
    flex: 1,
  },
  miniBannerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  miniBannerBody: {
    fontSize: 13,
    color: '#86EFAC', // Light green text
    lineHeight: 18,
  },
  // Full celebration
  celebrationWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: 24,
  },
  confettiRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  confettiEmoji: {
    fontSize: 28,
  },
  celebrationCard: {
    width: '100%',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 20,
  },
  celebrationEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  celebrationTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    color: '#FFFFFF',
  },
  celebrationBody: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 24,
    color: '#D1D5DB',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  dotEmoji: {
    fontSize: 24,
  },
  celebrationButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
  },
  celebrationButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});