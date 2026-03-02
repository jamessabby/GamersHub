document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('loginBtn');
  const googleBtn = document.getElementById('googleBtn');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');

  loginBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
      alert('Please enter your username and password.');
      return;
    }

    console.log('Login attempt:', { username });
    // TODO: integrate with auth API
  });

  googleBtn.addEventListener('click', () => {
    console.log('Google sign-in initiated');
    // TODO: integrate with Google OAuth
  });
});