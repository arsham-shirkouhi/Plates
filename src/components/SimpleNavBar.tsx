import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Animated, Easing } from 'react-native';
import { LayoutDashboard, Apple, Dumbbell } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAddFood } from '../context/AddFoodContext';
import * as Haptics from 'expo-haptics';
import { fonts } from '../constants/fonts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface AnimatedNavItemProps {
    IconComponent: React.ComponentType<{ size?: number; color?: string; fill?: string; strokeWidth?: number }>;
    isActive: boolean;
    onPress: () => void;
}

const AnimatedNavItem: React.FC<AnimatedNavItemProps> = ({ IconComponent, isActive, onPress }) => {
    const scale = useRef(new Animated.Value(1)).current;
    const previousActive = useRef(isActive);

    useEffect(() => {
        if (isActive && !previousActive.current) {
            // Quick bounce animation when becoming active, then settle at slightly larger size
            Animated.sequence([
                Animated.spring(scale, {
                    toValue: 1.4,
                    tension: 400,
                    friction: 8,
                    useNativeDriver: true,
                }),
                Animated.spring(scale, {
                    toValue: 1.15,
                    tension: 400,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start();
        } else if (!isActive && previousActive.current) {
            // Animate back to normal size when becoming inactive
            Animated.spring(scale, {
                toValue: 1,
                tension: 400,
                friction: 8,
                useNativeDriver: true,
            }).start();
        }
        previousActive.current = isActive;
    }, [isActive, scale]);

    return (
        <TouchableOpacity
            style={styles.navItem}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Animated.View style={{ transform: [{ scale }] }}>
                <IconComponent
                    size={24}
                    color={isActive ? "#526EFF" : "#252525"}
                    fill={isActive ? "#526EFF" : "#252525"}
                    strokeWidth={isActive ? 2.5 : 2}
                />
            </Animated.View>
        </TouchableOpacity>
    );
};

export const SimpleNavBar: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const { showAddFoodSheet } = useAddFood();
    const insets = useSafeAreaInsets();

    // Get current route name from navigation state
    const routeName = useNavigationState(state => {
        if (!state) return null;
        const route = state.routes[state.index];
        return route?.name;
    });

    // Only show navbar on main app screens
    const showNavBar = routeName && ['Home', 'FoodLog', 'Workout'].includes(routeName);

    if (!showNavBar) {
        return null;
    }

    const isHome = routeName === 'Home';
    const isFood = routeName === 'FoodLog';
    const isFitness = routeName === 'Workout';

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
            <View style={styles.contentContainer}>
                <View style={styles.pillContainer}>
                    <AnimatedNavItem
                        IconComponent={LayoutDashboard}
                        isActive={isHome}
                        onPress={() => {
                            if (!isHome) {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                navigation.navigate('Home');
                            }
                        }}
                    />

                    <AnimatedNavItem
                        IconComponent={Apple}
                        isActive={isFood}
                        onPress={() => {
                            if (!isFood) {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                navigation.navigate('FoodLog');
                            }
                        }}
                    />

                    <AnimatedNavItem
                        IconComponent={Dumbbell}
                        isActive={isFitness}
                        onPress={() => {
                            if (!isFitness) {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                navigation.navigate('Workout');
                            }
                        }}
                    />
                </View>

                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        showAddFoodSheet();
                    }}
                    activeOpacity={0.7}
                >
                    <Ionicons name="add" size={32} color="#252525" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'transparent',
        paddingTop: 8,
        paddingBottom: 8,
        paddingHorizontal: 20,
        zIndex: 50,
        minHeight: 60,
    },
    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    pillContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 32,
        borderWidth: 2.5,
        borderColor: '#252525',
        height: 64,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
    },
    navItem: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
        paddingHorizontal: 4,
    },
    addButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 2.5,
        borderColor: '#252525',
        backgroundColor: '#26F170',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

