let authMode = 'login';

function toggleAuthMode() {
  authMode = authMode === 'login' ? 'register' : 'login';
  document.getElementById('form-title').textContent = authMode === 'login' ? 'Войти в аккаунт' : 'Создать аккаунт';
  document.getElementById('form-submit-btn').textContent = authMode === 'login' ? 'ВОЙТИ' : 'ЗАРЕГИСТРИРОВАТЬСЯ';
  document.getElementById('footer-text').textContent = authMode === 'login' ? 'У вас еще нет аккаунта?' : 'Уже есть аккаунт?';
  document.getElementById('switch-mode-btn').textContent = authMode === 'login' ? 'Создать аккаунт' : 'Войти';
  hideError();
}

function togglePasswordVisibility() {
  const input = document.getElementById('auth-password');
  input.type = input.type === 'password' ? 'text' : 'password';
}

// Keyboard layout indicator
function initLayoutDetector() {
  const input = document.getElementById('auth-password');
  const wrapper = input.closest('.input-wrapper');
  const badge = document.createElement('span');
  badge.className = 'layout-badge';
  badge.textContent = 'EN';
  badge.style.cssText = 'position:absolute;right:40px;font-size:10px;font-weight:700;color:#696973;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.04);border-radius:4px;padding:2px 5px;pointer-events:none';
  wrapper.appendChild(badge);

  input.addEventListener('keydown', function(e) {
    if (e.key.length === 1) {
      const code = e.key.charCodeAt(0);
      if ((code >= 0x0400 && code <= 0x04FF) || code === 0x451 || code === 0x451) {
        badge.textContent = 'RU';
        badge.style.color = '#ff6b6b';
      } else if (code >= 0x20 && code <= 0x7E) {
        badge.textContent = 'EN';
        badge.style.color = '#696973';
      }
    }
  });
}

function submitAuthForm() {
  const password = document.getElementById('auth-password').value;
  if (!password || password.length < 6) {
    return showError('Пароль должен быть от 6 символов');
  }
  if (window.cef) {
    if (authMode === 'login') cef.emit('auth:login', password);
    else cef.emit('auth:register', password);
  }
}

function showError(msg) {
  const el = document.getElementById('auth-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function hideError() {
  const el = document.getElementById('auth-error');
  if (el) el.style.display = 'none';
}

initLayoutDetector();

if (window.cef) {
  cef.on('auth:error', function(msg) { showError(msg); });
  cef.on('auth:mode', function(mode) {
    if ((mode === 'register' && authMode !== 'register') || (mode === 'login' && authMode !== 'login')) {
      toggleAuthMode();
    }
    hideError();
  });
}
