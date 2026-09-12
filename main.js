import Chart from 'chart.js/auto';
import { supabase } from './supabase.js';

// Initialize Lucide Icons
lucide.createIcons();

// DOM Elements
const loginPage = document.getElementById('login-page');
const dashboardPage = document.getElementById('dashboard-page');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const sidebar = document.getElementById('sidebar');
const hamburgerBtn = document.getElementById('hamburger-btn');

// --- DEV BYPASS (Remove before final deployment) ---
const DEV_MODE = true;
if (DEV_MODE) {
  loginPage.classList.remove('active');
  dashboardPage.classList.add('active');
  document.getElementById('welcome-message').textContent = 'Welcome Admin (Dev Mode)!';
  // Give the DOM a tiny bit of time to render before initializing charts
  setTimeout(() => initCharts(), 100);
}

// --- Navigation & Auth Logic ---
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const emailInput = document.getElementById('username').value;
  const passwordInput = document.getElementById('password').value;
  const submitBtn = loginForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  
  submitBtn.textContent = 'Signing in...';
  submitBtn.disabled = true;

  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailInput,
    password: passwordInput,
  });

  submitBtn.textContent = originalText;
  submitBtn.disabled = false;

  if (error) {
    alert(error.message);
    return;
  }

  // Get user details
  const user = data.user;
  const displayName = user.user_metadata?.username || user.email.split('@')[0];
  
  const welcomeMessage = document.getElementById('welcome-message');
  welcomeMessage.textContent = `Welcome ${displayName}!`;

  // Navigate to dashboard
  loginPage.classList.remove('active');
  dashboardPage.classList.add('active');
  
  // Initialize charts after dashboard is visible
  initCharts();
});

logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  document.getElementById('password').value = '';
  
  if (DEV_MODE) {
    // If in dev mode, just refresh to trigger the bypass again
    window.location.reload();
  } else {
    dashboardPage.classList.remove('active');
    loginPage.classList.add('active');
  }
});

// --- Sidebar Toggle Logic ---
hamburgerBtn.addEventListener('click', () => {
  if (window.innerWidth <= 768) {
    sidebar.classList.toggle('mobile-open');
  } else {
    sidebar.classList.toggle('collapsed');
  }
});

// Sidebar active state logic
const navItems = document.querySelectorAll('.nav-item');
navItems.forEach(item => {
  item.addEventListener('click', function(e) {
    e.preventDefault();
    navItems.forEach(nav => nav.classList.remove('active'));
    this.classList.add('active');
  });
});

// --- Charts Initialization ---
let chartsInitialized = false;

function initCharts() {
  if (chartsInitialized) return;
  chartsInitialized = true;

  // Global defaults for Chart.js to match our theme
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.color = '#718096';

  // 1. Inventory Values (Pie Chart)
  const ctxPie = document.getElementById('inventoryPieChart').getContext('2d');
  new Chart(ctxPie, {
    type: 'doughnut',
    data: {
      labels: ['Sold units', 'Total units'],
      datasets: [{
        data: [60, 40],
        backgroundColor: ['#2b4553', '#a0aec0'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right' }
      },
      cutout: '70%'
    }
  });

  // 2. Top 10 Stores by Sales (Horizontal Bar Chart)
  const ctxBar = document.getElementById('storesBarChart').getContext('2d');
  new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels: ['Gateway SR', 'The Rustic Fox', 'Velvet Vine', 'Blue Harbor', 'Nebula Novelties', 'Crimson Crafters', 'Tidal Treasures', 'Whimsy Wire', 'Mercantile', 'Emporium'],
      datasets: [{
        label: 'Sales (k)',
        data: [87, 72, 55, 39, 33, 24, 21, 21, 18, 17],
        backgroundColor: '#2b4553',
        borderRadius: 4,
        barThickness: 12
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false, grid: { display: false } },
        y: { grid: { display: false }, border: { display: false } }
      }
    }
  });

  // 3. Expense vs Profit (Line Chart)
  const ctxLine = document.getElementById('expenseLineChart').getContext('2d');
  
  // Create Gradients
  const gradientProfit = ctxLine.createLinearGradient(0, 0, 0, 400);
  gradientProfit.addColorStop(0, 'rgba(72, 187, 120, 0.2)');
  gradientProfit.addColorStop(1, 'rgba(72, 187, 120, 0)');

  const gradientExpense = ctxLine.createLinearGradient(0, 0, 0, 400);
  gradientExpense.addColorStop(0, 'rgba(237, 137, 54, 0.2)');
  gradientExpense.addColorStop(1, 'rgba(237, 137, 54, 0)');

  new Chart(ctxLine, {
    type: 'line',
    data: {
      labels: ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          label: 'Profit',
          data: [20, 15, 25, 22, 35, 45, 50],
          borderColor: '#48bb78',
          backgroundColor: gradientProfit,
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointRadius: 0
        },
        {
          label: 'Expense',
          data: [35, 25, 20, 30, 20, 15, 10],
          borderColor: '#ed8936',
          backgroundColor: gradientExpense,
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: {
          ticks: { callback: function(value) { return value + 'k'; } },
          border: { display: false, dash: [5, 5] },
          grid: { color: '#e2e8f0', tickBorderDash: [5,5] }
        }
      },
      interaction: { mode: 'index', intersect: false }
    }
  });
}
