// login.js
const API_BASE = 'https://poker-imposing-jogging.ngrok-free.dev';

// If already have a valid session, skip login
(async function checkAlreadyLoggedIn() {
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'ngrok-skip-browser-warning': 'true' },
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      sessionStorage.setItem('accessToken', data.accessToken);
      window.location.replace('/dashboard.html');
    }
  } catch {
    // not logged in, or server unreachable — stay here silently
  }
})();

// Wire up the login form
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errorEl  = document.getElementById('formError');
  const btn      = document.querySelector('.login-button');

  errorEl.textContent = '';
  document.getElementById('emailError').textContent = '';
  document.getElementById('passwordError').textContent = '';

  let valid = true;
  if (!email) {
    document.getElementById('emailError').textContent = 'Email is required';
    valid = false;
  }
  if (!password) {
    document.getElementById('passwordError').textContent = 'Password is required';
    valid = false;
  }
  if (!valid) return;

  btn.disabled = true;
  btn.textContent = 'Signing in...';

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Invalid email or password');
    }

    sessionStorage.setItem('accessToken', data.accessToken);
    sessionStorage.setItem('user', JSON.stringify(data.user));

    window.location.replace('/dashboard.html');
  } catch (err) {
    // Any TypeError here means the request never completed —
    // server unreachable, CORS preflight failed, network down, etc.
    if (err instanceof TypeError) {
      showServerDownModal();
    } else {
      errorEl.textContent = err.message;
    }
    btn.disabled = false;
    btn.textContent = 'LOGIN';
  }
});

// Password toggle
document.getElementById('togglePassword')?.addEventListener('click', () => {
  const input = document.getElementById('password');
  const icon  = document.querySelector('.toggle-icon');
  if (input.type === 'password') {
    input.type = 'text';
    icon.textContent = '🙈';
  } else {
    input.type = 'password';
    icon.textContent = '👁';
  }
});

// ── Server Down Modal ──────────────────────────────────────────────────────
function showServerDownModal() {
  if (document.getElementById('serverDownOverlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'serverDownOverlay';
  overlay.innerHTML = `
    <style>
      #serverDownOverlay {
        position: fixed; inset: 0; z-index: 9999;
        background: rgba(12, 74, 62, 0.55);
        backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        animation: sdFadeIn 0.25s ease;
        padding: 20px;
      }
      @keyframes sdFadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes sdPop {
        from { opacity: 0; transform: translateY(16px) scale(0.96); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      #serverDownCard {
        background: #ffffff;
        border-radius: 16px;
        max-width: 420px;
        width: 100%;
        padding: 32px 28px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.25);
        animation: sdPop 0.3s ease;
        font-family: 'Helvetica Neue', Arial, sans-serif;
      }
      #serverDownCard .sd-icon {
        width: 72px; height: 72px;
        margin: 0 auto 18px;
        border-radius: 50%;
        background: linear-gradient(135deg, #0c4a3e, #14b8a6);
        display: flex; align-items: center; justify-content: center;
        font-size: 34px;
        box-shadow: 0 8px 20px rgba(20,184,166,0.35);
      }
      #serverDownCard h2 {
        margin: 0 0 8px;
        font-size: 21px;
        color: #0c4a3e;
        font-weight: 800;
      }
      #serverDownCard p {
        margin: 0 0 18px;
        font-size: 14px;
        color: #555;
        line-height: 1.6;
      }
      #serverDownCard .sd-note {
        background: #f4f9f8;
        border-left: 4px solid #14b8a6;
        border-radius: 0 8px 8px 0;
        padding: 12px 14px;
        font-size: 12.5px;
        color: #0c4a3e;
        text-align: left;
        margin-bottom: 20px;
        line-height: 1.55;
      }
      #serverDownCard button {
        background: #0d7a6c;
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 11px 28px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.15s ease;
      }
      #serverDownCard button:hover {
        background: #0c4a3e;
      }
    </style>
    <div id="serverDownCard">
      <div class="sd-icon">🛠️</div>
      <h2>Demo Server Resting</h2>
      <p>
        The CarePulse backend isn't reachable right now. This live demo runs on
        a temporary development server that isn't always online.
      </p>
      <div class="sd-note">
        <strong>For reviewers:</strong> please refer to the recorded product
        demo and PDF walkthrough included in our submission — they showcase
        the full live system, including Gemini-generated reminders and SMS
        delivery, captured while the server was active.
      </div>
      <button id="serverDownCloseBtn">Got it</button>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('serverDownCloseBtn').addEventListener('click', () => {
    overlay.remove();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}
