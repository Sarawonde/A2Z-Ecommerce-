import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { api, getSession, saveSession, uploadImage } from './api';
import './App.css';

const StoreContext = createContext(null);
const money = (value) => new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(value);
const productPrice = (product) => product.salePrice ?? Math.round(product.price * (1 - (product.discountPercent || 0) / 100) * 100) / 100;

function StoreProvider({ children }) {
  const [session, setSessionState] = useState(getSession());
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({ items: [] });
  const [wishlist, setWishlist] = useState({ products: [] });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const setSession = (value) => { saveSession(value); setSessionState(value); };
  const loadProducts = async () => { const data = await api('/products'); setProducts(data.products); };
  const loadCart = async () => {
    if (!session) return setCart({ items: [] });
    try { setCart((await api('/cart')).cart); } catch { setCart({ items: [] }); }
  };

  useEffect(() => { Promise.all([loadProducts(), api('/categories').then((data) => setCategories(data.categories))]).finally(() => setLoading(false)); }, []);
  useEffect(() => {
    if (!session) { setCart({ items: [] }); setWishlist({ products: [] }); return; }
    api('/cart').then((data) => setCart(data.cart)).catch(() => setCart({ items: [] }));
    api('/wishlist').then((data) => setWishlist(data.wishlist || { products: [] })).catch(() => setWishlist({ products: [] }));
  }, [session]);

  const login = async (email, password) => { const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); setSession(data); return data; };
  const register = async (name, email, password) => { const data = await api('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }); setSession(data); };
  const logout = () => setSession(null);
  const addToCart = async (productId, quantity = 1, variant = '') => { setCart((await api('/cart/items', { method: 'POST', body: JSON.stringify({ productId, quantity, variant }) })).cart); };
  const updateCart = async (itemId, quantity) => { setCart((await api(`/cart/items/${itemId}`, { method: 'PUT', body: JSON.stringify({ quantity }) })).cart); };
  const removeFromCart = async (itemId) => { setCart((await api(`/cart/items/${itemId}`, { method: 'DELETE' })).cart); };
  const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const toggleWishlist = async (productId) => {
    const exists = wishlist.products.some((product) => product._id === productId);
    const previous = wishlist;
    const product = products.find((item) => item._id === productId);
    setWishlist({ products: exists ? wishlist.products.filter((item) => item._id !== productId) : [...wishlist.products, product].filter(Boolean) });
    try {
      const data = await api(`/wishlist/${productId}`, { method: exists ? 'DELETE' : 'POST' });
      setWishlist(data.wishlist || { products: [] });
      return !exists;
    } catch (error) {
      setWishlist(previous);
      throw error;
    }
  };

  const value = { session, products, cart, wishlist, categories, loading, login, register, logout, addToCart, updateCart, removeFromCart, loadProducts, loadCart, toggleWishlist, cartCount };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

const useStore = () => useContext(StoreContext);

function Layout({ children }) {
  const { session, logout, cartCount } = useStore();
  return <><header className="top"><Link className="brand" to="/">A-to-Z</Link><nav><Link to="/shop">Shop</Link>{session && <><Link to="/wishlist">Wishlist</Link><Link to="/account">Account</Link></>}{['seller', 'admin'].includes(session?.user.role) && <Link to="/seller">Seller</Link>}{session?.user.role === 'admin' && <Link to="/admin">Admin</Link>}<Link to="/cart">Cart <span className="badge">{cartCount}</span></Link>{session ? <button className="link-button" onClick={logout}>Log out</button> : <><Link to="/login">Log in</Link><Link className="nav-signup" to="/register">Create account</Link></>}</nav></header><main>{children}</main><footer><strong>A-to-Z Market</strong><span>Fresh products, secure checkout, local service.</span><span>© 2025 A-to-Z</span></footer></>;
}

function Notice({ error, success }) { return <>{error && <p className="notice error">{error}</p>}{success && <p className="notice success">{success}</p>}</>; }

function ProductCard({ product }) {
  const { session, addToCart, wishlist, toggleWishlist } = useStore();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const add = async () => { if (!session) return navigate('/login'); if (product.variants?.length) return navigate(`/products/${product._id}`); try { await addToCart(product._id); setMessage('Added'); } catch (e) { setMessage(e.message); } };
  const wished = wishlist.products.some((item) => item._id === product._id);
  const save = async () => { if (!session) return navigate('/login'); try { const saved = await toggleWishlist(product._id); setMessage(saved ? 'Saved to wishlist' : 'Removed from wishlist'); } catch (e) { setMessage(e.message); } };
  return <article className="card"><button type="button" className={`heart ${wished ? 'active' : ''}`} aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'} title={wished ? 'Remove from wishlist' : 'Save to wishlist'} onClick={save}>{wished ? '♥' : '♡'}</button><Link to={`/products/${product._id}`}><img src={product.image} alt={product.name}/><p className="eyebrow">{product.category}</p><h3>{product.name}</h3></Link><div className="rating">★ {Number(product.averageRating || 0).toFixed(1)} <span>({product.reviewCount || 0})</span></div><p className="price">{money(product.salePrice ?? product.price)} {product.discountPercent > 0 && <><del>{money(product.price)}</del><span className="discount">-{product.discountPercent}%</span></>}</p><p className="muted">{product.stock} in stock</p><button disabled={!product.stock} onClick={add}>{product.stock ? (product.variants?.length ? 'Choose options' : 'Add to cart') : 'Out of stock'}</button>{message && <small>{message}</small>}</article>;
}

function Home() {
  const { products, loading } = useStore();
  return <><section className="hero"><div><p className="eyebrow">Ethiopia’s online market</p><h1>Everything you need,<br/>from A to Z.</h1><p>Shop trusted local sellers, fresh food and everyday essentials in one place.</p><Link className="button" to="/shop">Browse products</Link></div></section><section className="section"><div className="section-title"><div><p className="eyebrow">Hand-picked</p><h2>Featured products</h2></div><Link to="/shop">View all →</Link></div>{loading ? <p>Loading products…</p> : <div className="grid">{products.filter((p) => p.featured).slice(0, 4).map((p) => <ProductCard key={p._id} product={p}/>)}</div>}</section></>;
}

function Shop() {
  const { products, categories: managedCategories, loading } = useStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const categories = ['All', ...new Set([...managedCategories.map((item) => item.name), ...products.map((p) => p.category)])];
  const visible = products.filter((p) => (category === 'All' || p.category === category) && p.name.toLowerCase().includes(query.toLowerCase()));
  return <section className="section"><p className="eyebrow">Catalog</p><h1>Shop all products</h1><div className="filters"><input aria-label="Search products" placeholder="Search products…" value={query} onChange={(e) => setQuery(e.target.value)}/><select value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></div>{loading ? <p>Loading…</p> : visible.length ? <div className="grid">{visible.map((p) => <ProductCard key={p._id} product={p}/>)}</div> : <div className="empty">No products match your search.</div>}</section>;
}

function Wishlist() {
  const { wishlist } = useStore();
  return <section className="section"><p className="eyebrow">Saved items</p><h1>My wishlist</h1>{wishlist.products.length ? <div className="grid">{wishlist.products.map((product) => <ProductCard key={product._id} product={product}/>)}</div> : <div className="empty"><h2>No saved products yet</h2><Link className="button" to="/shop">Explore products</Link></div>}</section>;
}

function ProductDetail() {
  const { id } = useParams(); const { products, session, addToCart } = useStore(); const navigate = useNavigate();
  const product = products.find((p) => p._id === id); const [quantity, setQuantity] = useState(1); const [variant, setVariant] = useState(''); const [error, setError] = useState(''); const [reviews, setReviews] = useState([]); const [related, setRelated] = useState([]); const [review, setReview] = useState({ rating: 5, comment: '' });
  const loadReviews = useCallback(() => api(`/products/${id}/reviews`).then((data) => setReviews(data.reviews)), [id]);
  useEffect(() => { loadReviews(); api(`/products/${id}/related`).then((data) => setRelated(data.products)); }, [id, loadReviews]);
  if (!product) return <section className="section"><div className="empty">Product not found.</div></section>;
  const add = async () => { if (!session) return navigate('/login'); try { await addToCart(id, Number(quantity), variant); navigate('/cart'); } catch (e) { setError(e.message); } };
  const submitReview = async (event) => { event.preventDefault(); try { await api(`/products/${id}/reviews`, { method: 'POST', body: JSON.stringify(review) }); setReview({ rating: 5, comment: '' }); loadReviews(); } catch (e) { setError(e.message); } };
  return <><section className="section product-detail"><img src={product.image} alt={product.name}/><div><p className="eyebrow">{product.category}</p><h1>{product.name}</h1><div className="rating large">★ {Number(product.averageRating || 0).toFixed(1)} <span>({product.reviewCount || 0} reviews)</span></div><p className="price large">{money(product.salePrice ?? product.price)} {product.discountPercent > 0 && <del>{money(product.price)}</del>}</p><p>{product.description}</p><p className="muted">Sold by {product.seller?.name || 'A-to-Z seller'} · {product.stock} available</p>{product.variants?.length > 0 && <label>Choose an option<select required value={variant} onChange={(e) => setVariant(e.target.value)}><option value="">Select…</option>{product.variants.map((item) => <option key={item._id || `${item.name}-${item.value}`} value={`${item.name}: ${item.value}`}>{item.name}: {item.value}</option>)}</select></label>}<div className="quantity"><input type="number" min="1" max={product.stock} value={quantity} onChange={(e) => setQuantity(e.target.value)}/><button onClick={add} disabled={!product.stock || (product.variants?.length && !variant)}>Add to cart</button></div><Notice error={error}/></div></section><section className="section reviews-section"><h2>Customer reviews</h2>{session && <form className="review-form" onSubmit={submitReview}><select value={review.rating} onChange={(e) => setReview({ ...review, rating: Number(e.target.value) })}>{[5,4,3,2,1].map((value) => <option key={value} value={value}>{value} stars</option>)}</select><textarea required placeholder="Share your experience" value={review.comment} onChange={(e) => setReview({ ...review, comment: e.target.value })}/><button>Submit review</button></form>}<div className="reviews">{reviews.map((item) => <article key={item._id}><strong>{item.user?.name}</strong><span className="rating">{'★'.repeat(item.rating)}{'☆'.repeat(5-item.rating)}</span><p>{item.comment}</p></article>)}</div>{related.length > 0 && <><h2>Related products</h2><div className="grid">{related.map((item) => <ProductCard key={item._id} product={item}/>)}</div></>}</section></>;
}

function AuthPage({ mode }) {
  const { login, register } = useStore(); const navigate = useNavigate(); const [form, setForm] = useState({ name: '', email: '', password: '' }); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e) => { e.preventDefault(); setBusy(true); setError(''); try { if (mode === 'register') await register(form.name, form.email, form.password); else await login(form.email, form.password); navigate('/shop'); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  return <section className="auth"><form onSubmit={submit}><p className="eyebrow">Welcome</p><h1>{mode === 'register' ? 'Create an account' : 'Log in'}</h1>{mode === 'register' && <label>Full name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/></label>}<label>Email<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}/></label><label>Password<input required minLength="6" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}/></label><Notice error={error}/><button disabled={busy}>{busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Log in'}</button>{mode === 'register' ? <p className="auth-switch">Already registered? <Link to="/login">Log in</Link></p> : <div className="register-callout"><strong>New to A-to-Z?</strong><span>Create an account to save a cart and place orders.</span><Link className="secondary-button" to="/register">Create account</Link></div>}</form></section>;
}

function RequireAuth({ children, roles }) { const { session } = useStore(); if (!session) return <Navigate to="/login" replace/>; if (roles && !roles.includes(session.user.role)) return <Navigate to="/" replace/>; return children; }

function Cart() {
  const { cart, updateCart, removeFromCart } = useStore(); const subtotal = cart.items.reduce((sum, item) => sum + (item.product ? productPrice(item.product) : 0) * item.quantity, 0);
  if (!cart.items.length) return <section className="section"><div className="empty"><h2>Your cart is empty</h2><Link className="button" to="/shop">Start shopping</Link></div></section>;
  return <section className="section"><h1>Your cart</h1><div className="checkout-layout"><div className="cart-list">{cart.items.map((item) => <article className="cart-item" key={item._id}><img src={item.product.image} alt=""/><div><Link to={`/products/${item.product._id}`}><h3>{item.product.name}</h3></Link>{item.variant && <p className="muted">{item.variant}</p>}<p>{money(item.product.salePrice ?? item.product.price)}</p></div><input aria-label="Quantity" type="number" min="1" max={item.product.stock} value={item.quantity} onChange={(e) => updateCart(item._id, Number(e.target.value))}/><button className="danger ghost" onClick={() => removeFromCart(item._id)}>Remove</button></article>)}</div><aside className="summary"><h2>Summary</h2><p><span>Subtotal</span><strong>{money(subtotal)}</strong></p><p><span>Shipping</span><strong>{subtotal >= 1500 ? 'Free' : money(100)}</strong></p><hr/><p><span>Total</span><strong>{money(subtotal + (subtotal >= 1500 ? 0 : 100))}</strong></p><Link className="button full" to="/checkout">Checkout</Link></aside></div></section>;
}

function Checkout() {
  const { cart, loadCart } = useStore(); const navigate = useNavigate(); const [form, setForm] = useState({ fullName: '', address: '', city: 'Addis Ababa', phone: '', paymentMethod: 'cash' }); const [error, setError] = useState('');
  if (!cart.items.length) return <Navigate to="/cart"/>;
  const submit = async (e) => { e.preventDefault(); try { const data = await api('/orders', { method: 'POST', body: JSON.stringify({ shippingAddress: { fullName: form.fullName, address: form.address, city: form.city, phone: form.phone }, paymentMethod: form.paymentMethod }) }); await loadCart(); navigate(`/confirmation/${data.order._id}`); } catch (err) { setError(err.message); } };
  return <section className="auth wide"><form onSubmit={submit}><p className="eyebrow">Secure checkout</p><h1>Delivery details</h1><div className="form-grid"><label>Full name<input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}/></label><label>Phone<input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}/></label><label className="span-2">Address<input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}/></label><label>City<input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}/></label><label>Payment<select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}><option value="cash">Cash on delivery</option><option value="card">Card on delivery</option></select></label></div><Notice error={error}/><button>Place order</button></form></section>;
}

