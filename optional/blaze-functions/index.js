const crypto = require('crypto');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
initializeApp();
const db = getFirestore();
const SERVANT_SIGNUP_CODE = defineSecret('SERVANT_SIGNUP_CODE');

// مقارنة بزمن ثابت لتجنب تسريب الكود عبر فروق الزمن.
const sameSecret = (a, b) => {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
};

// ---------- تسجيل الخدام (التحقق من الكود على الخادم فقط) ----------
exports.registerServant = onCall({ secrets: [SERVANT_SIGNUP_CODE], enforceAppCheck: false }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'سجّل الدخول أولًا.');
  const { code, name, phone, contact } = request.data || {};
  const secret = SERVANT_SIGNUP_CODE.value();
  if (typeof code !== 'string' || !code || !secret || !sameSecret(code, secret)) {
    throw new HttpsError('permission-denied', 'كود الخدام غير صحيح.');
  }
  if (typeof name !== 'string' || name.trim().length < 2) {
    throw new HttpsError('invalid-argument', 'اكتب الاسم بالكامل.');
  }
  const uid = request.auth.uid;
  const ref = db.collection('users').doc(uid);
  const existing = await ref.get();
  if (existing.exists && existing.data().role !== 'servant') {
    throw new HttpsError('already-exists', 'الحساب مرتبط بالفعل بمخدوم. تواصل مع مسؤول التطبيق.');
  }
  const data = {
    name: name.trim(), role: 'servant', phone: typeof phone === 'string' ? phone : '',
    contact: typeof contact === 'string' ? contact : '', memberId: '',
    createdAt: Date.now()
  };
  await ref.set(data, { merge: false });
  return data;
});

// ---------- تسجيل حضور المخدوم بالـ QR (الوقت والنقاط تُحسب على الخادم) ----------
const DEFAULT_CFG = { max: 5, step: 5, open: 15, close: 60 };

// نفس معادلة الواجهة (calc في main.js) لكن بساعة الخادم.
function calc(ev, cfg, now) {
  const t = (now - ev.when) / 6e4;
  if (t < -cfg.open || t >= cfg.close) return null;
  if (t <= 0) return { pts: cfg.max, late: 0 };
  return { pts: Math.max(0, cfg.max - Math.floor(t / cfg.step)), late: Math.floor(t) };
}

exports.selfCheckIn = onCall({ enforceAppCheck: false }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'سجّل الدخول أولًا.');
  const eventId = request.data && request.data.eventId;
  if (typeof eventId !== 'string' || !eventId || eventId.length > 128 || eventId.includes('/')) {
    throw new HttpsError('invalid-argument', 'رمز QR غير صالح.');
  }
  const uid = request.auth.uid;
  const userSnap = await db.collection('users').doc(uid).get();
  const memberId = userSnap.exists ? userSnap.data().memberId : '';
  if (!userSnap.exists || userSnap.data().role !== 'member' || typeof memberId !== 'string' || !memberId) {
    throw new HttpsError('permission-denied', 'الحساب غير مرتبط بمخدوم.');
  }

  const memberRef = db.collection('members').doc(memberId);
  const eventRef = db.collection('events').doc(eventId);
  const attRef = db.collection('attendance').doc(`${eventId}_${memberId}`);
  const cfgRef = db.collection('config').doc('main');

  return db.runTransaction(async (tx) => {
    const [mSnap, eSnap, aSnap, cSnap] = await Promise.all([tx.get(memberRef), tx.get(eventRef), tx.get(attRef), tx.get(cfgRef)]);
    if (!mSnap.exists || mSnap.data().uid !== uid) throw new HttpsError('permission-denied', 'سجل المخدوم غير مرتبط بحسابك.');
    if (!eSnap.exists) throw new HttpsError('not-found', 'الحدث غير موجود');
    if (aSnap.exists) return { status: 'exists' };

    const m = mSnap.data(), ev = eSnap.data();
    if (ev.choir !== 'all' && ev.choir !== m.choir) throw new HttpsError('permission-denied', 'هذا الحدث ليس لكورالك.');
    const cfg = { ...DEFAULT_CFG, ...(cSnap.exists ? cSnap.data() : {}) };
    const now = Date.now();
    const r = calc(ev, cfg, now);
    if (!r) throw new HttpsError('failed-precondition', now < ev.when ? 'التسجيل لسه ماتفتحش' : 'التسجيل اتقفل، كلّم الخادم');

    tx.set(attRef, {
      eventId, memberId, name: m.name, choir: m.choir, title: ev.title, when: ev.when,
      status: r.late > 0 ? 'l' : 'p', pts: r.pts, at: now, manual: false
    });
    tx.update(memberRef, { points: FieldValue.increment(r.pts), attended: FieldValue.increment(1) });
    return { status: 'ok', pts: r.pts, late: r.late };
  });
});
