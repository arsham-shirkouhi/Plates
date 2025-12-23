import React from 'react';
import { Alert } from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { BottomNavBar } from './BottomNavBar';
import { AddButton, NavButtons } from './NavButton';
import { useAddFood } from '../context/AddFoodContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const UniversalNavBar: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const { showAddFoodSheet } = useAddFood();
    
    // Get current route name from navigation state
    const routeName = useNavigationState(state => {
        if (!state) return null;
        const route = state.routes[state.index];
        return route?.name;
    });

    // Determine active screen based on route name
    const getActiveScreen = (): 'home' | 'food' | 'fitness' => {
        if (routeName === 'FoodLog') return 'food';
        if (routeName === 'Fitness') return 'fitness';
        return 'home';
    };

    const activeScreen = getActiveScreen();

    // Only show navbar on main app screens
    const showNavBar = routeName && ['Home', 'FoodLog', 'Fitness'].includes(routeName);

    if (!showNavBar) {
        return null;
    }

    return (
        <BottomNavBar>
            <NavButtons
                activeScreen={activeScreen}
                onHomePress={() => {
                    if (routeName !== 'Home') {
                        navigation.navigate('Home');
                    }
                }}
                onFoodPress={() => {
                    if (routeName !== 'FoodLog') {
                        navigation.navigate('FoodLog');
                    }
                }}
                onFitnessPress={() => {
                    Alert.alert('Fitness', 'Fitness screen coming soon');
                }}
            />
            <AddButton
                onPress={() => {
                    showAddFoodSheet();
                }}
            />
        </BottomNavBar>
    );
};
