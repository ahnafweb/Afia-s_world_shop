const state = { cart: read('afiaCart', []), wishlist: read('afiaWishlist', []), user: read('afiaUser', null), token: localStorage.getItem('afiaToken'), category: 'All', productsCache: [] };
function read(k,f){try{return JSON.parse(localStorage.getItem(k)) ?? f}catch{return f}}
const money=n=>`৳${Number(n||0).toLocaleString('en-BD')}`;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
function toast(m){let x=document.getElementById('toast');if(!x){x=document.createElement('div');x.id='toast';x.className='toast';document.body.appendChild(x)}x.textContent=m;x.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>x.classList.remove('show'),2200)}
async function apiFetch(endpoint,opt={},silent=false){const h={'Content-Type':'application/json',...(opt.headers||{})};if(state.token)h.Authorization=`Bearer ${state.token}`;try{const r=await fetch(`/api${endpoint}`,{...opt,headers:h});const t=await r.text();let d={};try{d=JSON.parse(t)}catch{d={error:t}}if(!r.ok){if(r.status===401&&state.token&&endpoint!=='/auth/login')clearAuth();if(!silent)toast(d.error||'Request failed');return null}return d}catch(e){if(!silent)toast('Cannot connect to server');console.error(e);return null}}
function persist(){localStorage.setItem('afiaCart',JSON.stringify(state.cart));localStorage.setItem('afiaWishlist',JSON.stringify(state.wishlist));updateCounts()}
function updateCounts(){document.querySelectorAll('#cartCount').forEach(e=>e.textContent=state.cart.reduce((s,i)=>s+Number(i.qty),0));document.querySelectorAll('#wishCount').forEach(e=>e.textContent=state.wishlist.length)}
function toggleSearch(){const x=document.getElementById('searchBox');if(x){x.classList.toggle('hidden');if(!x.classList.contains('hidden'))document.getElementById('searchInput')?.focus()}}
function toggleMobileMenu(){document.getElementById('mobileNav')?.classList.toggle('hidden')}

// Theme Management
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.innerHTML = '';
    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
    btn.appendChild(icon);
    if (window.lucide) lucide.createIcons();
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  setTheme(current === 'dark' ? 'light' : 'dark');
}

function productVisual(p){return `<span class="product-visual" aria-hidden="true">${({Fashion:'👜',Gadgets:'◉',Home:'⌂',Accessories:'✦'})[p.category]||'✦'}</span>`}
function productCard(p){const liked=state.wishlist.includes(p.id),sold=Number(p.stock)<=0;return `<article class="product-card" onclick="openProduct(${p.id})" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openProduct(${p.id})}"><div class="product-image">${p.image?`<img loading="lazy" src="${esc(p.image)}" alt="${esc(p.name)}">`:productVisual(p)}<span class="badge">${esc(p.category)}</span>${sold?'<span class="stock-pill">Sold out</span>':''}</div><div class="product-info"><p class="category">${esc(p.category)}</p><h3>${esc(p.name)}</h3><p class="price">${money(p.price)}</p><div class="product-actions"><button class="add-btn" ${sold?'disabled':''} onclick="event.stopPropagation();addToCart(${p.id})">${sold?'Sold out':'Add to cart'}</button><button class="wish-btn ${liked?'liked':''}" onclick="event.stopPropagation();toggleWishlist(${p.id})"><i data-lucide="heart"></i></button></div></div></article>`}

