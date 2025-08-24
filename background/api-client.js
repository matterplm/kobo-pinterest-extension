// Kobo API Client for Chrome Extension

export class KoboAPI {
  constructor() {
    this.baseURL = 'https://app.matterplm.com/api'; // Production URL
    this.token = null;
    this.companyId = null;
    this.brandId = null;
  }
  
  // Set authentication details
  setAuth(auth) {
    this.token = auth.token;
    this.companyId = auth.companyId || 1;
    this.brandId = auth.brandId || 1;
  }
  
  // Clear authentication
  clearAuth() {
    this.token = null;
    this.companyId = null;
    this.brandId = null;
  }
  
  // Get headers for API requests
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Company-Id': this.companyId,
      'X-Brand-Id': this.brandId
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }
  
  // Authenticate user
  async authenticate(credentials) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(credentials)
    });
    
    if (!response.ok) {
      throw new Error('Authentication failed');
    }
    
    const data = await response.json();
    return {
      token: data.access_token,
      user: data.user,
      expiresAt: Date.now() + (data.expires_in * 1000),
      companyId: data.user.current_company_id,
      brandId: data.user.current_brand_id
    };
  }
  
  // Get user's boards
  async getBoards() {
    const response = await fetch(`${this.baseURL}/inspiration/boards`, {
      headers: this.getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch boards');
    }
    
    return response.json();
  }
  
  // Create a new board
  async createBoard(boardData) {
    const response = await fetch(`${this.baseURL}/inspiration/boards`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(boardData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create board');
    }
    
    return response.json();
  }
  
  // Create a new pin
  async createPin(pinData) {
    // Handle image upload if present
    if (pinData.imageData) {
      pinData.file_url = await this.uploadImage(pinData.imageData);
      delete pinData.imageData;
    }
    
    const response = await fetch(`${this.baseURL}/inspiration/pins`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(pinData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create pin');
    }
    
    return response.json();
  }
  
  // Upload image to storage
  async uploadImage(imageData) {
    const formData = new FormData();
    
    // Convert base64 to blob if needed
    if (imageData.startsWith('data:')) {
      const blob = await this.dataURLtoBlob(imageData);
      formData.append('file', blob, 'capture.png');
    } else if (imageData instanceof Blob) {
      formData.append('file', imageData, 'capture.png');
    } else {
      // It's a URL, download and upload
      const blob = await this.downloadImage(imageData);
      formData.append('file', blob, 'capture.png');
    }
    
    formData.append('section', 'inspiration-board');
    
    const response = await fetch(`${this.baseURL}/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'X-Company-Id': this.companyId,
        'X-Brand-Id': this.brandId
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload image');
    }
    
    const data = await response.json();
    return data.file_url;
  }
  
  // Download image from URL
  async downloadImage(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to download image');
    }
    return response.blob();
  }
  
  // Convert data URL to Blob
  async dataURLtoBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mime });
  }
  
  // Search Kobo items (styles, components, suppliers)
  async searchItems(query, type = 'all') {
    const endpoints = {
      styles: '/styles',
      components: '/components',
      suppliers: '/suppliers',
      all: '/search'
    };
    
    const endpoint = endpoints[type] || endpoints.all;
    
    const response = await fetch(`${this.baseURL}${endpoint}?search=${encodeURIComponent(query)}`, {
      headers: this.getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Search failed');
    }
    
    return response.json();
  }
  
  // Link pin to Kobo entities
  async linkPin(pinId, links) {
    const response = await fetch(`${this.baseURL}/inspiration/pins/${pinId}/link`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ links })
    });
    
    if (!response.ok) {
      throw new Error('Failed to link pin');
    }
    
    return response.json();
  }
  
  // Get pin details
  async getPin(pinId) {
    const response = await fetch(`${this.baseURL}/inspiration/pins/${pinId}`, {
      headers: this.getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch pin');
    }
    
    return response.json();
  }
  
  // Update pin
  async updatePin(pinId, updates) {
    const response = await fetch(`${this.baseURL}/inspiration/pins/${pinId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update pin');
    }
    
    return response.json();
  }
  
  // Delete pin
  async deletePin(pinId) {
    const response = await fetch(`${this.baseURL}/inspiration/pins/${pinId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete pin');
    }
    
    return response.json();
  }
  
  // Get board details with pins
  async getBoard(boardId) {
    const response = await fetch(`${this.baseURL}/inspiration/boards/${boardId}`, {
      headers: this.getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch board');
    }
    
    return response.json();
  }
  
  // Update board
  async updateBoard(boardId, updates) {
    const response = await fetch(`${this.baseURL}/inspiration/boards/${boardId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update board');
    }
    
    return response.json();
  }
  
  // Share board
  async shareBoard(boardId, shareSettings) {
    const response = await fetch(`${this.baseURL}/inspiration/boards/${boardId}/share`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(shareSettings)
    });
    
    if (!response.ok) {
      throw new Error('Failed to share board');
    }
    
    return response.json();
  }
  
  // Get user preferences
  async getPreferences() {
    const response = await fetch(`${this.baseURL}/user/preferences`, {
      headers: this.getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch preferences');
    }
    
    return response.json();
  }
  
  // Update user preferences
  async updatePreferences(preferences) {
    const response = await fetch(`${this.baseURL}/user/preferences`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(preferences)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update preferences');
    }
    
    return response.json();
  }
}