import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 30,
    },
    testButton: {
        marginBottom: 15,
    },
    testButtonText: {
        fontSize: 14,
    },
    logoutButton: {
        backgroundColor: '#FF3B30',
        padding: 15,
        borderRadius: 8,
        minWidth: 120,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    macrosContainer: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        padding: 20,
        marginBottom: 30,
        borderWidth: 2,
        borderColor: '#000',
    },
    macrosTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
        textTransform: 'lowercase',
    },
    macroRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    macroLabel: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        textTransform: 'lowercase',
    },
    macroValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#526EFF',
    },
    baseTDEEContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        marginBottom: 8,
        borderBottomWidth: 2,
        borderBottomColor: '#E0E0E0',
    },
    baseTDEELabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
        textTransform: 'lowercase',
    },
    baseTDEEValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
});

