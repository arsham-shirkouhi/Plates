import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

interface BarcodeScannerModalProps {
    visible: boolean;
    onClose: () => void;
    onBarcodeScanned: (barcode: string) => Promise<void> | void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ visible, onClose, onBarcodeScanned }) => {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanning, setScanning] = useState(false);

    useEffect(() => {
        if (visible) setScanning(false);
    }, [visible]);

    const handleBarcodeScanned = async ({ data }: { data: string }) => {
        if (scanning || !data) return;
        setScanning(true);
        await onBarcodeScanned(data);
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>scan barcode</Text>
                    <TouchableOpacity accessibilityLabel="Close barcode scanner" onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={26} color="#fff" />
                    </TouchableOpacity>
                </View>

                {!permission ? (
                    <View style={styles.center}><ActivityIndicator color="#fff" /></View>
                ) : !permission.granted ? (
                    <View style={styles.center}>
                        <Text style={styles.message}>Camera access is needed to scan a food barcode.</Text>
                        <TouchableOpacity style={styles.action} onPress={requestPermission}>
                            <Text style={styles.actionText}>allow camera</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <CameraView
                        style={StyleSheet.absoluteFill}
                        facing="back"
                        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
                        onBarcodeScanned={scanning ? undefined : handleBarcodeScanned}
                    />
                )}

                <View pointerEvents="none" style={styles.guide}>
                    <View style={styles.frame} />
                    <Text style={styles.guideText}>{scanning ? 'looking up product…' : 'line up the barcode inside the frame'}</Text>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111' },
    header: { zIndex: 2, paddingTop: 62, paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { color: '#fff', fontSize: 22, fontWeight: '700' },
    closeButton: { width: 42, height: 42, justifyContent: 'center', alignItems: 'center', borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.45)' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    message: { color: '#fff', fontSize: 17, textAlign: 'center', lineHeight: 24 },
    action: { marginTop: 20, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 12 },
    actionText: { color: '#111', fontWeight: '700', textTransform: 'lowercase' },
    guide: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center' },
    frame: { width: '82%', height: 180, borderWidth: 2, borderColor: '#fff', borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.08)' },
    guideText: { color: '#fff', textAlign: 'center', fontSize: 16, marginTop: 22, paddingHorizontal: 32, textShadowColor: '#000', textShadowRadius: 5 },
});
