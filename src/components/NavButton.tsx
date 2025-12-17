import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Animated, Alert, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NavButtonProps {
    onPress?: () => void;
    children?: React.ReactNode;
    onMenuStateChange?: (isOpen: boolean) => void;
    onCloseMenu?: React.MutableRefObject<(() => void) | null>;
}

interface NavIconButtonProps {
    onPress?: () => void;
    icon: string;
    isActive?: boolean;
}

// AddButton: Single green plate that expands to show menu
export const AddButton: React.FC<NavButtonProps> = ({ onPress, onMenuStateChange, onCloseMenu }) => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    
    // Animation values for menu buttons - starting from green button position (0, 0)
    const menuButton1TranslateX = useRef(new Animated.Value(0)).current;
    const menuButton1TranslateY = useRef(new Animated.Value(0)).current;
    
    const menuButton2TranslateX = useRef(new Animated.Value(0)).current;
    const menuButton2TranslateY = useRef(new Animated.Value(0)).current;
    
    const menuButton3TranslateX = useRef(new Animated.Value(0)).current;
    const menuButton3TranslateY = useRef(new Animated.Value(0)).current;
    
    // Rotation animation for plus icon (starts at 0deg, rotates to 135deg when opened)
    const plusIconRotation = useRef(new Animated.Value(0)).current;

    const handlePress = () => {
        if (isMenuOpen) {
            // Close menu - slide back to green button position (reverse order: 3, 2, 1)
            Animated.parallel([
                Animated.timing(plusIconRotation, { toValue: 0, duration: 200, useNativeDriver: true }), // Rotate back to 0
                Animated.stagger(50, [
                    Animated.parallel([
                        Animated.timing(menuButton3TranslateX, { toValue: 0, duration: 200, useNativeDriver: true }),
                        Animated.timing(menuButton3TranslateY, { toValue: 0, duration: 200, useNativeDriver: true }),
                    ]),
                    Animated.parallel([
                        Animated.timing(menuButton2TranslateX, { toValue: 0, duration: 200, useNativeDriver: true }),
                        Animated.timing(menuButton2TranslateY, { toValue: 0, duration: 200, useNativeDriver: true }),
                    ]),
                    Animated.parallel([
                        Animated.timing(menuButton1TranslateX, { toValue: 0, duration: 200, useNativeDriver: true }),
                        Animated.timing(menuButton1TranslateY, { toValue: 0, duration: 200, useNativeDriver: true }),
                    ]),
                ]),
            ]).start(() => {
                setIsMenuOpen(false);
                onMenuStateChange?.(false);
                onPress?.();
            });
        } else {
            // Open menu - slide out from green button position
            setIsMenuOpen(true);
            onMenuStateChange?.(true);
            Animated.parallel([
                Animated.timing(plusIconRotation, { toValue: 135, duration: 200, useNativeDriver: true }), // Rotate to 135 degrees (90+45)
                Animated.stagger(50, [
                    Animated.parallel([
                        Animated.spring(menuButton1TranslateX, { toValue: -80, useNativeDriver: true, tension: 50, friction: 7 }),
                        Animated.spring(menuButton1TranslateY, { toValue: -80, useNativeDriver: true, tension: 50, friction: 7 }),
                    ]),
                    Animated.parallel([
                        Animated.spring(menuButton2TranslateX, { toValue: 0, useNativeDriver: true, tension: 50, friction: 7 }),
                        Animated.spring(menuButton2TranslateY, { toValue: -80, useNativeDriver: true, tension: 50, friction: 7 }),
                    ]),
                    Animated.parallel([
                        Animated.spring(menuButton3TranslateX, { toValue: -80, useNativeDriver: true, tension: 50, friction: 7 }),
                        Animated.spring(menuButton3TranslateY, { toValue: 0, useNativeDriver: true, tension: 50, friction: 7 }),
                    ]),
                ]),
            ]).start();
        }
    };

    // Expose close function to parent
    React.useEffect(() => {
        if (onCloseMenu) {
            onCloseMenu.current = handlePress;
        }
    }, [isMenuOpen, onCloseMenu]);

    const screenDimensions = Dimensions.get('window');

    return (
        <View style={styles.addButtonWrapper}>
            {/* Menu Button 1: Top Left */}
            <Animated.View
                style={[
                    styles.menuButton,
                    {
                        transform: [
                            { translateX: menuButton1TranslateX },
                            { translateY: menuButton1TranslateY },
                        ],
                    },
                ]}
                pointerEvents={isMenuOpen ? 'auto' : 'none'}
            >
                <TouchableOpacity
                    onPress={() => {
                        handlePress();
                        Alert.alert('Menu 1', 'Menu option 1');
                    }}
                    style={styles.menuButtonTouchable}
                >
                    <View style={styles.singleCircleContainer}>
                        <View style={[styles.circle, styles.menuCircle1]}>
                            <Ionicons name="add" size={24} color="#252525" />
                        </View>
                        <View style={[styles.circle, styles.menuCircle1Shadow]} />
                    </View>
                </TouchableOpacity>
            </Animated.View>

            {/* Menu Button 2: Above Green */}
            <Animated.View
                style={[
                    styles.menuButton,
                    {
                        transform: [
                            { translateX: menuButton2TranslateX },
                            { translateY: menuButton2TranslateY },
                        ],
                    },
                ]}
                pointerEvents={isMenuOpen ? 'auto' : 'none'}
            >
                <TouchableOpacity
                    onPress={() => {
                        handlePress();
                        Alert.alert('Menu 2', 'Menu option 2');
                    }}
                    style={styles.menuButtonTouchable}
                >
                    <View style={styles.singleCircleContainer}>
                        <View style={[styles.circle, styles.menuCircle2]}>
                            <Ionicons name="add" size={24} color="#252525" />
                        </View>
                        <View style={[styles.circle, styles.menuCircle2Shadow]} />
                    </View>
                </TouchableOpacity>
            </Animated.View>

            {/* Menu Button 3: Left of Green */}
            <Animated.View
                style={[
                    styles.menuButton,
                    {
                        transform: [
                            { translateX: menuButton3TranslateX },
                            { translateY: menuButton3TranslateY },
                        ],
                    },
                ]}
                pointerEvents={isMenuOpen ? 'auto' : 'none'}
            >
                <TouchableOpacity
                    onPress={() => {
                        handlePress();
                        Alert.alert('Menu 3', 'Menu option 3');
                    }}
                    style={styles.menuButtonTouchable}
                >
                    <View style={styles.singleCircleContainer}>
                        <View style={[styles.circle, styles.menuCircle3]}>
                            <Ionicons name="add" size={24} color="#252525" />
                        </View>
                        <View style={[styles.circle, styles.menuCircle3Shadow]} />
                    </View>
                </TouchableOpacity>
            </Animated.View>

            {/* Main Green Button - aligned with left buttons */}
            <TouchableOpacity
                onPress={handlePress}
                activeOpacity={0.8}
                style={styles.buttonContainer}
            >
                <View style={styles.singleCircleContainer}>
                    {/* Green circle with plus */}
                    <View style={[styles.circle, styles.circleGreenSingle]}>
                        <Animated.Image
                            source={require('../../assets/images/icons/plus_icon.png')}
                            style={[
                                styles.plusIcon,
                                {
                                    transform: [
                                        {
                                            rotate: plusIconRotation.interpolate({
                                                inputRange: [0, 135],
                                                outputRange: ['0deg', '135deg'],
                                            }),
                                        },
                                    ],
                                },
                            ]}
                            resizeMode="contain"
                        />
                    </View>
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
        borderWidth: 2.5,
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
    plusIcon: {
        width: 24,
        height: 24,
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
    // Menu buttons - positioned at green button location, will slide out (behind green button)
    menuButton: {
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 1,
    },
    menuButtonTouchable: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuCircle1: {
        backgroundColor: '#4463F7', // Blue
        top: 0,
        zIndex: 2,
    },
    menuCircle1Shadow: {
        backgroundColor: '#3850CE', // Darker blue shadow
        top: 8,
        zIndex: 1,
    },
    menuCircle2: {
        backgroundColor: '#FF4444', // Red
        top: 0,
        zIndex: 2,
    },
    menuCircle2Shadow: {
        backgroundColor: '#CA2E2E', // Darker red shadow
        top: 8,
        zIndex: 1,
    },
    menuCircle3: {
        backgroundColor: '#FFB800', // Yellow/Orange
        top: 0,
        zIndex: 2,
    },
    menuCircle3Shadow: {
        backgroundColor: '#E6A500', // Darker yellow shadow
        top: 8,
        zIndex: 1,
    },
});

