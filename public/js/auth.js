// Auth related functionality
const API_URL = '/api';
const AUTH_TOKEN_KEY = 'tic_tac_toe_auth_token';
const USER_DATA_KEY = 'tic_tac_toe_user_data';

// DOM Elements
const authContainer = document.getElementById('auth-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginToggle = document.getElementById('login-toggle');
const registerToggle = document.getElementById('register-toggle');
const loginMessage = document.getElementById('login-message');
const registerMessage = document.getElementById('register-message');
const logoutBtn = document.getElementById('logout-btn');
const usernameDisplay = document.getElementById('username-display');
const dashboard = document.getElementById('dashboard');

// Toggle between login and register forms
loginToggle.addEventListener('click', () => {
    loginToggle.classList.add('active');
    registerToggle.classList.remove('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
});

registerToggle.addEventListener('click', () => {
    registerToggle.classList.add('active');
    loginToggle.classList.remove('active');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
});

// Login form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    try {
        loginMessage.textContent = 'Logging in...';
        
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }
        
        // Store auth token and user data
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(data.user));
        
        // Show success message
        loginMessage.textContent = 'Login successful!';
        loginMessage.style.color = '#4CAF50';
        
        // Clear form
        loginForm.reset();
        
        // Show dashboard after short delay
        setTimeout(() => {
            showDashboard();
        }, 1000);
        
    } catch (error) {
        loginMessage.textContent = error.message;
        loginMessage.style.color = '#ff6b6b';
        console.error('Login error:', error);
    }
});

// Register form submission
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    try {
        registerMessage.textContent = 'Registering...';
        
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Registration failed');
        }
        
        // Store auth token and user data
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(data.user));
        
        // Show success message
        registerMessage.textContent = 'Registration successful!';
        registerMessage.style.color = '#4CAF50';
        
        // Clear form
        registerForm.reset();
        
        // Show dashboard after short delay
        setTimeout(() => {
            showDashboard();
        }, 1000);
        
    } catch (error) {
        registerMessage.textContent = error.message;
        registerMessage.style.color = '#ff6b6b';
        console.error('Registration error:', error);
    }
});

// Logout functionality
logoutBtn.addEventListener('click', () => {
    // Clear auth data
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    
    // Show auth container
    authContainer.classList.remove('hidden');
    dashboard.classList.add('hidden');
    document.getElementById('game-section').classList.add('hidden');
    
    // Reset forms
    loginForm.reset();
    registerForm.reset();
    loginMessage.textContent = '';
    registerMessage.textContent = '';
});

// Check if user is already logged in
function checkAuthStatus() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const userData = localStorage.getItem(USER_DATA_KEY);
    
    if (token && userData) {
        // User is logged in, show dashboard
        showDashboard();
    } else {
        // User is not logged in, show auth container
        authContainer.classList.remove('hidden');
    }
}

// Show dashboard
function showDashboard() {
    const userData = JSON.parse(localStorage.getItem(USER_DATA_KEY));
    
    authContainer.classList.add('hidden');
    dashboard.classList.remove('hidden');
    
    // Display username
    usernameDisplay.textContent = userData.username;
}

// Get auth token
function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

// Get user data
function getUserData() {
    const userData = localStorage.getItem(USER_DATA_KEY);
    return userData ? JSON.parse(userData) : null;
}

// Initialize auth
checkAuthStatus();