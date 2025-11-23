import { StyleSheet } from 'react-native';
import { fonts } from '../constants/fonts';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        position: 'relative',
        overflow: 'hidden',
    },
    auraBallTopRight: {
        position: 'absolute',
        top: -250,
        right: -250,
        width: 500,
        height: 500,
    },
    auraBallBottomLeft: {
        position: 'absolute',
        bottom: -250,
        left: -250,
        width: 500,
        height: 500,
    },
    contentBox: {
        width: '100%',
        maxWidth: 400,
        zIndex: 1,
        flex: 1,
        justifyContent: 'space-between',
        position: 'relative',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        width: '100%',
        paddingHorizontal: 0,
    },
    progressBar: {
        flex: 1,
        height: 16,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#000',
        overflow: 'hidden',
        marginRight: 15,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#526EFF',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#666',
        textAlign: 'right',
        textTransform: 'lowercase',
        minWidth: 50,
    },
    scrollView: {
        flex: 1,
        width: '100%',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 20,
        paddingTop: 60, // Space for back button
    },
    stepContent: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    welcomeTitle: {
        fontSize: 48,
        fontFamily: fonts.bold,
        color: '#000',
        textAlign: 'center',
        marginBottom: 40,
        textTransform: 'lowercase',
    },
    stepTitle: {
        fontSize: 32,
        fontFamily: fonts.bold,
        color: '#000',
        textAlign: 'center',
        marginBottom: 8,
        textTransform: 'lowercase',
    },
    stepSubtitle: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#ADADAD',
        textAlign: 'center',
        marginBottom: 30,
        textTransform: 'lowercase',
    },
    inputWrapper: {
        width: 360,
        alignSelf: 'center',
    },
    agePickerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        marginBottom: 20,
        height: 280,
        position: 'relative',
        width: '100%',
    },
    agePickerMask: {
        height: 300,
        width: '100%',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    ageScrollIndicator: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: '50%',
        transform: [{ translateY: -1 }],
        alignItems: 'center',
        zIndex: 1,
        pointerEvents: 'none',
    },
    ageScrollLine: {
        width: 200,
        height: 2,
        backgroundColor: '#E0E0E0',
    },
    ageScrollView: {
        width: '100%',
        height: 180,
    },
    ageScrollContent: {
        alignItems: 'center',
    },
    ageItem: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    ageItemSelected: {
        // Selected item styling
    },
    agePickerTextBase: {
        fontFamily: fonts.bold,
        textAlign: 'center',
    },
    agePickerTextSelected: {
        fontSize: 96,
        fontFamily: fonts.bold,
        color: '#526EFF',
        textAlign: 'center',
    },
    agePickerNumberSecondary: {
        fontSize: 40,
        fontFamily: fonts.regular,
        color: '#CCCCCC',
        textAlign: 'center',
    },
    // Slider styles
    sliderContainer: {
        width: 360,
        alignSelf: 'center',
        marginTop: 20,
    },
    sliderValue: {
        fontSize: 48,
        fontFamily: fonts.bold,
        color: '#526EFF',
        textAlign: 'center',
        marginBottom: 30,
    },
    sliderTrack: {
        height: 8,
        backgroundColor: '#F5F5F5',
        borderRadius: 4,
        position: 'relative',
        marginBottom: 10,
    },
    sliderThumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#526EFF',
        borderWidth: 3,
        borderColor: '#000',
        position: 'absolute',
        top: -8,
        left: '50%',
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
    },
    sliderLabel: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#666',
    },
    // Card styles
    cardContainer: {
        width: 360,
        alignSelf: 'center',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    card: {
        flex: 1,
        minWidth: '30%',
        backgroundColor: '#F5F5F5',
        borderWidth: 2,
        borderColor: '#000',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    cardSelected: {
        backgroundColor: '#526EFF',
        borderColor: '#000',
    },
    cardText: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#333',
        textTransform: 'lowercase',
    },
    cardTextSelected: {
        color: '#fff',
    },
    // Goal card styles
    goalCard: {
        width: '100%',
        backgroundColor: '#F5F5F5',
        borderWidth: 2,
        borderColor: '#000',
        borderRadius: 10,
        padding: 24,
        alignItems: 'center',
        marginBottom: 12,
    },
    goalCardSelected: {
        backgroundColor: '#526EFF',
    },
    goalIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    goalCardText: {
        fontSize: 20,
        fontFamily: fonts.bold,
        color: '#333',
        textTransform: 'lowercase',
    },
    goalCardTextSelected: {
        color: '#fff',
    },
    // Activity card styles
    activityCard: {
        width: '100%',
        backgroundColor: '#F5F5F5',
        borderWidth: 2,
        borderColor: '#000',
        borderRadius: 10,
        padding: 20,
        marginBottom: 12,
    },
    activityCardSelected: {
        backgroundColor: '#526EFF',
    },
    activityCardTitle: {
        fontSize: 20,
        fontFamily: fonts.bold,
        color: '#333',
        textTransform: 'lowercase',
        marginBottom: 4,
    },
    activityCardTitleSelected: {
        color: '#fff',
    },
    activityCardDesc: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#666',
        textTransform: 'lowercase',
    },
    activityCardDescSelected: {
        color: '#fff',
    },
    // Frequency card styles
    frequencyCard: {
        width: '48%',
        backgroundColor: '#F5F5F5',
        borderWidth: 2,
        borderColor: '#000',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
        marginBottom: 12,
    },
    frequencyCardSelected: {
        backgroundColor: '#526EFF',
    },
    frequencyIcon: {
        fontSize: 40,
        marginBottom: 8,
    },
    frequencyCardText: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#333',
        textTransform: 'lowercase',
    },
    frequencyCardTextSelected: {
        color: '#fff',
    },
    // Diet card styles
    dietCard: {
        width: '48%',
        backgroundColor: '#F5F5F5',
        borderWidth: 2,
        borderColor: '#000',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
        marginBottom: 12,
    },
    dietCardSelected: {
        backgroundColor: '#526EFF',
    },
    dietIcon: {
        fontSize: 36,
        marginBottom: 8,
    },
    dietCardText: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: '#333',
        textTransform: 'lowercase',
        textAlign: 'center',
    },
    dietCardTextSelected: {
        color: '#fff',
    },
    // Chip styles (for allergies)
    chipContainer: {
        width: 360,
        alignSelf: 'center',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    chip: {
        backgroundColor: '#F5F5F5',
        borderWidth: 2,
        borderColor: '#000',
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 12,
        marginBottom: 10,
    },
    chipSelected: {
        backgroundColor: '#526EFF',
    },
    chipText: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#333',
        textTransform: 'lowercase',
    },
    chipTextSelected: {
        color: '#fff',
    },
    // Intensity card styles
    intensityCard: {
        width: '100%',
        backgroundColor: '#F5F5F5',
        borderWidth: 2,
        borderColor: '#000',
        borderRadius: 10,
        padding: 24,
        marginBottom: 12,
    },
    intensityCardSelected: {
        backgroundColor: '#526EFF',
    },
    intensityCardTitle: {
        fontSize: 24,
        fontFamily: fonts.bold,
        color: '#333',
        textTransform: 'lowercase',
        marginBottom: 4,
    },
    intensityCardTitleSelected: {
        color: '#fff',
    },
    intensityCardDesc: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#666',
        textTransform: 'lowercase',
    },
    intensityCardDescSelected: {
        color: '#fff',
    },
    // Unit toggle styles
    unitToggle: {
        flexDirection: 'row',
        width: 360,
        alignSelf: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 10,
        padding: 4,
        marginBottom: 20,
    },
    unitButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
    },
    unitButtonActive: {
        backgroundColor: '#526EFF',
    },
    unitButtonText: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#666',
        textTransform: 'lowercase',
    },
    unitButtonTextActive: {
        color: '#fff',
    },
    unitSection: {
        width: 360,
        alignSelf: 'center',
        marginBottom: 24,
    },
    unitSectionTitle: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#333',
        marginBottom: 12,
        textTransform: 'lowercase',
    },
    // Purpose card styles
    purposeCard: {
        width: '48%',
        backgroundColor: '#F5F5F5',
        borderWidth: 2,
        borderColor: '#000',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
        marginBottom: 12,
    },
    purposeCardSelected: {
        backgroundColor: '#526EFF',
    },
    purposeIcon: {
        fontSize: 40,
        marginBottom: 8,
    },
    purposeCardText: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: '#333',
        textTransform: 'lowercase',
        textAlign: 'center',
    },
    purposeCardTextSelected: {
        color: '#fff',
    },
    // Macro card styles
    macroCard: {
        width: '100%',
        backgroundColor: '#F5F5F5',
        borderWidth: 2,
        borderColor: '#000',
        borderRadius: 10,
        padding: 24,
        alignItems: 'center',
        marginBottom: 12,
    },
    macroCardSelected: {
        backgroundColor: '#526EFF',
    },
    macroCardTitle: {
        fontSize: 20,
        fontFamily: fonts.bold,
        color: '#333',
        textTransform: 'lowercase',
        marginTop: 12,
        marginBottom: 4,
    },
    macroCardTitleSelected: {
        color: '#fff',
    },
    macroCardDesc: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#666',
        textTransform: 'lowercase',
        textAlign: 'center',
    },
    macroCardDescSelected: {
        color: '#fff',
    },
    macroInputsContainer: {
        width: 360,
        alignSelf: 'center',
        marginTop: 20,
    },
    macroInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    macroLabel: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: '#333',
        width: 120,
        textTransform: 'lowercase',
    },
    macroInputWrapper: {
        flex: 1,
    },
    // Top back button
    topBackButton: {
        position: 'absolute',
        top: 20,
        left: 0, // Start from left edge
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        paddingLeft: 20, // Match button container paddingHorizontal
        zIndex: 10,
    },
    // Button container
    buttonContainer: {
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingTop: 20,
        paddingBottom: 30,
        width: '100%',
        paddingHorizontal: 20,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    backButtonText: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#526EFF',
        marginLeft: 4,
        textTransform: 'lowercase',
    },
    nextButton: {
        width: 360,
        height: 50,
        marginTop: 15,
    },
});

