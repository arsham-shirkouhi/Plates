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
        overflow: 'hidden',
        justifyContent: 'center',
    },
    title: {
        fontSize: 42,
        fontFamily: fonts.bold,
        color: '#252525',
        textAlign: 'center',
        marginBottom: 8,
        textTransform: 'lowercase',
    },
    subtitle: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#ADADAD',
        textAlign: 'center',
        marginBottom: 12,
        textTransform: 'lowercase',
    },
    email: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#526EFF',
        textAlign: 'center',
        marginBottom: 20,
        textTransform: 'lowercase',
    },
    instruction: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 24,
        textTransform: 'lowercase',
        width: 360,
        alignSelf: 'center',
    },
    backToLoginText: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#333',
        textAlign: 'center',
        textTransform: 'lowercase',
    },
});

