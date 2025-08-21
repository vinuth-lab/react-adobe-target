import React, { useEffect, useState, useCallback } from 'react';
import './app.css';

// Configuration - Set to false when you have real Adobe credentials
const DEMO_MODE = false;

// Your Adobe Configuration (replace with real values)
const ADOBE_CONFIG = {
  datastreamId: "a8a449cd-f54b-45c9-a181-6910f019c987",  // Changed from edgeConfigId (deprecated)
  orgId: "8CC867C25245ADC30A490D4C@AdobeOrg",
  debugEnabled: true
};

// Global flag to prevent double configuration (outside component!)
let isAlloyConfigured = false;
let configurationPromise = null;

function App() {
  const [targetReady, setTargetReady] = useState(false);
  const [viewName, setViewName] = useState('home');
  const [targetStatus, setTargetStatus] = useState('initializing');
  
  const [products] = useState([
    { id: 1, name: 'Product 1', price: 99.99 },
    { id: 2, name: 'Product 2', price: 149.99 },
    { id: 3, name: 'Product 3', price: 199.99 },
    { id: 4, name: 'Product 4', price: 249.99 }
  ]);

  // Define trackView using useCallback to prevent re-creation on every render
  const trackView = useCallback(async (view) => {
    setViewName(view);
    
    // Demo mode tracking
    if (DEMO_MODE) {
      console.log(`📊 [Demo] View tracked: ${view}`);
      return;
    }

    // Real Adobe Target tracking
    if (window.alloy && isAlloyConfigured) {
      try {
        const response = await window.alloy("sendEvent", {
          "renderDecisions": true,
          "xdm": {
            "web": {
              "webPageDetails": {
                "viewName": view
              }
            }
          }
        });
        console.log(`📊 View tracked: ${view}`);
        
        // Check for any propositions (personalization content)
        if (response.propositions && response.propositions.length > 0) {
          console.log('🎯 Personalization content received:', response.propositions);
        }
      } catch (error) {
        // Handle specific errors silently or with minimal logging
        if (error.message?.includes('Unauthorized Mbox host')) {
          // Only log this once
          if (!window.mboxHostWarningLogged) {
            console.warn('⚠️ This domain is not authorized in Adobe Target. Add this domain to your allowed hosts:');
            console.warn(`   ${window.location.hostname}`);
            window.mboxHostWarningLogged = true;
          }
        } else {
          console.warn('View tracking error:', error.message);
        }
      }
    }
  }, []); // No dependencies needed since we're using global flag

  useEffect(() => {
    const initTarget = async () => {
      // Demo mode - skip Adobe Target
      if (DEMO_MODE) {
        console.log('🎯 Running in DEMO MODE - No Adobe Target connection');
        setTargetStatus('demo');
        setTargetReady(true);
        trackView('home');
        return;
      }

      // If already configured, just set ready and track view
      if (isAlloyConfigured) {
        console.log('ℹ️ Adobe Target already configured, skipping initialization');
        setTargetStatus('connected');
        setTargetReady(true);
        trackView('home');
        return;
      }

      // If configuration is in progress, wait for it
      if (configurationPromise) {
        console.log('⏳ Waiting for existing configuration to complete...');
        try {
          await configurationPromise;
          setTargetStatus('connected');
          setTargetReady(true);
          trackView('home');
        } catch (error) {
          console.error('Configuration failed:', error);
          setTargetStatus('error');
          setTargetReady(true);
        }
        return;
      }

      // Try to configure Adobe Target (only once!)
      if (window.alloy && !isAlloyConfigured && !configurationPromise) {
        // Create and store the configuration promise
        configurationPromise = window.alloy("configure", {
          "datastreamId": ADOBE_CONFIG.datastreamId,
          "orgId": ADOBE_CONFIG.orgId,
          "debugEnabled": ADOBE_CONFIG.debugEnabled,
          "defaultConsent": "in"
        });

        try {
          await configurationPromise;
          isAlloyConfigured = true;
          console.log('✅ Adobe Target configured successfully');
          setTargetStatus('connected');
          setTargetReady(true);
          
          // Track initial home view
          trackView('home');
        } catch (error) {
          // This should not happen now, but just in case
          if (error.message?.includes('already been configured')) {
            console.log('ℹ️ Adobe Target was already configured (caught in promise)');
            isAlloyConfigured = true;
            setTargetStatus('connected');
            setTargetReady(true);
            trackView('home');
          } else {
            console.warn('⚠️ Adobe Target configuration failed:', error.message);
            setTargetStatus('error');
            setTargetReady(true);
          }
        } finally {
          // Clear the promise after completion
          configurationPromise = null;
        }
      } else if (!window.alloy) {
        console.log('ℹ️ Adobe Alloy not loaded - running without Target');
        setTargetStatus('not-loaded');
        setTargetReady(true);
      }
    };

    initTarget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once

  const handleNavClick = (view) => {
    trackView(view);
  };

  const handleProductClick = (product) => {
    const eventName = `product-clicked-${product.id}`;
    if (DEMO_MODE) {
      console.log(`🛒 [Demo] Event: ${eventName}`);
    } else if (window.alloy && isAlloyConfigured) {
      // Track product interaction
      window.alloy("sendEvent", {
        "xdm": {
          "eventType": "commerce.productViews",
          "commerce": {
            "productViews": {
              "value": 1
            }
          },
          "productListItems": [{
            "SKU": product.id.toString(),
            "name": product.name,
            "priceTotal": product.price
          }]
        }
      }).catch(err => console.log('Product tracking error:', err.message));
    }
    alert(`${product.name} added to cart!`);
  };

  const handleLoadMore = () => {
    trackView('products-page-2');
    alert('Loading more products...');
  };

  // Status indicator component
  const StatusIndicator = () => {
    const statusConfig = {
      'initializing': { icon: '⏳', text: 'Initializing...', color: '#ff9800' },
      'connected': { icon: '🟢', text: 'Connected', color: '#4caf50' },
      'demo': { icon: '🔶', text: 'Demo Mode', color: '#ff9800' },
      'error': { icon: '⚠️', text: 'Error', color: '#f44336' },
      'not-loaded': { icon: '🔴', text: 'Not Loaded', color: '#f44336' }
    };
    
    const status = statusConfig[targetStatus] || statusConfig['error'];
    
    return (
      <span style={{ color: status.color }}>
        {status.icon} {status.text}
      </span>
    );
  };

  if (!targetReady) {
    return (
      <div className="loading">
        <h2>Initializing Adobe Target...</h2>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-brand">🛍️ Adobe Target Demo Store</div>
        <div className="nav-links">
          <button 
            className={viewName === 'home' ? 'active' : ''} 
            onClick={() => handleNavClick('home')}
          >
            Home
          </button>
          <button 
            className={viewName === 'products' ? 'active' : ''} 
            onClick={() => handleNavClick('products')}
          >
            Products
          </button>
          <button 
            className={viewName === 'cart' ? 'active' : ''} 
            onClick={() => handleNavClick('cart')}
          >
            Cart
          </button>
        </div>
      </nav>

      {/* Status Banner - Only show if there's an issue */}
      {(DEMO_MODE || (targetStatus !== 'connected' && targetStatus !== 'initializing')) && (
        <div style={{
          background: targetStatus === 'connected' ? '#d4edda' : '#fff3cd',
          color: targetStatus === 'connected' ? '#155724' : '#856404',
          padding: '0.75rem',
          textAlign: 'center',
          borderBottom: '1px solid #ffeeba'
        }}>
          {DEMO_MODE ? (
            '🎯 DEMO MODE - Adobe Target is disabled. Set DEMO_MODE to false in App.js to enable.'
          ) : targetStatus === 'error' ? (
            '⚠️ Adobe Target configuration error - Check console. App running in fallback mode.'
          ) : targetStatus === 'not-loaded' ? (
            '🔴 Adobe Alloy library not loaded. Check your index.html setup.'
          ) : (
            '✅ Adobe Target is connected and tracking views.'
          )}
        </div>
      )}

      {/* Main Content */}
      <main className="main-content">
        {/* Home View */}
        {viewName === 'home' && (
          <div className="view-home">
            <section className="hero" data-target-zone="hero">
              <h1>Welcome to Our Store</h1>
              <p>Experience personalization with Adobe Target</p>
              <button 
                className="cta-button" 
                onClick={() => handleNavClick('products')}
              >
                Shop Now →
              </button>
            </section>

            <section className="features">
              <div className="feature-card">
                <h3>🎯 A/B Testing</h3>
                <p>Test different experiences</p>
              </div>
              <div className="feature-card">
                <h3>🔄 Personalization</h3>
                <p>Deliver targeted content</p>
              </div>
              <div className="feature-card">
                <h3>📊 Analytics</h3>
                <p>Track user behavior</p>
              </div>
            </section>

            {/* Integration Status Panel */}
            <section style={{ 
              marginTop: '2rem', 
              padding: '1.5rem', 
              background: '#f8f9fa', 
              borderRadius: '8px',
              border: '1px solid #dee2e6'
            }}>
              <h3>📋 Adobe Target Integration Status</h3>
              <div style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem' }}>
                <div>Status: <StatusIndicator /></div>
                <div>Current View: <strong>{viewName}</strong></div>
                <div>Alloy Library: <strong>{window.alloy ? '✅ Loaded' : '❌ Not Found'}</strong></div>
                <div>Configuration: <strong>{isAlloyConfigured ? '✅ Complete' : '⏳ Pending'}</strong></div>
                <div>Domain: <code>{window.location.hostname}</code></div>
              </div>
              
              {targetStatus === 'connected' && (
                <div style={{ 
                  marginTop: '1rem', 
                  padding: '1rem', 
                  background: '#d4edda', 
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  color: '#155724'
                }}>
                  <strong>✅ Successfully Connected!</strong>
                  <p style={{ margin: '0.5rem 0 0 0' }}>
                    Adobe Target is tracking views. Check the browser console for tracking events.
                    If you see "Unauthorized Mbox host" errors, add <code>{window.location.hostname}</code> to your Adobe Target allowed hosts.
                  </p>
                </div>
              )}
              
              {targetStatus === 'error' && (
                <div style={{ 
                  marginTop: '1rem', 
                  padding: '1rem', 
                  background: '#f8d7da', 
                  borderRadius: '4px',
                  fontSize: '0.9rem'
                }}>
                  <strong>Troubleshooting:</strong>
                  <ol style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.5rem' }}>
                    <li>Check console for specific error messages</li>
                    <li>Verify your Adobe credentials are correct</li>
                    <li>Ensure this domain is whitelisted in Adobe Target</li>
                  </ol>
                </div>
              )}
            </section>
          </div>
        )}

        {/* Products View */}
        {viewName === 'products' && (
          <div className="view-products">
            <h1>Our Products</h1>
            <div className="product-grid" data-target-zone="products">
              {products.map(product => (
                <div key={product.id} className="product-card">
                  <div className="product-image"></div>
                  <h3>{product.name}</h3>
                  <p className="price">${product.price}</p>
                  <button 
                    className="add-to-cart"
                    onClick={() => handleProductClick(product)}
                  >
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>
            <div className="load-more-container">
              <button onClick={handleLoadMore}>
                Load More Products
              </button>
            </div>
          </div>
        )}

        {/* Cart View */}
        {viewName === 'cart' && (
          <div className="view-cart">
            <h1>Shopping Cart</h1>
            <div className="cart-content">
              <div className="empty-cart">
                <p>Your cart is empty</p>
                <button 
                  className="cta-button"
                  onClick={() => handleNavClick('products')}
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Status Bar */}
      <div className="status-bar">
        <span>View: <strong>{viewName}</strong></span>
        <span>Adobe Target: <StatusIndicator /></span>
        <span>Events: Check console (F12)</span>
      </div>
    </div>
  );
}

export default App;import React, { useEffect, useState, useCallback } from 'react';
import './app.css';

// Configuration - Set to false when you have real Adobe credentials
const DEMO_MODE = false;

// Your Adobe Configuration (replace with real values)
const ADOBE_CONFIG = {
  datastreamId: "a8a449cd-f54b-45c9-a181-6910f019c987",  // Changed from edgeConfigId (deprecated)
  orgId: "8CC867C25245ADC30A490D4C@AdobeOrg",
  debugEnabled: true
};

// Global flag to prevent double configuration (outside component!)
let isAlloyConfigured = false;
let configurationPromise = null;

function App() {
  const [targetReady, setTargetReady] = useState(false);
  const [viewName, setViewName] = useState('home');
  const [targetStatus, setTargetStatus] = useState('initializing');
  
  const [products] = useState([
    { id: 1, name: 'Product 1', price: 99.99 },
    { id: 2, name: 'Product 2', price: 149.99 },
    { id: 3, name: 'Product 3', price: 199.99 },
    { id: 4, name: 'Product 4', price: 249.99 }
  ]);

  // Define trackView using useCallback to prevent re-creation on every render
  const trackView = useCallback(async (view) => {
    setViewName(view);
    
    // Demo mode tracking
    if (DEMO_MODE) {
      console.log(`📊 [Demo] View tracked: ${view}`);
      return;
    }

    // Real Adobe Target tracking
    if (window.alloy && isAlloyConfigured) {
      try {
        const response = await window.alloy("sendEvent", {
          "renderDecisions": true,
          "xdm": {
            "web": {
              "webPageDetails": {
                "viewName": view
              }
            }
          }
        });
        console.log(`📊 View tracked: ${view}`);
        
        // Check for any propositions (personalization content)
        if (response.propositions && response.propositions.length > 0) {
          console.log('🎯 Personalization content received:', response.propositions);
        }
      } catch (error) {
        // Handle specific errors silently or with minimal logging
        if (error.message?.includes('Unauthorized Mbox host')) {
          // Only log this once
          if (!window.mboxHostWarningLogged) {
            console.warn('⚠️ This domain is not authorized in Adobe Target. Add this domain to your allowed hosts:');
            console.warn(`   ${window.location.hostname}`);
            window.mboxHostWarningLogged = true;
          }
        } else {
          console.warn('View tracking error:', error.message);
        }
      }
    }
  }, []); // No dependencies needed since we're using global flag

  useEffect(() => {
    const initTarget = async () => {
      // Demo mode - skip Adobe Target
      if (DEMO_MODE) {
        console.log('🎯 Running in DEMO MODE - No Adobe Target connection');
        setTargetStatus('demo');
        setTargetReady(true);
        trackView('home');
        return;
      }

      // If already configured, just set ready and track view
      if (isAlloyConfigured) {
        console.log('ℹ️ Adobe Target already configured, skipping initialization');
        setTargetStatus('connected');
        setTargetReady(true);
        trackView('home');
        return;
      }

      // If configuration is in progress, wait for it
      if (configurationPromise) {
        console.log('⏳ Waiting for existing configuration to complete...');
        try {
          await configurationPromise;
          setTargetStatus('connected');
          setTargetReady(true);
          trackView('home');
        } catch (error) {
          console.error('Configuration failed:', error);
          setTargetStatus('error');
          setTargetReady(true);
        }
        return;
      }

      // Try to configure Adobe Target (only once!)
      if (window.alloy && !isAlloyConfigured && !configurationPromise) {
        // Create and store the configuration promise
        configurationPromise = window.alloy("configure", {
          "datastreamId": ADOBE_CONFIG.datastreamId,
          "orgId": ADOBE_CONFIG.orgId,
          "debugEnabled": ADOBE_CONFIG.debugEnabled,
          "defaultConsent": "in"
        });

        try {
          await configurationPromise;
          isAlloyConfigured = true;
          console.log('✅ Adobe Target configured successfully');
          setTargetStatus('connected');
          setTargetReady(true);
          
          // Track initial home view
          trackView('home');
        } catch (error) {
          // This should not happen now, but just in case
          if (error.message?.includes('already been configured')) {
            console.log('ℹ️ Adobe Target was already configured (caught in promise)');
            isAlloyConfigured = true;
            setTargetStatus('connected');
            setTargetReady(true);
            trackView('home');
          } else {
            console.warn('⚠️ Adobe Target configuration failed:', error.message);
            setTargetStatus('error');
            setTargetReady(true);
          }
        } finally {
          // Clear the promise after completion
          configurationPromise = null;
        }
      } else if (!window.alloy) {
        console.log('ℹ️ Adobe Alloy not loaded - running without Target');
        setTargetStatus('not-loaded');
        setTargetReady(true);
      }
    };

    initTarget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once

  const handleNavClick = (view) => {
    trackView(view);
  };

  const handleProductClick = (product) => {
    const eventName = `product-clicked-${product.id}`;
    if (DEMO_MODE) {
      console.log(`🛒 [Demo] Event: ${eventName}`);
    } else if (window.alloy && isAlloyConfigured) {
      // Track product interaction
      window.alloy("sendEvent", {
        "xdm": {
          "eventType": "commerce.productViews",
          "commerce": {
            "productViews": {
              "value": 1
            }
          },
          "productListItems": [{
            "SKU": product.id.toString(),
            "name": product.name,
            "priceTotal": product.price
          }]
        }
      }).catch(err => console.log('Product tracking error:', err.message));
    }
    alert(`${product.name} added to cart!`);
  };

  const handleLoadMore = () => {
    trackView('products-page-2');
    alert('Loading more products...');
  };

  // Status indicator component
  const StatusIndicator = () => {
    const statusConfig = {
      'initializing': { icon: '⏳', text: 'Initializing...', color: '#ff9800' },
      'connected': { icon: '🟢', text: 'Connected', color: '#4caf50' },
      'demo': { icon: '🔶', text: 'Demo Mode', color: '#ff9800' },
      'error': { icon: '⚠️', text: 'Error', color: '#f44336' },
      'not-loaded': { icon: '🔴', text: 'Not Loaded', color: '#f44336' }
    };
    
    const status = statusConfig[targetStatus] || statusConfig['error'];
    
    return (
      <span style={{ color: status.color }}>
        {status.icon} {status.text}
      </span>
    );
  };

  if (!targetReady) {
    return (
      <div className="loading">
        <h2>Initializing Adobe Target...</h2>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-brand">🛍️ Adobe Target Demo Store</div>
        <div className="nav-links">
          <button 
            className={viewName === 'home' ? 'active' : ''} 
            onClick={() => handleNavClick('home')}
          >
            Home
          </button>
          <button 
            className={viewName === 'products' ? 'active' : ''} 
            onClick={() => handleNavClick('products')}
          >
            Products
          </button>
          <button 
            className={viewName === 'cart' ? 'active' : ''} 
            onClick={() => handleNavClick('cart')}
          >
            Cart
          </button>
        </div>
      </nav>

      {/* Status Banner - Only show if there's an issue */}
      {(DEMO_MODE || (targetStatus !== 'connected' && targetStatus !== 'initializing')) && (
        <div style={{
          background: targetStatus === 'connected' ? '#d4edda' : '#fff3cd',
          color: targetStatus === 'connected' ? '#155724' : '#856404',
          padding: '0.75rem',
          textAlign: 'center',
          borderBottom: '1px solid #ffeeba'
        }}>
          {DEMO_MODE ? (
            '🎯 DEMO MODE - Adobe Target is disabled. Set DEMO_MODE to false in App.js to enable.'
          ) : targetStatus === 'error' ? (
            '⚠️ Adobe Target configuration error - Check console. App running in fallback mode.'
          ) : targetStatus === 'not-loaded' ? (
            '🔴 Adobe Alloy library not loaded. Check your index.html setup.'
          ) : (
            '✅ Adobe Target is connected and tracking views.'
          )}
        </div>
      )}

      {/* Main Content */}
      <main className="main-content">
        {/* Home View */}
        {viewName === 'home' && (
          <div className="view-home">
            <section className="hero" data-target-zone="hero">
              <h1>Welcome to Our Store</h1>
              <p>Experience personalization with Adobe Target</p>
              <button 
                className="cta-button" 
                onClick={() => handleNavClick('products')}
              >
                Shop Now →
              </button>
            </section>

            <section className="features">
              <div className="feature-card">
                <h3>🎯 A/B Testing</h3>
                <p>Test different experiences</p>
              </div>
              <div className="feature-card">
                <h3>🔄 Personalization</h3>
                <p>Deliver targeted content</p>
              </div>
              <div className="feature-card">
                <h3>📊 Analytics</h3>
                <p>Track user behavior</p>
              </div>
            </section>

            {/* Integration Status Panel */}
            <section style={{ 
              marginTop: '2rem', 
              padding: '1.5rem', 
              background: '#f8f9fa', 
              borderRadius: '8px',
              border: '1px solid #dee2e6'
            }}>
              <h3>📋 Adobe Target Integration Status</h3>
              <div style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem' }}>
                <div>Status: <StatusIndicator /></div>
                <div>Current View: <strong>{viewName}</strong></div>
                <div>Alloy Library: <strong>{window.alloy ? '✅ Loaded' : '❌ Not Found'}</strong></div>
                <div>Configuration: <strong>{isAlloyConfigured ? '✅ Complete' : '⏳ Pending'}</strong></div>
                <div>Domain: <code>{window.location.hostname}</code></div>
              </div>
              
              {targetStatus === 'connected' && (
                <div style={{ 
                  marginTop: '1rem', 
                  padding: '1rem', 
                  background: '#d4edda', 
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  color: '#155724'
                }}>
                  <strong>✅ Successfully Connected!</strong>
                  <p style={{ margin: '0.5rem 0 0 0' }}>
                    Adobe Target is tracking views. Check the browser console for tracking events.
                    If you see "Unauthorized Mbox host" errors, add <code>{window.location.hostname}</code> to your Adobe Target allowed hosts.
                  </p>
                </div>
              )}
              
              {targetStatus === 'error' && (
                <div style={{ 
                  marginTop: '1rem', 
                  padding: '1rem', 
                  background: '#f8d7da', 
                  borderRadius: '4px',
                  fontSize: '0.9rem'
                }}>
                  <strong>Troubleshooting:</strong>
                  <ol style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.5rem' }}>
                    <li>Check console for specific error messages</li>
                    <li>Verify your Adobe credentials are correct</li>
                    <li>Ensure this domain is whitelisted in Adobe Target</li>
                  </ol>
                </div>
              )}
            </section>
          </div>
        )}

        {/* Products View */}
        {viewName === 'products' && (
          <div className="view-products">
            <h1>Our Products</h1>
            <div className="product-grid" data-target-zone="products">
              {products.map(product => (
                <div key={product.id} className="product-card">
                  <div className="product-image"></div>
                  <h3>{product.name}</h3>
                  <p className="price">${product.price}</p>
                  <button 
                    className="add-to-cart"
                    onClick={() => handleProductClick(product)}
                  >
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>
            <div className="load-more-container">
              <button onClick={handleLoadMore}>
                Load More Products
              </button>
            </div>
          </div>
        )}

        {/* Cart View */}
        {viewName === 'cart' && (
          <div className="view-cart">
            <h1>Shopping Cart</h1>
            <div className="cart-content">
              <div className="empty-cart">
                <p>Your cart is empty</p>
                <button 
                  className="cta-button"
                  onClick={() => handleNavClick('products')}
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Status Bar */}
      <div className="status-bar">
        <span>View: <strong>{viewName}</strong></span>
        <span>Adobe Target: <StatusIndicator /></span>
        <span>Events: Check console (F12)</span>
      </div>
    </div>
  );
}

export default App;
