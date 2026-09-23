function getUsers() {
  let users = JSON.parse(localStorage.getItem('dashboardUsers'));
  if (!users || users.length === 0) {
    users = [
      { id: 1, username: 'admin', password: 'password', role: 'Super Admin', location: 'ALL' },
      { id: 2, username: 'manager1', password: 'password', role: 'Manager', location: 'SUPWAL' }
    ];
  }
  return users;
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    lucide.createIcons();
  }

  // Password toggle helper
  function setupToggle(toggleId, inputId) {
    const toggle = document.getElementById(toggleId);
    const input = document.getElementById(inputId);
    if(toggle && input) {
      toggle.addEventListener('click', () => {
        if(input.type === 'password') {
          input.type = 'text';
          toggle.innerHTML = '<i data-lucide="eye-off" style="width: 18px; height: 18px;"></i>';
        } else {
          input.type = 'password';
          toggle.innerHTML = '<i data-lucide="eye" style="width: 18px; height: 18px;"></i>';
        }
        if (window.lucide) lucide.createIcons();
      });
    }
  }

  setupToggle('toggle-pwd', 'password');
  setupToggle('toggle-reset-oldpwd', 'reset-oldpwd');
  setupToggle('toggle-reset-newpwd1', 'reset-new-pwd1');
  setupToggle('toggle-reset-newpwd2', 'reset-new-pwd2');

  // Modal logic
  const openModalBtn = document.getElementById('open-reset-modal');
  const closeModalBtn = document.getElementById('close-reset-modal');
  const modalOverlay = document.getElementById('reset-password-modal');
  
  if (openModalBtn && modalOverlay) {
    openModalBtn.addEventListener('click', (e) => {
      e.preventDefault();
      resetModalForms();
      const mainUserId = document.getElementById('userId').value;
      if (mainUserId) {
        document.getElementById('reset-userid').value = mainUserId;
      }
      modalOverlay.style.display = 'flex';
    });
  }
  
  if (closeModalBtn && modalOverlay) {
    closeModalBtn.addEventListener('click', () => {
      modalOverlay.style.display = 'none';
      resetModalForms();
    });
  }

  function resetModalForms() {
    document.getElementById('reset-verify-form').reset();
    document.getElementById('reset-newpwd-form').reset();
    document.getElementById('reset-verify-form').style.display = 'block';
    document.getElementById('reset-newpwd-form').style.display = 'none';
    document.getElementById('reset-error-msg').style.display = 'none';
    document.getElementById('reset-match-error').style.display = 'none';
    document.getElementById('reset-success-msg').style.display = 'none';
  }



  // Password reset flow
  let currentResetUserId = null;
  
  document.getElementById('reset-verify-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const userid = document.getElementById('reset-userid').value;
    const oldpwd = document.getElementById('reset-oldpwd').value;
    
    // Check local storage for dashboardUsers
    let users = getUsers();
    let user = users.find(u => u.username === userid || u.id.toString() === userid);
    
    // Hardcoded fallback for the default JS_3008420 user
    if ((user && user.password === oldpwd) || (!user && userid === 'JS_3008420' && oldpwd === 'secret')) {
      // Success
      currentResetUserId = user ? user.id : 'default';
      document.getElementById('reset-verify-form').style.display = 'none';
      document.getElementById('reset-newpwd-form').style.display = 'block';
    } else {
      // Failed
      document.getElementById('reset-error-msg').style.display = 'block';
    }
  });

  document.getElementById('reset-newpwd-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const pwd1 = document.getElementById('reset-new-pwd1').value;
    const pwd2 = document.getElementById('reset-new-pwd2').value;
    
    if (pwd1 !== pwd2) {
      document.getElementById('reset-match-error').style.display = 'block';
      return;
    }
    document.getElementById('reset-match-error').style.display = 'none';
    
    if (currentResetUserId === 'default') {
      // Update the default user logic if they were never saved
      let users = getUsers();
      users.push({id: Date.now(), username: 'JS_3008420', password: pwd1, role: 'Super Admin', location: 'ALL'});
      localStorage.setItem('dashboardUsers', JSON.stringify(users));
    } else {
      let users = getUsers();
      let userIndex = users.findIndex(u => u.id === currentResetUserId);
      if(userIndex !== -1) {
        users[userIndex].password = pwd1;
        localStorage.setItem('dashboardUsers', JSON.stringify(users));
      }
    }
    
    document.getElementById('reset-success-msg').style.display = 'block';
    document.getElementById('save-new-pwd-btn').style.display = 'none';
    
    setTimeout(() => {
      modalOverlay.style.display = 'none';
      resetModalForms();
      document.getElementById('save-new-pwd-btn').style.display = 'block';
    }, 2000);
  });

});

document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const userId = document.getElementById('userId').value.trim();
  const pwd = document.getElementById('password').value.trim();
  
  if (userId) {
    let users = getUsers();
    let user = users.find(u => (u.username.toLowerCase() === userId.toLowerCase() || u.id.toString() === userId) && u.password === pwd);
    
    // Always allow admin/password or JS_3008420/secret if they don't exist in local storage to prevent lockouts
    const isFallbackAdmin = userId.toLowerCase() === 'admin' && pwd === 'password' && !users.find(u => u.username.toLowerCase() === 'admin');
    const isFallbackJS = userId.toUpperCase() === 'JS_3008420' && pwd === 'secret' && !users.find(u => u.username.toUpperCase() === 'JS_3008420');

    if (user || isFallbackAdmin || isFallbackJS) {
      const userData = user || (isFallbackAdmin ? { id: 1, username: 'admin', role: 'Super Admin', location: 'ALL' } : { id: 99, username: 'JS_3008420', role: 'Super Admin', location: 'ALL' });
      sessionStorage.setItem('currentUser', JSON.stringify(userData));
      sessionStorage.setItem('tataUser', userData.username);
      window.location.href = 'dashboard.html';
    } else {
      alert("Invalid login credentials.");
    }
  }
});
