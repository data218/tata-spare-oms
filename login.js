document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const userId = document.getElementById('userId').value;
  if (userId) {
    // In a real app we'd validate credentials
    sessionStorage.setItem('tataUser', userId);
    window.location.href = 'dashboard.html';
  }
});
