import { pb } from '../api/pocketbase';
import { AuthModel } from 'pocketbase';

/**
 * Auth service keeps UI decoupled from PocketBase.
 */
export const authService = {
    /**
     * Logs in with identity (email or username) and password.
     * @param {string} identity
     * @param {string} password
     * @returns {Promise<AuthModel>} Authenticated user model
     */
    async login(identity: string, password: string): Promise<AuthModel> {
        const result = await pb.collection('users').authWithPassword(identity, password);
        return result?.record;
    },

    /**
     * Clears the auth store.
     */
    logout(): void {
        pb.authStore.clear();
    },

    /**
     * Returns current user model if authenticated.
     */
    currentUser(): AuthModel | null {
        return pb.authStore.isValid ? pb.authStore.model : null;
    }
};
