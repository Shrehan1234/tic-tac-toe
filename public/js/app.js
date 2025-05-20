// Main app functionality
document.addEventListener('DOMContentLoaded', () => {
    // Initialize game functionality when logged in
    if (getUserData()) {
        initGame();
    }
    
    // Event listener for login status changes
    window.addEventListener('storage', (event) => {
        if (event.key === AUTH_TOKEN_KEY || event.key === USER_DATA_KEY) {
            const isLoggedIn = localStorage.getItem(AUTH_TOKEN_KEY) && localStorage.getItem(USER_DATA_KEY);
            
            if (isLoggedIn) {
                initGame();
            }
        }
    });
});

// For development/testing - to mock user login without a backend
function devLogin(username) {
    const mockUserId = 'user_' + Math.random().toString(36).substr(2, 9);
    const mockToken = 'token_' + Math.random().toString(36).substr(2, 9);
    
    const userData = {
        id: mockUserId,
        username: username,
        email: `${username}@example.com`,
        stats: {
            wins: 0,
            losses: 0,
            draws: 0
        }
    };
    
    localStorage.setItem(AUTH_TOKEN_KEY, mockToken);
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    
    // Refresh page to apply changes
    window.location.reload();
}

// For development/testing - clear login data
function devLogout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    
    // Refresh page to apply changes
    window.location.reload();
}