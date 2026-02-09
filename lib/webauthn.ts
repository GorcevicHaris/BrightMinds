import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import type {
    PublicKeyCredentialCreationOptionsJSON,
    PublicKeyCredentialRequestOptionsJSON
} from '@simplewebauthn/browser';

export async function createFingerprintCredential(childName: string): Promise<string> {
    if (!window.PublicKeyCredential) {
        throw new Error('Vaš uređaj ne podržava biometrijsku autentifikaciju');
    }

    try {
        const options: PublicKeyCredentialCreationOptionsJSON = {
            challenge: crypto.randomUUID(),
            rp: {
                name: "Bright Minds",
                id: window.location.hostname,
            },
            user: {
                id: crypto.randomUUID(),
                name: childName,
                displayName: childName,
            },
            pubKeyCredParams: [
                { alg: -7, type: "public-key" },
                { alg: -257, type: "public-key" }
            ],
            authenticatorSelection: {
                authenticatorAttachment: "platform",
                userVerification: "required",
            },
            timeout: 60000,
        };

        const credential = await startRegistration({ optionsJSON: options });
        return credential.id;

    } catch (error: any) {
        if (error.name === 'NotAllowedError') {
            throw new Error('Fingerprint skeniranje je otkazano');
        } else if (error.name === 'NotSupportedError') {
            throw new Error('Vaš uređaj ne podržava biometrijsku autentifikaciju');
        }
        throw new Error('Greška pri skeniranju fingerprinta: ' + error.message);
    }
}

/**
 * Verifikuje fingerprint za postojeće dete
 */
export async function verifyFingerprintCredential(credentialId: string): Promise<boolean> {
    if (!window.PublicKeyCredential) {
        throw new Error('Vaš uređaj ne podržava biometrijsku autentifikaciju');
    }

    try {
        const options: PublicKeyCredentialRequestOptionsJSON = {
            challenge: crypto.randomUUID(),
            allowCredentials: [{
                id: credentialId,
                type: 'public-key',
                transports: ['internal']
            }],
            timeout: 60000,
            userVerification: "required"
        };

        const assertion = await startAuthentication({ optionsJSON: options });
        return assertion !== null;
    } catch {
        return false;
    }
}
