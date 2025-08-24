// Kobo Pinterest Extension - Service Worker

const KOBO_API_URL = 'https://phplaravel-1373325-5066620.cloudwaysapps.com/api';

let koboSession = null;

// Load saved session on startup
chrome.storage.local.get(['koboSession'], (result) => {
  if (result.koboSession) {
    koboSession = result.koboSession;
    console.log('Loaded saved session:', koboSession);
  } else {
    console.log('No saved session found');
  }
});

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'authenticate') {
    authenticateUser(request.data)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  }
  
  if (request.action === 'signOut') {
    koboSession = null;
    sendResponse({ success: true });
  }
  
  if (request.action === 'saveToKobo') {
    saveImageToKobo(request.data)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  }
  
  if (request.action === 'getSession') {
    sendResponse({ session: koboSession });
  }
  
  if (request.action === 'getStats') {
    getStats()
      .then(stats => sendResponse({ success: true, stats }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  }
});

// Authenticate user with Kobo
async function authenticateUser(credentials) {
  try {
    console.log('Attempting to authenticate with:', credentials.email);
    
    // Make login request to Kobo API
    const response = await fetch(`${KOBO_API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password
      })
    });
    
    const data = await response.json();
    console.log('Auth response status:', response.status);
    console.log('Auth response data:', data);
    
    if (!response.ok) {
      console.error('Auth failed:', data);
      throw new Error(data.message || data.error || 'Invalid credentials');
    }
    
    // Store session - Kobo returns a user object with token
    // The API returns: { access_token: "...", token_type: "Bearer", user: {...} }
    koboSession = {
      token: data.access_token || data.token || data.data?.token,
      email: credentials.email,
      userId: data.user?.id || data.data?.user?.id,
      userName: data.user?.name || data.data?.user?.name,
      user: data.user || data.data?.user
    };
    
    // Check if we got a token
    if (!koboSession.token) {
      console.error('No token in response:', data);
      throw new Error('No authentication token received');
    }
    
    // Save to storage
    await chrome.storage.local.set({ koboSession });
    console.log('Session saved successfully:', koboSession);
    
    return { 
      success: true,
      token: koboSession.token,
      name: koboSession.userName
    };
  } catch (error) {
    console.error('Authentication error:', error.message);
    throw error;
  }
}

// Function to save image to Kobo
async function saveImageToKobo(data) {
  console.log('saveImageToKobo called with:', data);
  console.log('Current session:', koboSession);
  
  if (!koboSession || !koboSession.token) {
    console.error('No session or token available');
    throw new Error('Please sign in to Kobo first');
  }
  
  try {
    const requestBody = {
      imageUrl: data.imageUrl,
      title: data.title || 'Saved from web',
      description: data.description,
      pageUrl: data.pageUrl
    };
    
    console.log('Sending request to:', `${KOBO_API_URL}/inspiration/save-pin`);
    console.log('Request headers:', {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${koboSession.token}`,
      'Accept': 'application/json'
    });
    console.log('Request body:', requestBody);
    
    // Use the new inspiration endpoint
    const response = await fetch(`${KOBO_API_URL}/inspiration/save-pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${koboSession.token}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('Response status:', response.status);
    
    if (response.status === 401) {
      // Session expired
      console.error('401 Unauthorized - clearing session');
      koboSession = null;
      await chrome.storage.local.remove(['koboSession']);
      throw new Error('Session expired. Please sign in again.');
    }
    
    const result = await response.json();
    console.log('Response data:', result);
    
    if (!response.ok) {
      console.error('Save failed:', result);
      throw new Error(result.message || 'Failed to save to Kobo');
    }
    
    console.log('Save successful:', result);
    return result;
  } catch (error) {
    console.error('Save error:', error);
    throw error;
  }
}

// Get stats for the user
async function getStats() {
  if (!koboSession) {
    return { savedToday: 0, totalBoards: 0 };
  }
  
  try {
    const response = await fetch(`${KOBO_API_URL}/inspiration/boards`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${koboSession.token}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }
    
    const result = await response.json();
    const boards = result.data || [];
    
    // Calculate saved today
    const today = new Date().toDateString();
    let savedToday = 0;
    
    boards.forEach(board => {
      if (board.pins_count) {
        // This is a simplified count - ideally we'd have a dedicated endpoint
        savedToday += board.pins_count;
      }
    });
    
    return {
      savedToday: savedToday,
      totalBoards: boards.length
    };
  } catch (error) {
    console.error('Failed to get stats:', error);
    return { savedToday: 0, totalBoards: 0 };
  }
}

console.log('Kobo Pinterest Extension service worker loaded');