function Confirmation() { const { id } = useParams(); return <section className="section"><div className="empty success-panel"><div className="check">✓</div><h1>Order confirmed</h1><p>Your order <strong>#{id.slice(-8).toUpperCase()}</strong> has been received.</p><Link className="button" to="/account">View my orders</Link></div></section>; }

function Account() {
  const { session } = useStore(); const [orders, setOrders] = useState([]); const [error, setError] = useState('');
  useEffect(() => { api('/orders/mine').then((data) => setOrders(data.orders)).catch((e) => setError(e.message)); }, []);
  return <section className="section"><p className="eyebrow">Account</p><h1>Hello, {session.user.name}</h1><p className="muted">{session.user.email} · {session.user.role}</p><h2>Order history</h2><Notice error={error}/>{orders.length ? <div className="orders">{orders.map((order) => <article key={order._id}><div><strong>#{order._id.slice(-8).toUpperCase()}</strong><p className="muted">{new Date(order.createdAt).toLocaleDateString()}</p></div><span className={`status ${order.status}`}>{order.status}</span><strong>{money(order.total)}</strong></article>)}</div> : <div className="empty">You have not placed an order yet.</div>}</section>;
}

function SellerDashboard() {
  const { categories, loadProducts } = useStore(); const empty = { name: '', description: '', price: '', category: '', stock: '', discountPercent: 0, variants: '' }; const [form, setForm] = useState(empty); const [imageFile, setImageFile] = useState(null); const [editing, setEditing] = useState(null); const [dashboard, setDashboard] = useState({ products: [], orders: [], stats: {} }); const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const load = () => api('/dashboard/seller').then(setDashboard).catch((e) => setError(e.message));
  useEffect(load, []);
  const reset = () => { setForm(empty); setEditing(null); setImageFile(null); };
  const edit = (product) => { setEditing(product); setForm({ name: product.name, description: product.description, price: product.price, category: product.category, stock: product.stock, discountPercent: product.discountPercent || 0, variants: (product.variants || []).map((item) => `${item.name}: ${item.value}`).join(', ') }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const submit = async (event) => { event.preventDefault(); setBusy(true); setError(''); try { let image = editing?.image; if (imageFile) image = (await uploadImage(imageFile)).imageUrl; const variants = form.variants.split(',').map((item) => item.trim()).filter(Boolean).map((item) => { const [name, ...value] = item.split(':'); return { name: name.trim(), value: value.join(':').trim(), stock: Number(form.stock) }; }); const body = { ...form, price: Number(form.price), stock: Number(form.stock), discountPercent: Number(form.discountPercent), variants, image }; await api(editing ? `/products/${editing._id}` : '/products', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(body) }); setMessage(editing ? 'Product updated and sent for approval.' : 'Product created and sent for approval.'); reset(); await Promise.all([load(), loadProducts()]); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const remove = async (product) => { if (!window.confirm(`Delete ${product.name}?`)) return; try { await api(`/products/${product._id}`, { method: 'DELETE' }); await Promise.all([load(), loadProducts()]); } catch (e) { setError(e.message); } };
  return <section className="section dashboard"><p className="eyebrow">Seller dashboard</p><h1>Products and sales</h1><div className="stats-grid"><Stat label="Products" value={dashboard.stats.products}/><Stat label="Orders" value={dashboard.stats.orders}/><Stat label="Sales" value={money(dashboard.stats.salesTotal || 0)}/><Stat label="Low stock" value={dashboard.stats.lowStock}/><Stat label="Awaiting approval" value={dashboard.stats.pendingApproval}/></div><form className="panel seller-form" onSubmit={submit}><div className="section-title"><h2>{editing ? 'Edit product' : 'Add a product'}</h2>{editing && <button type="button" className="ghost danger" onClick={reset}>Cancel editing</button>}</div><div className="form-grid"><label>Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/></label><label>Category<select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="">Choose category</option>{categories.map((item) => <option key={item._id}>{item.name}</option>)}</select></label><label>Price (ETB)<input required type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}/></label><label>Stock<input required type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })}/></label><label>Discount %<input type="number" min="0" max="90" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}/></label><label>Product image<input required={!editing} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setImageFile(e.target.files[0])}/></label><label className="span-2">Variants <span className="muted">Example: Size: Small, Size: Large</span><input value={form.variants} onChange={(e) => setForm({ ...form, variants: e.target.value })}/></label><label className="span-2">Description<textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/></label></div><Notice error={error} success={message}/><button disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create product'}</button></form><div className="panel"><h2>My inventory</h2><div className="table-wrap"><table><thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Discount</th><th>Approval</th><th>Actions</th></tr></thead><tbody>{dashboard.products.map((product) => <tr key={product._id}><td><div className="product-cell"><img src={product.image}/><strong>{product.name}</strong></div></td><td>{money(product.price)}</td><td className={product.stock <= 5 ? 'low-stock' : ''}>{product.stock}</td><td>{product.discountPercent || 0}%</td><td><span className={`status ${product.approvalStatus}`}>{product.approvalStatus}</span></td><td><button className="small" onClick={() => edit(product)}>Edit</button> <button className="small danger ghost" onClick={() => remove(product)}>Delete</button></td></tr>)}</tbody></table></div></div><div className="panel"><h2>Orders containing my products</h2><div className="orders">{dashboard.orders.map((order) => <article key={order._id}><div><strong>#{order._id.slice(-8).toUpperCase()}</strong><p className="muted">{order.user?.name} · {order.items.map((item) => `${item.name} × ${item.quantity}`).join(', ')}</p></div><span className={`status ${order.status}`}>{order.status}</span><strong>{money(order.sellerTotal)}</strong></article>)}</div></div></section>;
}

function Stat({ label, value }) { return <article className="stat"><span>{label}</span><strong>{value ?? 0}</strong></article>; }

function Admin() {
  const [data, setData] = useState({ users: [], products: [], orders: [], stats: {} }); const [error, setError] = useState(''); const [category, setCategory] = useState({ name: '', description: '' }); const [tab, setTab] = useState('approvals');
  const load = () => api('/dashboard/admin').then(setData).catch((e) => setError(e.message));
  useEffect(load, []);
  const updateOrder = async (id, status) => { await api(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); load(); };
  const updateUser = async (id, body) => { try { await api(`/dashboard/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }); load(); } catch (e) { setError(e.message); } };
  const approve = async (id, approvalStatus) => { try { await api(`/dashboard/admin/products/${id}/approval`, { method: 'PATCH', body: JSON.stringify({ approvalStatus }) }); load(); } catch (e) { setError(e.message); } };
  const addCategory = async (event) => { event.preventDefault(); try { await api('/categories', { method: 'POST', body: JSON.stringify(category) }); setCategory({ name: '', description: '' }); } catch (e) { setError(e.message); } };
  const panels = ['approvals', 'users', 'orders', 'inventory', 'categories'];
  return <section className="section dashboard"><p className="eyebrow">Administration</p><h1>Marketplace control center</h1><div className="stats-grid"><Stat label="Sales" value={money(data.stats.salesTotal || 0)}/><Stat label="Orders" value={data.stats.orders}/><Stat label="Users" value={data.stats.users}/><Stat label="Products" value={data.stats.products}/><Stat label="Low stock" value={data.stats.lowStock}/></div><Notice error={error}/><div className="tabs">{panels.map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>)}</div>{tab === 'approvals' && <div className="panel"><h2>Product approvals ({data.stats.pendingProducts || 0})</h2><div className="table-wrap"><table><thead><tr><th>Product</th><th>Seller</th><th>Price</th><th>Status</th><th>Decision</th></tr></thead><tbody>{data.products.filter((product) => product.approvalStatus !== 'approved').map((product) => <tr key={product._id}><td><div className="product-cell"><img src={product.image}/><strong>{product.name}</strong></div></td><td>{product.seller?.name}</td><td>{money(product.price)}</td><td>{product.approvalStatus}</td><td><button className="small" onClick={() => approve(product._id, 'approved')}>Approve</button> <button className="small danger" onClick={() => approve(product._id, 'rejected')}>Reject</button></td></tr>)}</tbody></table></div></div>}{tab === 'users' && <div className="panel"><h2>User management</h2><div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>{data.users.map((user) => <tr key={user._id}><td>{user.name}</td><td>{user.email}</td><td><select value={user.role} onChange={(e) => updateUser(user._id, { role: e.target.value })}>{['customer','seller','admin'].map((role) => <option key={role}>{role}</option>)}</select></td><td>{user.suspended ? 'Suspended' : 'Active'}</td><td><button className={`small ${user.suspended ? '' : 'danger'}`} onClick={() => updateUser(user._id, { suspended: !user.suspended })}>{user.suspended ? 'Restore' : 'Suspend'}</button></td></tr>)}</tbody></table></div></div>}{tab === 'orders' && <div className="panel"><h2>All orders</h2><div className="orders admin-orders">{data.orders.map((order) => <article key={order._id}><div><strong>#{order._id.slice(-8).toUpperCase()}</strong><p className="muted">{order.user?.name} · {order.user?.email}</p></div><strong>{money(order.total)}</strong><select value={order.status} onChange={(e) => updateOrder(order._id, e.target.value)}>{['pending','processing','shipped','delivered','cancelled'].map((status) => <option key={status}>{status}</option>)}</select></article>)}</div></div>}{tab === 'inventory' && <div className="panel"><h2>Inventory and low-stock alerts</h2><div className="table-wrap"><table><thead><tr><th>Product</th><th>Seller</th><th>Stock</th><th>Price</th><th>Rating</th></tr></thead><tbody>{[...data.products].sort((a,b) => a.stock-b.stock).map((product) => <tr key={product._id}><td>{product.name}</td><td>{product.seller?.name}</td><td className={product.stock <= 5 ? 'low-stock' : ''}>{product.stock}</td><td>{money(product.price)}</td><td>★ {product.averageRating.toFixed(1)}</td></tr>)}</tbody></table></div></div>}{tab === 'categories' && <div className="panel"><h2>Add a category</h2><form className="inline-form" onSubmit={addCategory}><input required placeholder="Category name" value={category.name} onChange={(e) => setCategory({ ...category, name: e.target.value })}/><input placeholder="Description" value={category.description} onChange={(e) => setCategory({ ...category, description: e.target.value })}/><button>Add category</button></form></div>}</section>;
}

function NotFound() { return <section className="section"><div className="empty"><h1>Page not found</h1><Link className="button" to="/">Go home</Link></div></section>; }

function App() { return <BrowserRouter><StoreProvider><Layout><Routes><Route path="/" element={<Home/>}/><Route path="/shop" element={<Shop/>}/><Route path="/products/:id" element={<ProductDetail/>}/><Route path="/login" element={<AuthPage mode="login"/>}/><Route path="/register" element={<AuthPage mode="register"/>}/><Route path="/cart" element={<RequireAuth><Cart/></RequireAuth>}/><Route path="/wishlist" element={<RequireAuth><Wishlist/></RequireAuth>}/><Route path="/checkout" element={<RequireAuth><Checkout/></RequireAuth>}/><Route path="/confirmation/:id" element={<RequireAuth><Confirmation/></RequireAuth>}/><Route path="/account" element={<RequireAuth><Account/></RequireAuth>}/><Route path="/seller" element={<RequireAuth roles={['seller','admin']}><SellerDashboard/></RequireAuth>}/><Route path="/sell" element={<Navigate to="/seller" replace/>}/><Route path="/admin" element={<RequireAuth roles={['admin']}><Admin/></RequireAuth>}/><Route path="*" element={<NotFound/>}/></Routes></Layout></StoreProvider></BrowserRouter>; }

export default App;
