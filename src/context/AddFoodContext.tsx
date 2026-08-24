import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';
import { FoodItem } from '../services/foodService';
import { AddFoodBottomSheet } from '../components/AddFoodBottomSheet';
import { getQuickAddItems } from '../services/foodService';
import { useFoodLog } from './FoodLogContext';
import { LoggedFoodEntry, MealType } from '../food/types';

interface AddFoodContextType {
    showAddFoodSheet: () => void;
    registerHandler: (handler: (entry: LoggedFoodEntry) => void) => void;
    unregisterHandler: () => void;
    registerSheetState: (setShow: (show: boolean) => void) => void;
    unregisterSheetState: () => void;
}

const AddFoodContext = createContext<AddFoodContextType | undefined>(undefined);

export const AddFoodProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { addFood } = useFoodLog();
    const [showSheet, setShowSheet] = useState(false);
    const handlerRef = useRef<((entry: LoggedFoodEntry) => void) | null>(null);
    const setSheetStateRef = useRef<((show: boolean) => void) | null>(null);

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

    const handleAddFood = useCallback((food: FoodItem, meal?: MealType | null) => {
        const entry = addFood(food, { meal });
        if (handlerRef.current) {
            handlerRef.current(entry);
        }
        setShowSheet(false);
        if (setSheetStateRef.current) {
            setSheetStateRef.current(false);
        }
    }, [addFood]);

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
    }), [showAddFoodSheet, registerHandler, unregisterHandler, registerSheetState, unregisterSheetState]);

    return (
        <AddFoodContext.Provider value={contextValue}>
            {children}
            <AddFoodBottomSheet
                visible={showSheet}
                onClose={handleClose}
                onAddFood={handleAddFood}
                quickAddItems={getQuickAddItems()}
            />
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
