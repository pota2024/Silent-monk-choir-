export const CFG = {
  choir: 'كورال الراهب الصامت',
  choirEn: "SILENT MONK'S CHOIR",
  church: 'كنيسة مارجرجس أبوزعبل',

  // كود الخدام غير موجود في التطبيق عمدًا.
  // التحقق منه يتم على الخادم فقط داخل Cloud Function (registerServant)
  // بالسر SERVANT_SIGNUP_CODE المخزّن في Firebase Secret Manager.

  // إعدادات Firebase Web عامة بطبيعتها (ليست أسرارًا)؛ الحماية الفعلية في firestore.rules.
  firebase: {
    apiKey: 'AIzaSyAKGPiTRzohvxHxZ0ScGYtOnbjvYiF2a1Y',
    authDomain: 'silent-monk-634e9.firebaseapp.com',
    projectId: 'silent-monk-634e9',
    storageBucket: 'silent-monk-634e9.firebasestorage.app',
    messagingSenderId: '922030121792',
    appId: '1:922030121792:web:3b56996a25241ca522d0a5'
  }
};
