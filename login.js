function randomPassword(len = 14) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (x) => chars[x % chars.length]).join('');
}

function getUsers() {
  let users = [];
  try {
    users = JSON.parse(localStorage.getItem('dashboardUsers')) || [];
  } catch {
    users = [];
  }
  if (!Array.isArray(users) || users.length === 0) {
    // First run: create the initial admin with a random password instead of a
    // well-known default that anyone reading the source could use. The password
    // is surfaced once (below) so the operator can sign in and change it.
    const initialPassword = randomPassword();
    users = [{ id: 1, username: 'admin', password: initialPassword, role: 'Super Admin', location: 'ALL' }];
    localStorage.setItem('dashboardUsers', JSON.stringify(users));
    sessionStorage.setItem('tata_first_run_password', initialPassword);
  }
  return users;
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    lucide.createIcons();
  }

  // Seed the initial admin account (if none exists) so the first-run password
  // banner below has something to show.
  getUsers();

  // First run: surface the generated admin password once so the operator can sign
  // in (there is no longer a well-known default password).
  const firstRunPassword = sessionStorage.getItem('tata_first_run_password');
  if (firstRunPassword) {
    const box = document.querySelector('.login-box');
    if (box) {
      const note = document.createElement('div');
      note.style.cssText = 'background:#fffbeb;border:1px solid #fcd34d;color:#92400e;padding:12px;border-radius:6px;margin-bottom:16px;font-size:0.85rem;line-height:1.5;';
      const title = document.createElement('strong');
      title.textContent = 'First-time setup';
      const line1 = document.createElement('div');
      line1.textContent = 'Admin username: admin';
      const line2 = document.createElement('div');
      const pwd = document.createElement('b');
      pwd.textContent = firstRunPassword;
      line2.textContent = 'Password: ';
      line2.appendChild(pwd);
      const hint = document.createElement('div');
      hint.style.fontSize = '0.8rem';
      hint.textContent = 'Save this password now. You can change it after logging in.';
      note.append(title, line1, line2, hint);
      box.insertBefore(note, box.firstChild);
    }
    sessionStorage.removeItem('tata_first_run_password');
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

    if (user && user.password === oldpwd) {
      // Success
      currentResetUserId = user.id;
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
    
    let users = getUsers();
    let userIndex = users.findIndex(u => u.id === currentResetUserId);
    if(userIndex !== -1) {
      users[userIndex].password = pwd1;
      localStorage.setItem('dashboardUsers', JSON.stringify(users));
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

const loginFormEl = document.getElementById('loginForm');
if (loginFormEl) {
  loginFormEl.addEventListener('submit', function(e) {
    e.preventDefault();
    const userId = document.getElementById('userId').value.trim();
    const pwd = document.getElementById('password').value.trim();

    if (userId) {
      let users = getUsers();
      let user = users.find(u => (u.username.toLowerCase() === userId.toLowerCase() || u.id.toString() === userId) && u.password === pwd);

      if (user) {
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        sessionStorage.setItem('tataUser', user.username);
        window.location.href = 'dashboard.html';
      } else {
        alert("Invalid login credentials.");
      }
    }
  });
}
