import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { FoodItem } from '../services/foodService';
import { AddFoodBottomSheet } from '../components/AddFoodBottomSheet';
import {
    FoodLogFlyOverlay,
    FoodLogFlight,
    buildFlightFromTarget,
} from '../components/FoodLogFlyOverlay';
import { FoodLogHandle } from '../components/FoodLog';
import { getQuickAddItems } from '../services/foodService';
import { useFoodLog } from './FoodLogContext';
import { LoggedFoodEntry, MealType } from '../food/types';

export type FoodLogFlyTarget = Pick<FoodLogHandle, 'measureTarget' | 'getTargetRect' | 'pulse'>;

interface AddFoodContextType {
    showAddFoodSheet: () => void;
    registerHandler: (handler: (entry: LoggedFoodEntry) => void) => void;
    unregisterHandler: () => void;
    registerSheetState: (setShow: (show: boolean) => void) => void;
    unregisterSheetState: () => void;
    registerFoodLogTarget: (target: FoodLogFlyTarget | null) => void;
}

const AddFoodContext = createContext<AddFoodContextType | undefined>(undefined);

export const AddFoodProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { addFood } = useFoodLog();
    const [showSheet, setShowSheet] = useState(false);
    const [flights, setFlights] = useState<FoodLogFlight[]>([]);
    const handlerRef = useRef<((entry: LoggedFoodEntry) => void) | null>(null);
    const setSheetStateRef = useRef<((show: boolean) => void) | null>(null);
    const foodLogTargetRef = useRef<FoodLogFlyTarget | null>(null);

    const showAddFoodSheet = useCallback(() => {
        setShowSheet(true);
        if (setSheetStateRef.current) {
            setSheetStateRef.current(true);
        }
    }, []);

    const registerHandler = useCallback((foodHandler: (entry: LoggedFoodEntry) => void) => {
        handlerRef.current = foodHandler;
    }, []);

    const unregisterHandler = useCallback(() => {
        handlerRef.current = null;
    }, []);

    const registerSheetState = useCallback((setShow: (show: boolean) => void) => {
        setSheetStateRef.current = setShow;
    }, []);

    const unregisterSheetState = useCallback(() => {
        setSheetStateRef.current = null;
    }, []);

    const registerFoodLogTarget = useCallback((target: FoodLogFlyTarget | null) => {
        foodLogTargetRef.current = target;
    }, []);

    const handleFlightComplete = useCallback((id: string) => {
        setFlights((current) => current.filter((flight) => flight.id !== id));
        foodLogTargetRef.current?.pulse();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, []);

    const launchFlyToLog = useCallback((entry: LoggedFoodEntry) => {
        const target = foodLogTargetRef.current;
        if (!target) return;

        const rect = target.getTargetRect();
        if (!rect) {
            target.measureTarget().then((measured) => {
                if (!measured) return;
                setFlights((current) => [
                    ...current,
                    buildFlightFromTarget(entry.id, entry.food.name, entry.food.calories, measured),
                ]);
            });
            return;
        }

        const screenHeight = Dimensions.get('window').height;
        if (rect.y + rect.height < 40 || rect.y > screenHeight - 40) return;

        setFlights((current) => [
            ...current,
            buildFlightFromTarget(entry.id, entry.food.name, entry.food.calories, rect),
        ]);
    }, []);

    const handleAddFood = useCallback((food: FoodItem, meal?: MealType | null) => {
        const entry = addFood(food, { meal });
        if (handlerRef.current) {
            handlerRef.current(entry);
        }
        launchFlyToLog(entry);
        setShowSheet(false);
        if (setSheetStateRef.current) {
            setSheetStateRef.current(false);
        }
    }, [addFood, launchFlyToLog]);

    const handleClose = useCallback(() => {
        setShowSheet(false);
        if (setSheetStateRef.current) {
            setSheetStateRef.current(false);
        }
    }, []);

    const contextValue = useMemo(() => ({
        showAddFoodSheet,
        registerHandler,
        unregisterHandler,
        registerSheetState,
        unregisterSheetState,
        registerFoodLogTarget,
    }), [showAddFoodSheet, registerHandler, unregisterHandler, registerSheetState, unregisterSheetState, registerFoodLogTarget]);

    return (
        <AddFoodContext.Provider value={contextValue}>
            <View style={styles.root} collapsable={false}>
                {children}
                <AddFoodBottomSheet
                    visible={showSheet}
                    onClose={handleClose}
                    onAddFood={handleAddFood}
                    quickAddItems={getQuickAddItems()}
                />
                <FoodLogFlyOverlay flights={flights} onFlightComplete={handleFlightComplete} />
            </View>
        </AddFoodContext.Provider>
    );
};

export const useAddFood = () => {
    const context = useContext(AddFoodContext);
    if (!context) {
        throw new Error('useAddFood must be used within AddFoodProvider');
    }
    return context;
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
});