// Navigation icon buttons (Home, Food, Fitness) - 2 stacked circles
export const NavIconButton: React.FC<NavIconButtonProps> = ({ onPress, icon, isActive = false }) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={iconButtonStyles.buttonContainer}
        >
            <View style={iconButtonStyles.circlesContainer}>
                {/* Bottom circle */}
                <View style={[
                    iconButtonStyles.circle, 
                    iconButtonStyles.circleBottom,
                    isActive && iconButtonStyles.circleBottomActive
                ]} />
                
                {/* Top circle with icon */}
                <View style={[
                    iconButtonStyles.circle, 
                    iconButtonStyles.circleTop,
                    isActive && iconButtonStyles.circleTopActive
                ]}>
                    <Ionicons 
                        name={icon as any} 
                        size={24} 
                        color={isActive ? '#fff' : '#252525'} 
                    />
                </View>
            </View>
        </TouchableOpacity>
    );
};

// Container for the three nav buttons
export const NavButtons: React.FC<{ onHomePress?: () => void; onFoodPress?: () => void; onFitnessPress?: () => void }> = ({ 
    onHomePress, 
    onFoodPress, 
    onFitnessPress 
}) => {
    return (
        <View style={navButtonStyles.container}>
            <NavIconButton 
                icon="home-outline" 
                isActive={true}
                onPress={onHomePress}
            />
            <View style={navButtonStyles.spacer} />
            <NavIconButton 
                icon="restaurant-outline" 
                onPress={onFoodPress}
            />
            <View style={navButtonStyles.spacer} />
            <NavIconButton 
                icon="fitness-outline" 
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
        borderWidth: 2.5,
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
        backgroundColor: '#F5F5F5',
        top: 8, // 8px offset
        zIndex: 1,
    },
    circleBottomActive: {
        backgroundColor: '#4463F7', // Slightly darker blue for bottom circle
    },
});

