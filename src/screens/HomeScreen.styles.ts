import { StyleSheet, Dimensions } from 'react-native';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingLeft: 25,
        paddingRight: 25,
        paddingTop: 0,
        paddingBottom: 120, // Increased to accommodate bottom nav button stack (90px + padding)
    },
    contentCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        marginTop: 0,
        height: 170,
        borderWidth: 2.5,
        borderColor: '#252525',
        shadowColor: '#252525',
        // shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        zIndex: 1,
        overflow: 'hidden',
    },
    cardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        height: '100%',
    },
    calorieSection: {
        flex: 0.8,
        alignItems: 'center',
        justifyContent: 'center',
        paddingRight: 10,
        overflow: 'hidden',
    },
    macrosSection: {
        flex: 1.2,
        paddingLeft: 10,
        overflow: 'hidden',
    },
    testButton: {
        marginTop: 16,
    },
    logoutButton: {
        marginTop: 12,
    },
});
