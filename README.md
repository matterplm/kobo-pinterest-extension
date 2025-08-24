# Kobo Inspiration Board Chrome Extension

A Pinterest-like Chrome extension for Kobo PLM that allows users to capture inspiration from anywhere on the web and organize it into mood boards linked directly to their styles, components, and suppliers.

## Features

### 🎯 Core Functionality
- **Quick Capture**: Right-click any image to pin it to your Kobo boards
- **Area Selection**: Capture specific areas of any webpage
- **Text Snippets**: Save important text with formatting preserved
- **Color Extraction**: Extract and save color palettes from any webpage
- **Smart Context**: Automatically captures metadata, alt text, and surrounding content

### 📋 Board Management
- Create and organize inspiration boards by category
- Link boards to Kobo styles, components, and suppliers
- Collaborate with team members on shared boards
- Private, team, and public visibility options

### 🔗 Kobo Integration
- Seamless authentication with your Kobo account
- Direct linking to styles, components, and suppliers
- Convert pins to style attachments
- Search and link Kobo items while pinning

### 🎨 Advanced Features
- Floating sidebar for browsing boards while researching
- Quick pin button on image hover
- Auto-tagging and keyword extraction
- Bulk operations for organizing pins

## Installation

### Development Setup

1. Clone the repository:
```bash
git clone https://github.com/kobo-plm/kobo-pinterest-extension.git
cd kobo-pinterest-extension
```

2. Install dependencies:
```bash
npm install
```

3. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `kobo-pinterest-extension` directory

### Production Installation

The extension will be available on the Chrome Web Store (coming soon).

## Usage

### Getting Started

1. **Sign In**: Click the extension icon and sign in with your Kobo credentials
2. **Create a Board**: Create your first inspiration board or select an existing one
3. **Start Pinning**: Browse any website and right-click images to pin them

### Capture Methods

#### Right-Click Context Menu
- Right-click any image → "Pin Image to Kobo Board"
- Select text → "Pin Selection to Kobo Board"
- Right-click page → "Pin Page to Kobo Board"

#### Extension Popup
- Click extension icon for quick actions
- Capture area, screenshot, or extract colors
- Access recent boards and pins

#### Quick Pin Button
- Hover over images to see the quick pin button
- One-click to save with auto-selected board

#### Keyboard Shortcuts
- `Ctrl+Shift+K`: Open popup
- `Ctrl+Shift+S`: Toggle sidebar
- `Ctrl+Shift+C`: Start area capture

### Organizing Pins

1. **Tags**: Add tags for easy searching and filtering
2. **Notes**: Add context and descriptions to pins
3. **Linking**: Connect pins to Kobo styles, components, or suppliers
4. **Positioning**: Drag and drop pins on board canvas

## Backend Setup

### Laravel API Endpoints

The extension requires the following API endpoints on your Kobo server:

```php
// Routes in routes/api.php
Route::prefix('inspiration')->group(function () {
    Route::get('boards', 'InspirationController@getBoards');
    Route::post('boards', 'InspirationController@createBoard');
    Route::get('boards/{id}', 'InspirationController@getBoard');
    Route::put('boards/{id}', 'InspirationController@updateBoard');
    Route::delete('boards/{id}', 'InspirationController@deleteBoard');
    
    Route::get('pins', 'InspirationController@getPins');
    Route::post('pins', 'InspirationController@createPin');
    Route::get('pins/{id}', 'InspirationController@getPin');
    Route::put('pins/{id}', 'InspirationController@updatePin');
    Route::delete('pins/{id}', 'InspirationController@deletePin');
    Route::post('pins/{id}/link', 'InspirationController@linkPin');
});
```

### Database Migrations

Run the migrations to create the necessary tables:

```bash
php artisan migrate
```

This creates:
- `inspiration_boards` - Stores board information
- `inspiration_pins` - Stores individual pins
- `pin_links` - Links pins to Kobo entities

## Configuration

### Extension Options

Access options by clicking the settings icon in the popup:

- **Default Board**: Set your default board for quick pinning
- **Auto-Tag**: Enable automatic tag generation
- **Color Extraction**: Enable automatic color palette extraction
- **Notifications**: Configure notification preferences

### API Configuration

Update `background/api-client.js` to point to your Kobo instance:

```javascript
this.baseURL = 'https://your-kobo-instance.com/api';
```

## Development

### Project Structure

```
kobo-pinterest-extension/
├── manifest.json           # Extension manifest
├── background/            # Service worker and API client
├── content/              # Content scripts for webpage interaction
├── popup/               # Extension popup interface
├── options/            # Settings page
├── sidebar/           # Floating sidebar component
├── assets/           # Icons and styles
└── lib/             # Shared utilities
```

### Building for Production

```bash
npm run build
```

This creates a `dist/` directory with the production-ready extension.

### Testing

```bash
npm test
```

## API Reference

### Chrome Extension APIs Used

- `chrome.contextMenus` - Right-click menu integration
- `chrome.tabs` - Tab management and screenshot capture
- `chrome.storage` - Persistent storage for auth and preferences
- `chrome.runtime` - Background script communication
- `chrome.notifications` - User notifications

### Kobo API Endpoints

The extension communicates with the following Kobo API endpoints:

- `POST /api/auth/login` - Authentication
- `GET /api/inspiration/boards` - List boards
- `POST /api/inspiration/boards` - Create board
- `POST /api/inspiration/pins` - Create pin
- `POST /api/files/upload` - Upload images
- `GET /api/styles` - Search styles
- `GET /api/components` - Search components
- `GET /api/suppliers` - Search suppliers

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Ensure you're using correct Kobo credentials
   - Check if your account has API access enabled
   - Verify the API URL is correct

2. **Images Not Saving**
   - Check if the image URL is accessible
   - Ensure you have permission to access the image
   - Try using the screenshot feature instead

3. **Extension Not Loading**
   - Reload the extension in Chrome
   - Check for console errors
   - Ensure all files are present

### Debug Mode

Enable debug mode in the console:

```javascript
localStorage.setItem('kobo_debug', 'true');
```

## Security

- All API communications use HTTPS
- Authentication tokens are stored securely in Chrome storage
- CORS is properly configured for cross-origin requests
- Content Security Policy prevents XSS attacks

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

Proprietary - Kobo PLM

## Support

For support, please contact:
- Email: support@kobo-plm.com
- Documentation: https://docs.kobo-plm.com/extensions/inspiration-board

## Roadmap

### Version 1.1
- [ ] AI-powered auto-tagging
- [ ] Bulk pin operations
- [ ] Board templates
- [ ] Export to PDF/PowerPoint

### Version 1.2
- [ ] Video frame extraction
- [ ] Font/typography capture
- [ ] Pattern recognition
- [ ] Trend analysis

### Version 2.0
- [ ] Mobile companion app
- [ ] Real-time collaboration
- [ ] Advanced image editing
- [ ] Integration with design tools

---

Built with ❤️ by the Kobo team