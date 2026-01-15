import { pb } from '../api/pocketbase';

/**
 * Auth service keeps UI decoupled from PocketBase.
 */
export const authService = {
  /**
   * Logs in with identity (email or username) and password.
   * @param {string} identity
   * @param {string} password
   * @returns {Promise<Object>} Authenticated user model
   */
  async login(identity, password) {
    const result = await pb.collection('users').authWithPassword(identity, password);
    return result?.record;
  },

  /**
   * Clears the auth store.
   */
  logout() {
    pb.authStore.clear();
  },

  /**
   * Returns current user model if authenticated.
   */
  currentUser() {
    return pb.authStore.isValid ? pb.authStore.model : null;
  }
};
