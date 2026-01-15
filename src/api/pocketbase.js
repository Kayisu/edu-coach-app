import PocketBase from 'pocketbase';

// PocketBase yerel sunucu adresi (Varsayılan 8090)
const PB_URL = 'http://127.0.0.1:8090';

export const pb = new PocketBase(PB_URL);

/** * ÖNEMLİ MÜHENDİSLİK NOTU:
 * PocketBase varsayılan olarak "Auto-Cancellation" özelliğine sahiptir. 
 * React Strict Mode altında, bir component iki kez render edildiğinde 
 * ilk isteği iptal edebilir. Bu da konsolda "autocancelled" hatalarına yol açar.
 * 15 günlük hızlı geliştirme sürecinde bu baş ağrısını önlemek için kapatıyoruz.
 */
pb.autoCancellation(false);

// Kullanıcı oturumu değiştiğinde konsola yazdır (Debug için kolaylık sağlar)
pb.authStore.onChange((token, model) => {
    console.log('AuthStore Change:', model);
});