function openProduct(id){ location.href=`product.html?id=${encodeURIComponent(id)}`; }
function stars(rating){const n=Math.max(0,Math.min(5,Math.round(Number(rating)||0)));return `<span class="stars" aria-label="${n} out of 5 stars">${'★'.repeat(n)}${'☆'.repeat(5-n)}</span>`}
function formatReviewDate(v){const d=new Date(v);return Number.isNaN(d.getTime())?'':d.toLocaleDateString('en-BD',{year:'numeric',month:'short',day:'numeric'})}
async function renderProductDetail(){
  const root=document.getElementById('productDetail'); if(!root)return;
  const id=new URLSearchParams(location.search).get('id'); if(!id){root.innerHTML='<div class="empty">Product not found.</div>';return;}
  root.innerHTML='<div class="empty">Loading product…</div>';
  const p=await apiFetch(`/products/${encodeURIComponent(id)}`,{},true);
  if(!p){root.innerHTML='<div class="empty">Product not found.</div>';return;}
  document.title=`${p.name} | Afia's World`;
  const reviews=await apiFetch(`/reviews/${encodeURIComponent(id)}`,{},true)||{summary:{count:0,average:0},reviews:[]};
  const sold=Number(p.stock)<=0;
  root.innerHTML=`<div class="product-detail-grid"><div class="detail-image">${p.image?`<img src="${esc(p.image)}" alt="${esc(p.name)}">`:productVisual(p)}</div><div class="detail-info"><p class="eyebrow">${esc(p.category)}</p><h1>${esc(p.name)}</h1><div class="detail-rating">${stars(reviews.summary.average)} <span>${Number(reviews.summary.average||0).toFixed(1)} · ${reviews.summary.count||0} review${Number(reviews.summary.count)===1?'':'s'}</span></div><p class="detail-price">${money(p.price)}</p><p class="detail-description">${esc(p.description||'No description available.')}</p><p class="stock-text">${sold?'Currently sold out':`${Number(p.stock)} in stock`}</p><button class="btn" ${sold?'disabled':''} onclick="addToCart(${p.id})">${sold?'Sold out':'Add to cart →'}</button></div></div><section class="reviews-section"><div class="section-title"><div><p class="eyebrow">Customer feedback</p><h2>Reviews</h2></div><div class="review-summary">${stars(reviews.summary.average)} <strong>${Number(reviews.summary.average||0).toFixed(1)}</strong> <span>${reviews.summary.count||0} review${Number(reviews.summary.count)===1?'':'s'}</span></div></div><div id="reviewFormArea"></div><div id="reviewsList">${renderReviewsHtml(reviews.reviews)}</div></section>`;
  renderReviewForm(p.id,reviews.reviews);
  if(window.lucide)lucide.createIcons();
}
function renderReviewsHtml(list){if(!list?.length)return '<div class="empty">No reviews yet. Be the first to review this product.</div>';return list.map(r=>`<article class="review-card"><div class="review-head"><div><strong>${esc(r.user_name)}</strong><div>${stars(r.rating)}</div></div><small>${formatReviewDate(r.created_at)}</small></div>${r.title?`<h3>${esc(r.title)}</h3>`:''}<p>${esc(r.comment)}</p></article>`).join('')}
function renderReviewForm(productId,reviews){const el=document.getElementById('reviewFormArea');if(!el)return;const mine=state.user&&reviews?.some(r=>Number(r.user_id)===Number(state.user.id));if(!state.user){el.innerHTML='<div class="review-login">Please <a href="login.html">log in</a> to write a review.</div>';return}if(mine){el.innerHTML='<div class="review-login">You have already reviewed this product.</div>';return}el.innerHTML=`<form class="review-form" onsubmit="submitReview(event,${productId})"><h3>Write a review</h3><div class="rating-input" role="radiogroup" aria-label="Rating"><label>Rating</label><div>${[1,2,3,4,5].map(n=>`<button type="button" class="rating-star" data-rating="${n}" onclick="selectRating(${n})" aria-label="${n} star${n>1?'s':''}">★</button>`).join('')}</div><input type="hidden" id="reviewRating" value="5"></div><input id="reviewTitle" maxlength="100" placeholder="Review title (optional)"><textarea id="reviewComment" maxlength="1000" minlength="3" required placeholder="Share your experience…"></textarea><button class="btn" type="submit">Submit review →</button><small>Reviews are available after a delivered order.</small></form>`;selectRating(5)}
function selectRating(n){document.getElementById('reviewRating')?.setAttribute('value',String(n));document.querySelectorAll('.rating-star').forEach(b=>b.classList.toggle('selected',Number(b.dataset.rating)<=n))}
async function submitReview(e,productId){e.preventDefault();const b=e.target.querySelector('button[type=submit]');b.disabled=true;b.textContent='Submitting…';const d=await apiFetch(`/reviews/${productId}`,{method:'POST',body:JSON.stringify({rating:Number(document.getElementById('reviewRating').value),title:document.getElementById('reviewTitle').value.trim(),comment:document.getElementById('reviewComment').value.trim()})});if(d){toast('Review submitted');await renderProductDetail()}else{b.disabled=false;b.textContent='Submit review →'}}
async function fetchProducts(q=''){const d=await apiFetch(`/products${q?`?${q}`:''}`,{},true);return Array.isArray(d)?d:[]}
async function renderProducts(target,opt={}){const el=document.getElementById(target);if(!el)return;el.innerHTML='<div class="empty">Loading products…</div>';let p;if(opt.wishlistIds){p=state.productsCache.length?state.productsCache:await fetchProducts();p=p.filter(x=>opt.wishlistIds.includes(x.id))}else{const q=new URLSearchParams();if(opt.category&&opt.category!=='All')q.set('category',opt.category);if(opt.featured)q.set('featured','true');if(opt.q)q.set('q',opt.q);p=await fetchProducts(q.toString())}if(!state.productsCache.length)state.productsCache=p;el.innerHTML=p.length?p.map(productCard).join(''):`<div class="empty">${opt.wishlistIds?'Your wishlist is empty.':'No products found.'}</div>`;if(window.lucide) lucide.createIcons()}
function addToCart(id){const item=state.cart.find(x=>x.id===id);if(item)item.qty++;else state.cart.push({id,qty:1});persist();toast('Added to cart')}
function toggleWishlist(id){state.wishlist=state.wishlist.includes(id)?state.wishlist.filter(x=>x!==id):[...state.wishlist,id];persist();renderProducts('featuredProducts',{featured:true});renderProducts('shopProducts',{category:state.category});renderProducts('wishlistProducts',{wishlistIds:state.wishlist});toast(state.wishlist.includes(id)?'Saved to wishlist':'Removed from wishlist')}
function filterCategory(cat,btn){state.category=cat;document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));btn?.classList.add('active');const p=new URLSearchParams(location.search);p.set('category',cat);history.replaceState({},'',`${location.pathname}?${p}`);renderProducts('shopProducts',{category:cat})}
let searchTimer;function searchProducts(){clearTimeout(searchTimer);searchTimer=setTimeout(()=>renderProducts('shopProducts',{q:document.getElementById('searchInput')?.value.trim()||''}),250)}
function changeQty(id,d){const i=state.cart.find(x=>x.id===id);if(!i)return;i.qty+=d;if(i.qty<=0)state.cart=state.cart.filter(x=>x.id!==id);persist();renderCart()}
function removeFromCart(id){state.cart=state.cart.filter(x=>x.id!==id);persist();renderCart()}
async function renderCart(){const el=document.getElementById('cartItems'),tot=document.getElementById('cartTotal');if(!el)return;if(!state.cart.length){el.innerHTML='<div class="empty">Your cart is empty.<br><br><a class="btn" href="shop.html">Explore shop →</a></div>';if(tot)tot.innerHTML='';return}const ps=await fetchProducts();let total=0;const html=state.cart.map(i=>{const p=ps.find(x=>x.id===i.id);if(!p)return '';total+=p.price*i.qty;return `<div class="cart-row"><div class="cart-thumb">${p.image?`<img src="${esc(p.image)}" alt="">`:productVisual(p)}</div><div><div class="cart-name">${esc(p.name)}</div><div class="cart-meta">${money(p.price)} each</div></div><div class="qty"><button onclick="changeQty(${p.id},-1)">−</button><span>${i.qty}</span><button onclick="changeQty(${p.id},1)">+</button></div><button class="remove" onclick="removeFromCart(${p.id})">Remove</button></div>`}).join('');el.innerHTML=html||'<div class="empty">Cart items are unavailable.</div>';if(tot)tot.innerHTML=`<div><span>Total</span><strong>${money(total)}</strong></div><a class="btn" href="checkout.html">Continue to checkout →</a>`;if(window.lucide) lucide.createIcons()}
async function renderCheckoutSummary(){const e=document.getElementById('summaryItems'),t=document.getElementById('summaryTotal');if(!e)return;const ps=await fetchProducts();let total=0;e.innerHTML=state.cart.map(i=>{const p=ps.find(x=>x.id===i.id);if(!p)return '';const n=p.price*i.qty;total+=n;return `<div class="summary-item"><span>${esc(p.name)} × ${i.qty}</span><strong>${money(n)}</strong></div>`}).join('')||'<p class="cart-meta">Your cart is empty.</p>';t.innerHTML=total?`<span>Total</span><span>${money(total)}</span>`:''}
async function handleCheckout(e){e.preventDefault();if(!state.user){location.href='login.html';return}if(!state.cart.length){toast('Your cart is empty');return}const b=e.target.querySelector('button[type=submit]');b.disabled=true;b.textContent='Placing order…';const body={items:state.cart.map(i=>({product_id:i.id,quantity:i.qty})),customer_name:document.getElementById('customer_name').value.trim(),phone:document.getElementById('phone').value.trim(),address:document.getElementById('address').value.trim(),notes:document.getElementById('notes').value.trim()};const d=await apiFetch('/orders',{method:'POST',body:JSON.stringify(body)});if(d){state.cart=[];persist();toast('Order placed');setTimeout(()=>location.href='orders.html',500)}else{b.disabled=false;b.textContent='Place order →'}}
function clearAuth(){localStorage.removeItem('afiaUser');localStorage.removeItem('afiaToken');state.user=null;state.token=null;updateAuthUI()}
function logout(){clearAuth();location.href='index.html'}
function updateAuthUI(){document.querySelectorAll('#authActions').forEach(e=>e.innerHTML=state.user?`<a class="action-link" href="orders.html" title="Orders"><i data-lucide="package"></i></a><a class="action-link" href="#" onclick="logout();return false" title="Logout"><i data-lucide="log-out"></i></a>`:`<a class="action-link" href="login.html" title="Login"><i data-lucide="log-in"></i></a>`);if(window.lucide) lucide.createIcons()}
async function checkAuth(){if(state.token){const u=await apiFetch('/auth/me',{},true);if(u){state.user=u;localStorage.setItem('afiaUser',JSON.stringify(u))}else clearAuth()}updateAuthUI()}
async function handleLogin(e){e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;b.textContent='Signing in…';const emailEl=document.getElementById('email'),passEl=document.getElementById('password');const d=await apiFetch('/auth/login',{method:'POST',body:JSON.stringify({email:emailEl.value.trim(),password:passEl.value})});if(d){state.user=d.user;state.token=d.token;localStorage.setItem('afiaUser',JSON.stringify(d.user));localStorage.setItem('afiaToken',d.token);toast('Login successful');setTimeout(()=>location.href=d.user.role==='admin'?'admin.html':'index.html',400)}else{b.disabled=false;b.textContent='Login →'}}
async function handleRegister(e){e.preventDefault();const b=e.target.querySelector('button');const email=document.getElementById('email').value.trim();b.disabled=true;b.textContent='Sending code…';const d=await apiFetch('/auth/register',{method:'POST',body:JSON.stringify({name:document.getElementById('name').value.trim(),email,password:document.getElementById('password').value})});if(d&&d.verificationRequired){sessionStorage.setItem('verificationEmail',d.email);location.href='verify-email.html'}else{b.disabled=false;b.textContent='Create account →'}}
async function handleVerifyEmail(e){e.preventDefault();const b=e.target.querySelector('button');const email=sessionStorage.getItem('verificationEmail')||'';const code=document.getElementById('verificationCode').value.trim();if(!email){toast('Registration email is missing');location.href='register.html';return}b.disabled=true;b.textContent='Verifying…';const d=await apiFetch('/auth/verify-email',{method:'POST',body:JSON.stringify({email,code})});if(d){state.user=d.user;state.token=d.token;localStorage.setItem('afiaUser',JSON.stringify(d.user));localStorage.setItem('afiaToken',d.token);sessionStorage.removeItem('verificationEmail');toast('Email verified');setTimeout(()=>location.href='index.html',400)}else{b.disabled=false;b.textContent='Verify email →'}}
async function resendVerificationCode(){const email=sessionStorage.getItem('verificationEmail')||'';if(!email){toast('Registration email is missing');return}const d=await apiFetch('/auth/resend-verification',{method:'POST',body:JSON.stringify({email})});if(d){const s=document.getElementById('resendStatus');if(s)s.textContent=' Code sent.'}}
async function renderOrders(){const el=document.getElementById('ordersList');if(!el)return;if(!state.user){el.innerHTML='<div class="empty">Please log in to view your orders.</div>';return}const os=await apiFetch('/orders',{},true);if(!os)return;el.innerHTML=os.length?os.map(o=>`<div class="order-card"><div class="order-head"><div><strong>Order #${o.id}</strong><br><small>${new Date(o.created_at).toLocaleDateString()}</small></div><span class="status ${esc(o.status)}">${esc(o.status)}</span></div><div class="order-items">${o.items.map(i=>`<div>${esc(i.product_name)} × ${i.quantity} · ${money(i.price*i.quantity)}</div>`).join('')}</div><div class="order-foot">${money(o.total)}</div></div>`).join(''):'<div class="empty">No orders yet.</div>'}
async function init(){
  const savedTheme = localStorage.getItem('theme');
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  setTheme(savedTheme || systemTheme);

  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

  updateCounts();
  await checkAuth();
  updateCounts();
  renderProducts('featuredProducts',{featured:true});
  const shop=document.getElementById('shopProducts');
  if(shop){
    const c=new URLSearchParams(location.search).get('category');
    if(c)state.category=c;
    const btn=[...document.querySelectorAll('.filter')].find(x=>x.textContent.trim()===state.category);
    btn?.classList.add('active');
    renderProducts('shopProducts',{category:state.category});
  }
  renderProducts('wishlistProducts',{wishlistIds:state.wishlist});
  renderCart();
  renderCheckoutSummary();
  renderOrders();
  renderProductDetail();
  if(window.lucide) lucide.createIcons();
}
document.addEventListener('DOMContentLoaded',init);

document.querySelectorAll('.password-toggle').forEach((toggle) => {
  toggle.addEventListener('click', () => {
    const targetId = toggle.getAttribute('data-password-target');
    const input = document.getElementById(targetId);
    if (!input) return;
    const showing = input.type === 'password';
    input.type = showing ? 'text' : 'password';
    toggle.textContent = showing ? 'Hide' : 'Show';
    toggle.setAttribute('aria-label', showing ? 'Hide password' : 'Show password');
    toggle.setAttribute('title', showing ? 'Hide password' : 'Show password');
    toggle.setAttribute('aria-pressed', String(showing));
  });
});
