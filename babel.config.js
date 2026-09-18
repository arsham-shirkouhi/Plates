module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        // Reanimated v4 moved its Babel plugin into react-native-worklets.
        // NOTE: this plugin MUST remain the last item in the plugins array.
        plugins: ['react-native-worklets/plugin'],
    };
};
