import React from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';

export const GradientBackground: React.FC = () => {
    return (
        <View style={styles.container}>
            <Image
                source={require('../../assets/images/blue_ball.png')}
                style={styles.image}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: Dimensions.get('window').width,
        height: 300,
        marginLeft: -25,
        marginRight: -25,
        marginTop: 0,
        overflow: 'hidden',
        alignSelf: 'stretch',
    },
    image: {
        width: Dimensions.get('window').width,
        height: '100%',
        alignSelf: 'stretch',
    },
});

