import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface NavButtonProps {
    onPress?: () => void;
    children?: React.ReactNode;
}

interface NavIconButtonProps {
    onPress?: () => void;
    icon: string;
    isActive?: boolean;
}

// AddButton: Single green plate that opens bottom sheet
export const AddButton: React.FC<NavButtonProps> = ({ onPress }) => {
    // Press-down animation for green button
    const greenButtonTranslateY = useRef(new Animated.Value(0)).current;

    const handlePressIn = () => {
        // Move green circle down to overlap shadow circle
        Animated.spring(greenButtonTranslateY, {
            toValue: 8, // Move down by 8px to overlap the shadow circle
            useNativeDriver: true,
            tension: 100,
            friction: 7,
        }).start();
    };

    const handlePressOut = () => {
        // Move green circle back up
        Animated.spring(greenButtonTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 7,
        }).start();
    };

    const handlePress = () => {
        // Haptic feedback when plus button is pressed
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Directly call onPress to open bottom sheet
                onPress?.();
    };


    return (
        <View style={styles.addButtonWrapper}>
            {/* Main Green Button */}
            <TouchableOpacity
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
                style={styles.buttonContainer}
            >
                <View style={styles.singleCircleContainer}>
                    {/* Green circle with plus - animated */}
                    <Animated.View
                        style={[
                            styles.circle,
                            styles.circleGreenSingle,
                            {
                                transform: [{ translateY: greenButtonTranslateY }],
                            }
                        ]}
                    >
                        <Ionicons name="add" size={28} color="#252525" />
                    </Animated.View>
                    {/* Green shadow below */}
                    <View style={[styles.circle, styles.circleGreenShadowSingle]} />
                </View>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        position: 'absolute',
        top: -Dimensions.get('window').height,
        left: -Dimensions.get('window').width,
        width: Dimensions.get('window').width * 3,
        height: Dimensions.get('window').height * 3,
        zIndex: 5, // Behind menu buttons but above content
    },
    addButtonWrapper: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    buttonContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10, // Green button should be on top
    },
    singleCircleContainer: {
        width: 60,
        height: 68, // 60px circle + 8px shadow offset (matches left buttons)
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    circlesContainer: {
        width: 60,
        height: 96, // 60px circle + 36px (28px for last shadow + 8px offset)
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    circle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: '#252525',
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
        left: 0,
    },
    // Plate 1 (top): Normal green with plus
    circleGreen: {
        backgroundColor: '#26F170', // Normal green
        top: 0,
        zIndex: 6,
    },
    // Plate 1 shadow: Darker green below
    circleGreenShadow: {
        backgroundColor: '#19C456', // Darker green shadow
        top: 8, // Offset below the normal circle
        zIndex: 5,
    },
    // Plate 2: Normal blue
    circleBlue: {
        backgroundColor: '#4463F7', // Normal blue
        top: 10, // 10px offset from previous plate
        zIndex: 4,
    },
    // Plate 2 shadow: Darker blue below
    circleBlueShadow: {
        backgroundColor: '#3850CE', // Darker blue shadow
        top: 18, // Offset below the normal circle (10 + 8)
        zIndex: 3,
    },
    // Plate 3: Normal red
    circleRed: {
        backgroundColor: '#FF4444', // Normal red
        top: 20, // 20px offset from previous plate
        zIndex: 2,
    },
    // Plate 3 shadow: Darker red below
    circleRedShadow: {
        backgroundColor: '#CA2E2E', // Darker red shadow
        top: 28, // Offset below the normal circle (20 + 8)
        zIndex: 1,
    },
    // Single green button (aligned with left buttons)
    circleGreenSingle: {
        backgroundColor: '#26F170', // Normal green
        top: 0,
        zIndex: 2,
    },
    circleGreenShadowSingle: {
        backgroundColor: '#19C456', // Darker green shadow
        top: 8, // Offset below the normal circle
        zIndex: 1,
    },
});

// Navigation icon buttons (Home, Food, Fitness) - 2 stacked circles
export const NavIconButton: React.FC<NavIconButtonProps> = ({ onPress, icon, isActive = false }) => {
    const topCircleTranslateY = useRef(new Animated.Value(0)).current;

    const handlePressIn = () => {
        // Move top circle down to overlap bottom circle
        Animated.spring(topCircleTranslateY, {
            toValue: 8, // Move down by 8px to overlap the bottom circle
            useNativeDriver: true,
            tension: 100,
            friction: 7,
        }).start();
    };

    const handlePressOut = () => {
        // Move top circle back up
        Animated.spring(topCircleTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 7,
        }).start();
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
            style={iconButtonStyles.buttonContainer}
        >
            <View style={iconButtonStyles.circlesContainer}>
                {/* Bottom circle */}
                <View style={[
                    iconButtonStyles.circle,
                    iconButtonStyles.circleBottom,
                    isActive && iconButtonStyles.circleBottomActive
                ]} />

                {/* Top circle with icon - animated */}
                <Animated.View style={[
                    iconButtonStyles.circle,
                    iconButtonStyles.circleTop,
                    isActive && iconButtonStyles.circleTopActive,
                    {
                        transform: [{ translateY: topCircleTranslateY }],
                    }
                ]}>
                    <Ionicons
                        name={icon as any}
                        size={24}
                        color={isActive ? '#fff' : '#252525'}
                    />
                </Animated.View>
            </View>
        </TouchableOpacity>
    );
};

// Container for the three nav buttons
export const NavButtons: React.FC<{ 
    onHomePress?: () => void; 
    onFoodPress?: () => void; 
    onFitnessPress?: () => void;
    activeScreen?: 'home' | 'food' | 'fitness';
}> = ({
    onHomePress,
    onFoodPress,
    onFitnessPress,
    activeScreen = 'home',
}) => {
    return (
        <View style={navButtonStyles.container}>
            <NavIconButton
                icon="home-outline"
                isActive={activeScreen === 'home'}
                onPress={onHomePress}
            />
            <View style={navButtonStyles.spacer} />
            <NavIconButton
                icon="restaurant-outline"
                isActive={activeScreen === 'food'}
                onPress={onFoodPress}
            />
            <View style={navButtonStyles.spacer} />
            <NavIconButton
                icon="fitness-outline"
                isActive={activeScreen === 'fitness'}
                onPress={onFitnessPress}
            />
        </View>
    );
};

const navButtonStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    spacer: {
        width: 12, // Spacing between buttons
    },
});

const iconButtonStyles = StyleSheet.create({
    buttonContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    circlesContainer: {
        width: 60,
        height: 68, // 60px circle + 8px vertical offset
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    circle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: '#252525',
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
        left: 0,
    },
    circleTop: {
        backgroundColor: '#fff',
        top: 0,
        zIndex: 2,
    },
    circleTopActive: {
        backgroundColor: '#526EFF',
    },
    circleBottom: {
        backgroundColor: '#C4C4C4',
        top: 8, // 8px offset
        zIndex: 1,
    },
    circleBottomActive: {
        backgroundColor: '#374DC2', // Darker blue for bottom circle
    },
});

