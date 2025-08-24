// Kobo Extension - Content Script
(function() {
  'use strict';
  
  // Check if extension context is valid before running
  if (!chrome.runtime?.id) {
    console.log('⚠️ Extension context invalid. Extension may have been reloaded.');
    // Clean up any old elements
    document.querySelectorAll('.kobo-wrapper, .kobo-toast').forEach(el => el.remove());
    // Exit early - don't run the rest of the script
    return;
  }

// Prevent multiple injections
if (window.koboExtensionInjected) {
  console.log('⚠️ Kobo extension already injected, skipping...');
  // Clean up old elements if extension was reloaded
  document.querySelectorAll('.kobo-wrapper, .kobo-toast').forEach(el => el.remove());
} else {
  window.koboExtensionInjected = true;
  console.log('🚀 Kobo extension loaded on:', window.location.href);
}

// Track processed images to avoid duplicates
const processedImages = new WeakSet();

// Minimum image size to show save button (avoid tiny icons)
const MIN_IMAGE_SIZE = 50;

// Create save button element
function createSaveButton() {
  const button = document.createElement('button');
  button.className = 'kobo-save-button';
  
  // Create icon container
  const iconSpan = document.createElement('span');
  iconSpan.className = 'kobo-icon';
  
  // Create text
  const textSpan = document.createElement('span');
  textSpan.className = 'kobo-text';
  textSpan.textContent = 'Save';
  
  button.appendChild(iconSpan);
  button.appendChild(textSpan);
  
  console.log('✅ Created save button');
  return button;
}

// Add hover functionality to an image
function processImage(img) {
  // Skip if already processed
  if (processedImages.has(img)) {
    console.log('⏭️ Skipping - already processed');
    return;
  }
  
  // If image not loaded yet, wait for it
  if (!img.complete || img.naturalWidth === 0) {
    console.log('⏳ Image not loaded yet, waiting...', img.src?.substring(0, 50));
    img.addEventListener('load', () => {
      console.log('✅ Image loaded, processing now');
      processImage(img);
    });
    return;
  }
  
  // Log every image we check
  console.log('🔍 Checking image:', {
    src: img.src?.substring(0, 50) + '...',
    width: img.width,
    height: img.height,
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight
  });
  
  // Use naturalWidth/naturalHeight for size check (actual image dimensions)
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  
  // Skip if too small
  if (width < MIN_IMAGE_SIZE || height < MIN_IMAGE_SIZE) {
    console.log('⏭️ Skipping - too small:', width, 'x', height);
    return;
  }
  
  // Skip base64 images and data URIs
  const src = img.src || '';
  if (src.startsWith('data:')) {
    console.log('⏭️ Skipping - data URI');
    return;
  }
  
  console.log('✅ Processing image for save button');
  processedImages.add(img);
  
  // Get the parent element
  const parent = img.parentNode;
  if (!parent) {
    console.log('❌ No parent node found');
    return;
  }
  
  // Check if image is already wrapped
  if (parent.classList && parent.classList.contains('kobo-wrapper')) {
    console.log('⏭️ Already wrapped');
    return;
  }
  
  // Create wrapper div
  const wrapper = document.createElement('div');
  wrapper.className = 'kobo-wrapper';
  
  console.log('📦 Creating wrapper');
  
  // Wrap the image
  try {
    parent.insertBefore(wrapper, img);
    wrapper.appendChild(img);
    console.log('✅ Image wrapped successfully');
  } catch (error) {
    console.error('❌ Error wrapping image:', error);
    return;
  }
  
  // Create save button
  const saveButton = createSaveButton();
  wrapper.appendChild(saveButton);
  console.log('✅ Button added to wrapper');
  
  // Show button on hover
  wrapper.addEventListener('mouseenter', (e) => {
    console.log('🖱️ Mouse entered image wrapper');
    saveButton.classList.add('visible');
  });
  
  wrapper.addEventListener('mouseleave', (e) => {
    console.log('🖱️ Mouse left image wrapper');
    if (!saveButton.classList.contains('saving')) {
      saveButton.classList.remove('visible');
    }
  });
  
  // Handle save click
  saveButton.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔘 Save button clicked');
    
    // Update button state
    saveButton.classList.add('saving');
    const textSpan = saveButton.querySelector('.kobo-text');
    textSpan.textContent = 'Saving...';
    
    try {
      // Check if extension context is still valid
      if (!chrome.runtime?.id) {
        throw new Error('Extension was updated. Please refresh the page.');
      }
      
      // Check if user is logged in
      const session = await chrome.storage.local.get(['koboSession']);
      console.log('📝 Session check:', session.koboSession ? 'Logged in' : 'Not logged in');
      
      if (!session.koboSession || !session.koboSession.token) {
        showToast('Please sign in to Kobo first', 'error');
        saveButton.classList.remove('saving');
        textSpan.textContent = 'Save';
        return;
      }
      
      console.log('📤 Sending save request to background script');
      // Send save request to background script
      const response = await chrome.runtime.sendMessage({
        action: 'saveToKobo',
        data: {
          imageUrl: img.src,
          pageUrl: window.location.href,
          title: document.title,
          description: img.alt || img.title || ''
        }
      });
      
      console.log('📥 Response from background:', response);
      
      if (response && response.success) {
        saveButton.classList.add('success');
        textSpan.textContent = 'Saved!';
        showToast('Image saved to Kobo!', 'success');
        
        setTimeout(() => {
          saveButton.classList.remove('visible', 'saving', 'success');
          textSpan.textContent = 'Save';
        }, 2000);
      } else {
        throw new Error(response?.error || 'Failed to save');
      }
    } catch (error) {
      console.error('❌ Save error:', error);
      saveButton.classList.add('error');
      textSpan.textContent = 'Error';
      showToast(error.message || 'Failed to save image', 'error');
      
      setTimeout(() => {
        saveButton.classList.remove('visible', 'saving', 'error');
        textSpan.textContent = 'Save';
      }, 2000);
    }
  });
}

