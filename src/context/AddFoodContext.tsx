import React, { createContext, useContext, useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { FoodItem } from '../services/foodService';
import { AddFoodBottomSheet } from '../components/AddFoodBottomSheet';
import { getQuickAddItems } from '../services/foodService';

interface AddFoodContextType {
    showAddFoodSheet: () => void;
    registerHandler: (handler: (food: FoodItem) => void) => void;
    unregisterHandler: () => void;
    registerSheetState: (setShow: (show: boolean) => void) => void;
    unregisterSheetState: () => void;
}

const AddFoodContext = createContext<AddFoodContextType | undefined>(undefined);

export const AddFoodProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [showSheet, setShowSheet] = useState(false);
    const [quickAddItems, setQuickAddItems] = useState<FoodItem[]>([]);
    const handlerRef = useRef<((food: FoodItem) => void) | null>(null);
    const setSheetStateRef = useRef<((show: boolean) => void) | null>(null);

    useEffect(() => {
        let mounted = true;

        const loadQuickAddItems = async () => {
            const items = await getQuickAddItems();
            if (mounted) {
                setQuickAddItems(items);
            }
        };

        loadQuickAddItems();
        return () => {
            mounted = false;
        };
    }, []);

    const showAddFoodSheet = useCallback(() => {
        setShowSheet(true);
        if (setSheetStateRef.current) {
            setSheetStateRef.current(true);
        }
    }, []);

    const registerHandler = useCallback((foodHandler: (food: FoodItem) => void) => {
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

    const handleAddFood = useCallback((food: FoodItem) => {
        if (handlerRef.current) {
            handlerRef.current(food);
        }
        setShowSheet(false);
        if (setSheetStateRef.current) {
            setSheetStateRef.current(false);
        }
    }, []);

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
                quickAddItems={quickAddItems}
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
