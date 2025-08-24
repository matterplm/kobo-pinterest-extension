// Kobo Pinterest Extension - Modern Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  const loginForm = document.getElementById('loginForm');
  const loginSection = document.getElementById('loginSection');
  const statusSection = document.getElementById('statusSection');
  const signOutBtn = document.getElementById('signOutBtn');
  const userEmailSpan = document.getElementById('userEmail');
  const userNameSpan = document.getElementById('userName');
  const userInitialSpan = document.getElementById('userInitial');
  const savedCountSpan = document.getElementById('savedCount');
  const boardCountSpan = document.getElementById('boardCount');
  const captureBtn = document.getElementById('captureBtn');
  const boardsBtn = document.getElementById('boardsBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const toastDiv = document.getElementById('toast');
  
  // Check if already logged in
  const session = await chrome.storage.local.get(['koboSession', 'stats']);
  
  if (session.koboSession && session.koboSession.token) {
    // Already logged in
    showLoggedInState(session.koboSession);
    updateStats(session.stats);
  } else {
    // Need to log in
    showLoginState();
  }
  
  // Handle login form submission with modern animations
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const submitBtn = loginForm.querySelector('.primary-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    
    // Show loading state
    btnText.style.display = 'none';
    btnLoader.style.display = 'block';
    submitBtn.disabled = true;
    
    try {
      // Authenticate with Kobo
      chrome.runtime.sendMessage({
        action: 'authenticate',
        data: {
          email,
          password
        }
      }, (response) => {
        // Reset button state
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
        submitBtn.disabled = false;
        
        // Check for Chrome runtime errors
        if (chrome.runtime.lastError) {
          console.error('Chrome runtime error:', chrome.runtime.lastError);
          showToast('Extension error. Please reload the extension.', 'error');
          return;
        }
        
        // Check if response exists
        if (!response) {
          showToast('No response from extension. Please reload and try again.', 'error');
          return;
        }
        
        // Handle the response
        if (response.success) {
          const userData = {
            email: email,
            name: response.name || email.split('@')[0],
            token: response.token
          };
          
          showToast('Welcome back!', 'success');
          animateTransition(() => {
            showLoggedInState(userData);
          });
        } else {
          showToast(response.error || 'Invalid credentials', 'error');
          shakeForm();
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      btnText.style.display = 'block';
      btnLoader.style.display = 'none';
      submitBtn.disabled = false;
      showToast('An error occurred. Please try again.', 'error');
    }
  });
  
  // Handle sign out
  signOutBtn.addEventListener('click', async () => {
    await chrome.storage.local.remove(['koboSession', 'stats']);
    
    // Notify service worker
    chrome.runtime.sendMessage({ action: 'signOut' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Chrome runtime error:', chrome.runtime.lastError);
      }
    });
    
    showToast('Signed out successfully', 'success');
    
    animateTransition(() => {
      showLoginState();
      // Clear password field for security
      document.getElementById('password').value = '';
      document.getElementById('email').value = '';
    });
  });
  
  // Handle quick actions
  captureBtn?.addEventListener('click', async () => {
    captureBtn.classList.add('clicked');
    setTimeout(() => captureBtn.classList.remove('clicked'), 300);
    
    // Send message to content script to start capture
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'startCapture' });
    window.close();
  });
  
  boardsBtn?.addEventListener('click', async () => {
    boardsBtn.classList.add('clicked');
    setTimeout(() => boardsBtn.classList.remove('clicked'), 300);
    
    // Open boards page
    chrome.tabs.create({ url: 'http://localhost:8000/inspiration-boards' });
    window.close();
  });
  
  settingsBtn?.addEventListener('click', () => {
    settingsBtn.classList.add('rotate');
    setTimeout(() => settingsBtn.classList.remove('rotate'), 600);
    
    // Open settings
    chrome.runtime.openOptionsPage();
  });
  
  // Handle form interactions
  const inputs = document.querySelectorAll('.modern-input');
  inputs.forEach(input => {
    input.addEventListener('focus', () => {
      input.parentElement.classList.add('focused');
    });
    
    input.addEventListener('blur', () => {
      if (!input.value) {
        input.parentElement.classList.remove('focused');
      }
    });
  });
  
  // Handle forgot password and create account links
  document.querySelectorAll('.link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const action = link.textContent.toLowerCase();
      
      if (action.includes('forgot')) {
        chrome.tabs.create({ url: 'http://localhost:8000/password/reset' });
      } else if (action.includes('create')) {
        chrome.tabs.create({ url: 'http://localhost:8000/register' });
      }
      
      window.close();
    });
  });
  
  function showLoginState() {
    loginSection.classList.add('active');
    statusSection.style.display = 'none';
  }
  
  function showLoggedInState(userData) {
    loginSection.classList.remove('active');
    statusSection.style.display = 'block';
    
    // Update user info
    const name = userData.name || userData.email.split('@')[0];
    const initial = name.charAt(0).toUpperCase();
    
    userEmailSpan.textContent = userData.email;
    userNameSpan.textContent = name;
    userInitialSpan.textContent = initial;
    
    // Fetch and update stats
    fetchStats();
  }
  
  function updateStats(stats) {
    if (!stats) {
      stats = { savedToday: 0, totalBoards: 0 };
    }
    
    // Animate counter updates
    animateCounter(savedCountSpan, stats.savedToday || 0);
    animateCounter(boardCountSpan, stats.totalBoards || 0);
  }
  
  async function fetchStats() {
    chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
      if (response && response.success) {
        updateStats(response.stats);
      }
    });
  }
  
  function animateCounter(element, target) {
    const current = parseInt(element.textContent) || 0;
    const increment = Math.ceil((target - current) / 20);
    let value = current;
    
    const timer = setInterval(() => {
      value += increment;
      if ((increment > 0 && value >= target) || (increment < 0 && value <= target)) {
        value = target;
        clearInterval(timer);
      }
      element.textContent = value;
    }, 30);
  }
  
  function showToast(message, type = 'info') {
    toastDiv.textContent = message;
    toastDiv.className = `toast ${type} show`;
    
    setTimeout(() => {
      toastDiv.classList.add('fade-out');
      setTimeout(() => {
        toastDiv.className = 'toast';
      }, 300);
    }, 3000);
  }
  
  function animateTransition(callback) {
    const container = document.querySelector('.container');
    container.style.opacity = '0';
    container.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
      callback();
      container.style.opacity = '1';
      container.style.transform = 'scale(1)';
    }, 300);
  }
  
  function shakeForm() {
    const form = document.querySelector('.modern-form');
    form.classList.add('shake');
    setTimeout(() => form.classList.remove('shake'), 500);
  }
  
  // Add shake animation to CSS
  const style = document.createElement('style');
  style.textContent = `
    .shake {
      animation: shake 0.5s ease-in-out;
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
      20%, 40%, 60%, 80% { transform: translateX(4px); }
    }
    .clicked {
      animation: click 0.3s ease;
    }
    @keyframes click {
      0% { transform: scale(1); }
      50% { transform: scale(0.95); }
      100% { transform: scale(1); }
    }
    .rotate {
      animation: rotate 0.6s ease;
    }
    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .container {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
  `;
  document.head.appendChild(style);
  
  // Listen for stats updates from background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'statsUpdated') {
      updateStats(request.stats);
    }
  });
});