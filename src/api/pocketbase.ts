import PocketBase, { AuthModel } from 'pocketbase';

// PocketBase local server address (Default 8090)
const PB_URL = 'http://127.0.0.1:8090';

export const pb = new PocketBase(PB_URL);

/** * IMPORTANT ENGINEERING NOTE:
 * PocketBase has "Auto-Cancellation" enabled by default.
 * Under React Strict Mode, when a component is rendered twice,
 * it may cancel the first request. This leads to "autocancelled" errors in the console.
 * We disable this to prevent headaches during the 15-day rapid development process.
 */
pb.autoCancellation(false);

// Log when user session changes (Convenience for Debugging)
pb.authStore.onChange((token: string, model: AuthModel) => {
    console.log('AuthStore Change:', model);
});
