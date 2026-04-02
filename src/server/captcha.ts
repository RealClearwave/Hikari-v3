type CaptchaEntry = {
  answer: string;
  expireAt: number;
};

const store = new Map<string, CaptchaEntry>();
const TTL_MS = 2 * 60 * 1000;

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function cleanup() {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (value.expireAt <= now) {
      store.delete(key);
    }
  }
}

export function generateCaptcha() {
  cleanup();

  const a = randomInt(1, 20);
  const b = randomInt(1, 20);
  const op = Math.random() < 0.5 ? '+' : '-';
  const answer = op === '+' ? String(a + b) : String(a - b);
  const id = makeId();

  store.set(id, {
    answer,
    expireAt: Date.now() + TTL_MS,
  });

  return {
    captcha_id: id,
    challenge: `${a} ${op} ${b} = ?`,
    expires_in: Math.floor(TTL_MS / 1000),
  };
}

export function verifyCaptcha(captchaId: string, captchaAnswer: string) {
  cleanup();

  const id = String(captchaId || '').trim();
  const answer = String(captchaAnswer || '').trim();
  if (!id || !answer) return false;

  const entry = store.get(id);
  if (!entry) return false;

  store.delete(id);
  if (entry.expireAt <= Date.now()) return false;
  return entry.answer === answer;
}
