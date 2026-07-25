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

if (window.cef) {
  cef.on('auth:error', function(msg) { showError(msg); });
  cef.on('auth:mode', function(mode) {
    if ((mode === 'register' && authMode !== 'register') || (mode === 'login' && authMode !== 'login')) {
      toggleAuthMode();
    }
    hideError();
  });
}
