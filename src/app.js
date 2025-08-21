import React, { useEffect, useState } from 'react';
import './app.css';
function App() {
const [targetReady, setTargetReady] = useState(false);
const [viewName, setViewName] = useState('home');
const [products] = useState([
{ id: 1, name: 'Product 1', price: 99.99 },
{ id: 2, name: 'Product 2', price: 149.99 },
{ id: 3, name: 'Product 3', price: 199.99 },
{ id: 4, name: 'Product 4', price: 249.99 }
]);
useEffect(() => {
// Initialize Adobe Target
const initTarget = async () => {
if (window.alloy) {
try {
await window.alloy("configure", {
"edgeConfigId": "YOUR_DATASTREAM_ID",
"orgId": "YOUR_ORG_ID@AdobeOrg",
"debugEnabled": true,
"defaultConsent": "in"
});
console.log('✅ Adobe Target initialized');
setTargetReady(true);
// Track initial view
trackView('home');
} catch (error) {
console.log('⚠️ Adobe Target not configured - running in demo mode');
setTargetReady(true);
}
} else {
console.log('ℹ️ Running without Adobe Target');
setTargetReady(true);
}
};
initTarget();
}, []);
const trackView = async (view) => {
setViewName(view);
if (window.alloy) {
try {
await window.alloy("sendEvent", {
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
} catch (error) {
console.log('View tracking skipped:', error);
}
}
};
const handleNavClick = (view) => {
trackView(view);
};
if (!targetReady) {
return (
<div className="loading">
<h2>Loading Adobe Target...</h2>
<div className="spinner"></div>
</div>
);
}
return (
<div className="app">
{/* Navigation */}
<nav className="navbar">
<div className="nav-brand">🛍 Adobe Target Demo Store</div>
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
<button className="add-to-cart">Add to Cart</button>
</div>
))}
</div>
<div className="load-more-container">
<button
onClick={() => {
console.log('📊 View tracked: products-page-2');
alert('Load more clicked - tracks as "products-page-2" view');
}}
>
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
<span>Current View: <strong>{viewName}</strong></span>
<span>Adobe Target: <strong>{window.alloy ? '🟢 Ready' : '🔵 Demo Mode'}</strong></span>
</div>
</div>
);
}
export default App;
