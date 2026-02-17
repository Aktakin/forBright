const API = '/api';

/**
 * Safely parse a Response body as JSON.
 * Avoids "Unexpected end of JSON input" when backend is down or returns empty/non-JSON.
 */
export async function parseJson(res) {
  const text = await res.text();
  if (!text || !text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/** Request OTP to be sent to email. Uses backend; on failure (e.g. demo) returns { demo: true, code } so UI can show code. */
export async function sendOtp(email) {
  try {
    const res = await fetch(`${API}/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });
    const data = await parseJson(res);
    if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
    return { success: true };
  } catch (err) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    try {
      sessionStorage.setItem('bright_otp_demo', JSON.stringify({
        email: email.trim().toLowerCase(),
        code,
        expiresAt: Date.now() + 10 * 60 * 1000,
      }));
    } catch (_) {}
    return { demo: true, code };
  }
}

/** Verify OTP for email. Tries backend first; on failure uses demo store (for testing). Returns { verified, guest_token } when backend returns it. */
export async function verifyOtp(email, code) {
  const body = { email: email.trim(), code: code.trim() };
  try {
    const res = await fetch(`${API}/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await parseJson(res);
    if (!res.ok) throw new Error(data.error || 'Invalid OTP');
    if (data.guest_token) setGuestToken(data.guest_token);
    return { verified: true, guest_token: data.guest_token };
  } catch (_) {
    try {
      const raw = sessionStorage.getItem('bright_otp_demo');
      const demo = raw ? JSON.parse(raw) : null;
      if (!demo || demo.email !== body.email.toLowerCase()) throw new Error('No OTP found. Request a new one.');
      if (Date.now() > demo.expiresAt) throw new Error('OTP expired. Request a new one.');
      if (demo.code !== body.code) throw new Error('Invalid OTP.');
      sessionStorage.removeItem('bright_otp_demo');
      return { verified: true };
    } catch (e) {
      throw e;
    }
  }
}

const PATIENT_VERIFIED_KEY = 'bright_patient_verified';
const GUEST_TOKEN_KEY = 'bright_guest_token';

export function getGuestToken() {
  try {
    return sessionStorage.getItem(GUEST_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setGuestToken(token) {
  try {
    if (token) sessionStorage.setItem(GUEST_TOKEN_KEY, token);
    else sessionStorage.removeItem(GUEST_TOKEN_KEY);
  } catch (_) {}
}

export function clearGuestToken() {
  try {
    sessionStorage.removeItem(GUEST_TOKEN_KEY);
  } catch (_) {}
}

export function getPatientVerified() {
  try {
    const raw = sessionStorage.getItem(PATIENT_VERIFIED_KEY);
    if (!raw) return null;
    const { email, verifiedAt } = JSON.parse(raw);
    if (verifiedAt && Date.now() - verifiedAt > 24 * 60 * 60 * 1000) return null;
    return email;
  } catch {
    return null;
  }
}

export function setPatientVerified(email) {
  try {
    sessionStorage.setItem(PATIENT_VERIFIED_KEY, JSON.stringify({
      email,
      verifiedAt: Date.now(),
    }));
  } catch (_) {}
}

export function clearPatientVerified() {
  try {
    sessionStorage.removeItem(PATIENT_VERIFIED_KEY);
  } catch (_) {}
}
