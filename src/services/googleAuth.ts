import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

const discovery = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://www.googleapis.com/oauth2/v4/token',
    revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export const getGoogleIdToken = async (): Promise<string | null> => {
    try {
        // Check if Client ID is set
        const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
        if (!clientId) {
            throw new Error('Google Client ID is not set. Please add EXPO_PUBLIC_GOOGLE_CLIENT_ID to your .env file.');
        }

        // Generate redirect URI - Use Expo's auth proxy for HTTPS URL
        // Google OAuth requires an HTTPS domain, not exp://
        const baseRedirectUri = AuthSession.makeRedirectUri();

        // If we got an exp:// URL, convert it to HTTPS proxy format
        // Otherwise, use it as-is (might already be HTTPS)
        let redirectUri: string;
        if (baseRedirectUri.startsWith('exp://')) {
            // Convert exp:// to https://auth.expo.io proxy format
            const appSlug = Constants.expoConfig?.slug || 'plates';
            const expoUsername =
                Constants.expoConfig?.owner ||
                Constants.manifest2?.extra?.expoClient?.owner ||
                process.env.EXPO_PUBLIC_EXPO_OWNER ||
                'anonymous';
            redirectUri = `https://auth.expo.io/@${expoUsername}/${appSlug}`;
        } else {
            redirectUri = baseRedirectUri;
        }

        // Make redirect URI VERY visible
        console.log('');
        console.log('═══════════════════════════════════════════════════════');
        console.log('🔴 IMPORTANT: COPY THIS REDIRECT URI TO GOOGLE CLOUD CONSOLE');
        console.log('═══════════════════════════════════════════════════════');
        console.log('Redirect URI:', redirectUri);
        console.log('═══════════════════════════════════════════════════════');
        console.log('Client ID:', clientId.substring(0, 30) + '...');
        console.log('');
        console.log('📋 SETUP INSTRUCTIONS:');
        console.log('1. Go to: https://console.cloud.google.com/apis/credentials');
        console.log('2. Find your OAuth 2.0 Client ID (must be "Web application" type)');
        console.log('3. Click "Edit" → Add the redirect URI above to "Authorized redirect URIs"');
        console.log('4. Click "SAVE" and wait 2-3 minutes');
        console.log('5. Restart Expo and try again');
        console.log('');
        console.log('⚠️  The redirect URI must match EXACTLY');
        console.log('');

        // Generate a nonce for ID token flow (required by Google)
        const nonce = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            Math.random().toString()
        );

        const request = new AuthSession.AuthRequest({
            clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
            scopes: ['openid', 'profile', 'email'],
            responseType: AuthSession.ResponseType.IdToken,
            redirectUri,
            usePKCE: false, // PKCE not supported with ID token flow
            extraParams: {
                nonce: nonce, // Add nonce explicitly (required for ID token flow)
            },
        });

        const result = await request.promptAsync(discovery);

        if (result.type === 'success') {
            return result.params.id_token as string;
        }

        if (result.type === 'error') {
            console.error('Google auth error details:', {
                error: result.error,
                errorCode: result.errorCode,
                params: result.params,
            });

            // Provide specific guidance for common errors
            const errorMsg = typeof result.error === 'string' ? result.error : result.error?.message || 'Unknown error';
            const errorStr = String(errorMsg);
            if (errorStr.includes('invalid_request') || errorStr.includes('redirect_uri_mismatch')) {
                console.error('');
                console.error('❌ REDIRECT URI MISMATCH ERROR');
                console.error('The redirect URI above must be added to Google Cloud Console.');
                console.error('Make sure your OAuth client is configured as "Web application" type.');
                console.error('');
            }

            throw new Error(`Google sign-in failed: ${errorMsg}. Error code: ${result.errorCode || 'N/A'}`);
        }

        if (result.type === 'cancel') {
            throw new Error('Google sign-in was cancelled by user');
        }

        if (result.type === 'dismiss') {
            console.error('');
            console.error('❌ OAuth flow was dismissed - REDIRECT URI MISMATCH!');
            console.error('');
            console.error('📋 ACTION REQUIRED:');
            console.error('1. Look above for the "Redirect URI" (should be visible)');
            console.error('2. Copy that EXACT redirect URI');
            console.error('3. Go to: https://console.cloud.google.com/apis/credentials');
            console.error('4. Edit your OAuth 2.0 Client ID');
            console.error('5. Add the redirect URI to "Authorized redirect URIs"');
            console.error('6. Click SAVE and wait 1-2 minutes');
            console.error('7. Restart Expo and try again');
            console.error('');
            console.error('Current Redirect URI:', redirectUri);
            console.error('');
            throw new Error(`Redirect URI mismatch! Add this to Google Cloud Console: ${redirectUri}`);
        }

        console.error('Unexpected result type:', result.type);
        return null;
    } catch (error) {
        console.error('Google auth error:', error);
        return null;
    }
};