// Show toast notification
function showToast(message, type = 'info') {
  console.log('🔔 Showing toast:', message, type);
  const existingToast = document.querySelector('.kobo-toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  const toast = document.createElement('div');
  toast.className = `kobo-toast kobo-toast-${type}`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => {
    toast.classList.add('visible');
  }, 10);
  
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// No need for inline styles - they're in the CSS file now

// Process all images on the page
function processAllImages() {
  const images = document.querySelectorAll('img');
  console.log(`📸 Found ${images.length} images on the page`);
  
  let processedCount = 0;
  images.forEach((img, index) => {
    console.log(`--- Image ${index + 1}/${images.length} ---`);
    processImage(img);
    processedCount++;
  });
  
  console.log(`✅ Processed ${processedCount} images`);
}

// Wait for images to load before processing
function waitForImages() {
  console.log('⏳ Waiting for page to fully load...');
  
  // Process immediately
  processAllImages();
  
  // Also process after a delay (for lazy-loaded images)
  setTimeout(() => {
    console.log('🔄 Re-processing images after delay...');
    processAllImages();
  }, 2000);
}

// Process images when page loads
if (document.readyState === 'loading') {
  console.log('📄 Document still loading, waiting for DOMContentLoaded');
  document.addEventListener('DOMContentLoaded', waitForImages);
} else {
  console.log('📄 Document already loaded, processing now');
  waitForImages();
}

// Watch for new images added to the page
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeName === 'IMG') {
        console.log('🆕 New image detected via mutation observer');
        processImage(node);
      } else if (node.querySelectorAll) {
        const images = node.querySelectorAll('img');
        if (images.length > 0) {
          console.log(`🆕 ${images.length} new images detected in added node`);
          images.forEach(processImage);
        }
      }
    });
  });
});

// Start observing
console.log('👀 Starting mutation observer');
observer.observe(document.body, {
  childList: true,
  subtree: true
});

console.log('✨ Kobo extension initialized - hover over images to save them!');

})(); // End IIFE