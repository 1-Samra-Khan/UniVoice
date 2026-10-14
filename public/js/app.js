/* ===========================================
   UniVoice – University Complaint Portal
   Main Application JavaScript
   =========================================== */

const API = '/api';
let currentUser = null;
let currentPage = 1;
let searchTimeout = null;
let selectedRating = 0;
let confirmCallback = null;
let loaderPlayed = false;
let landingAnimated = false;

// Lifecycle showcase state
let currentLifecycleStep = 0;
let sampleVoteCount = 12;
let sampleHasVoted = false;
let lifecycleTimeline = null;

// =====================
// INITIALIZATION
// =====================
document.addEventListener('DOMContentLoaded', () => {
  // Set dynamic footer year
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Sticky nav scroll listener
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('landing-nav');
    if (nav) {
      if (window.scrollY > 25) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    }
  }, { passive: true });

  const token = localStorage.getItem('uv_token');
  if (token) {
    // Skip landing, go to app after quick loader
    runLoader(() => fetchCurrentUser());
  } else {
    runLoader(() => showLanding());
  }

  // Character counters
  const titleInput = document.getElementById('c-title');
  if (titleInput) {
    titleInput.addEventListener('input', () => {
      document.getElementById('title-count').textContent = `${titleInput.value.length} / 200`;
    });
  }

  const descInput = document.getElementById('c-description');
  if (descInput) {
    descInput.addEventListener('input', () => {
      document.getElementById('desc-count').textContent = `${descInput.value.length} / 2000`;
    });
  }
});

// =====================
// CINEMATIC LOADER
// =====================
function runLoader(callback) {
  if (loaderPlayed) { if (callback) callback(); return; }
  loaderPlayed = true;

  const loader = document.getElementById('cinematic-loader');
  if (!loader) { if (callback) callback(); return; }

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    loader.style.display = 'none';
    if (callback) callback();
    return;
  }

  // Brand taglines for random selection
  const taglines = [
    'Every voice matters. Every issue deserves action.',
    'A better campus begins with being heard.',
    'Speak up. Track progress. Make change.',
    'Turning campus concerns into meaningful action.',
    'Your voice is the beginning of improvement.',
    'Report the issue. Follow the action. See the change.',
    'Better communication. Better campus life.'
  ];
  const taglineEl = document.getElementById('loader-tagline');
  if (taglineEl) {
    taglineEl.textContent = taglines[Math.floor(Math.random() * taglines.length)];
  }

  if (typeof gsap !== 'undefined') {
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.to(loader, {
          opacity: 0,
          scale: 1.02,
          duration: 0.5,
          ease: 'power2.inOut',
          onComplete: () => {
            loader.style.display = 'none';
            if (callback) callback();
          }
        });
      }
    });

    tl.fromTo(loader.querySelector('.loader-icon path:first-child'),
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.5)' }, 0.15)
      .fromTo(loader.querySelector('.loader-check'),
        { opacity: 0, strokeDashoffset: 30 },
        { opacity: 1, strokeDashoffset: 0, duration: 0.35, ease: 'power2.out' }, 0.35)
      .fromTo('.loader-wordmark',
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0.25)
      .fromTo('.loader-tagline',
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' }, 0.5)
      .fromTo('#loader-bar',
        { width: '0%' },
        { width: '100%', duration: 1.1, ease: 'power2.inOut' }, 0.35);
  } else {
    setTimeout(() => {
      loader.style.display = 'none';
      if (callback) callback();
    }, 200);
  }
}

// =====================
// AUTH HELPERS & API
// =====================
function getToken() {
  return localStorage.getItem('uv_token');
}

async function apiCall(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
}

// =====================
// SCREEN MANAGEMENT
// =====================
function showLanding() {
  const loader = document.getElementById('cinematic-loader');
  if (loader) loader.style.display = 'none';

  const landing = document.getElementById('landing-screen');
  const auth = document.getElementById('auth-screen');
  const app = document.getElementById('app-screen');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const doDisplayLanding = () => {
    if (auth) auth.style.display = 'none';
    if (app) app.style.display = 'none';
    if (landing) {
      landing.style.display = 'block';
      if (typeof gsap !== 'undefined' && !prefersReduced) {
        gsap.fromTo(landing,
          { opacity: 0, scale: 0.99 },
          { opacity: 1, scale: 1, duration: 0.45, ease: 'power2.out' }
        );
      }
      animateLanding();
    }
  };

  if (auth && auth.style.display !== 'none' && typeof gsap !== 'undefined' && !prefersReduced) {
    gsap.to(auth, {
      opacity: 0,
      scale: 0.98,
      duration: 0.25,
      ease: 'power2.in',
      onComplete: () => {
        auth.style.opacity = '1';
        auth.style.transform = 'none';
        doDisplayLanding();
      }
    });
  } else {
    doDisplayLanding();
  }
}

function showAuthScreen(tab) {
  const landing = document.getElementById('landing-screen');
  const auth = document.getElementById('auth-screen');
  const app = document.getElementById('app-screen');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const doDisplayAuth = () => {
    if (landing) landing.style.display = 'none';
    if (app) app.style.display = 'none';
    if (auth) {
      auth.style.display = 'flex';
      switchTab(tab || 'login');
      animateAuth();
    }
  };

  if (landing && landing.style.display !== 'none' && typeof gsap !== 'undefined' && !prefersReduced) {
    gsap.to(landing, {
      opacity: 0,
      y: -10,
      duration: 0.25,
      ease: 'power2.in',
      onComplete: () => {
        landing.style.opacity = '1';
        landing.style.transform = 'none';
        doDisplayAuth();
      }
    });
  } else {
    doDisplayAuth();
  }
}

function showScreen(name) {
  const loader = document.getElementById('cinematic-loader');
  if (loader) loader.style.display = 'none';
  const landing = document.getElementById('landing-screen');
  const auth = document.getElementById('auth-screen');
  const app = document.getElementById('app-screen');

  if (landing) landing.style.display = name === 'landing' ? 'block' : 'none';
  if (auth) auth.style.display = name === 'auth' ? 'flex' : 'none';
  if (app) app.style.display = name === 'app' ? 'flex' : 'none';

  if (name === 'landing') animateLanding();
  else if (name === 'auth') animateAuth();
}

// =====================
// AUTH FORMS
// =====================
function switchTab(tab) {
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  clearError('login-error');
  clearError('reg-error');

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof gsap !== 'undefined' && !prefersReduced) {
    const activeForm = tab === 'login' ? '#login-form' : '#register-form';
    gsap.fromTo(`${activeForm} .auth-form-desc, ${activeForm} .auth-form-sub, ${activeForm} .form-group, ${activeForm} .form-row, ${activeForm} button[type="submit"], ${activeForm} .auth-footer-text`,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.35, stagger: 0.04, ease: 'power2.out' }
    );
  }
}

function toggleRoleFields() {
  const role = document.getElementById('reg-role').value;
  document.getElementById('student-fields').classList.toggle('hidden', role !== 'student');
  document.getElementById('teacher-fields').classList.toggle('hidden', role !== 'teacher');
}

function togglePassword(id) {
  const input = document.getElementById(id);
  if (input) input.type = input.type === 'password' ? 'text' : 'password';
}

async function handleLogin(e) {
  e.preventDefault();
  setLoading('login-btn', true);
  clearError('login-error');
  try {
    const data = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: document.getElementById('login-email').value.trim(),
        password: document.getElementById('login-password').value,
      }),
    });
    localStorage.setItem('uv_token', data.token);
    currentUser = data.user;
    initApp();
    showToast('Welcome back to UniVoice!', 'success');
  } catch (err) {
    showError('login-error', err.message);
  } finally {
    setLoading('login-btn', false);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  setLoading('register-btn', true);
  clearError('reg-error');
  const role = document.getElementById('reg-role').value;
  if (!role) {
    showError('reg-error', 'Please select a role');
    setLoading('register-btn', false);
    return;
  }

  const password = document.getElementById('reg-password').value;
  const confirmPassword = document.getElementById('reg-confirm-password')?.value;
  if (confirmPassword !== undefined && password !== confirmPassword) {
    showError('reg-error', 'Passwords do not match');
    setLoading('register-btn', false);
    return;
  }

  try {
    const payload = {
      name: document.getElementById('reg-name').value.trim(),
      email: document.getElementById('reg-email').value.trim(),
      password,
      role,
      department: document.getElementById('reg-department').value,
    };
    if (role === 'student') {
      payload.registrationNumber = document.getElementById('reg-reg-number').value.trim();
      payload.semester = document.getElementById('reg-semester').value;
    }
    if (role === 'teacher') {
      payload.employeeId = document.getElementById('reg-emp-id').value.trim();
    }
    const data = await apiCall('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
    localStorage.setItem('uv_token', data.token);
    currentUser = data.user;
    initApp();
    showToast('Welcome to UniVoice!', 'success');
  } catch (err) {
    showError('reg-error', err.message);
  } finally {
    setLoading('register-btn', false);
  }
}

async function fetchCurrentUser() {
  try {
    const data = await apiCall('/auth/me');
    currentUser = data.user;
    initApp();
  } catch {
    localStorage.removeItem('uv_token');
    showLanding();
  }
}

function logout() {
  showConfirm('Sign Out', 'Are you sure you want to sign out?', () => {
    localStorage.removeItem('uv_token');
    currentUser = null;
    showLanding();
    showToast('Signed out successfully', 'info');
  });
}

// =====================
// APP INITIALIZATION
// =====================
function initApp() {
  showScreen('app');
  updateUserUI();
  applyRoleRestrictions();
  showPage('dashboard');
  loadNotifications();
}

function updateUserUI() {
  if (!currentUser) return;
  const avatarEl = document.getElementById('sidebar-avatar');
  const nameEl = document.getElementById('sidebar-name');
  const roleEl = document.getElementById('sidebar-role');
  const welcomeEl = document.getElementById('welcome-name');

  const initials = currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  if (avatarEl) avatarEl.textContent = initials;
  if (nameEl) nameEl.textContent = currentUser.name;
  if (roleEl) {
    roleEl.className = `user-role-badge role-${currentUser.role}`;
    roleEl.textContent = currentUser.role;
  }
  if (welcomeEl) welcomeEl.textContent = currentUser.name.split(' ')[0];
}

function applyRoleRestrictions() {
  document.querySelectorAll('[data-roles]').forEach(el => {
    const roles = el.getAttribute('data-roles').split(',');
    el.classList.toggle('hidden', !roles.includes(currentUser?.role));
  });
}

// =====================
// PAGE NAVIGATION
// =====================
function showPage(pageName) {
  document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.classList.add('hidden'); });
  document.querySelectorAll('.sidebar .nav-item').forEach(n => n.classList.remove('active'));

  const page = document.getElementById(`page-${pageName}`);
  const navItem = document.getElementById(`nav-${pageName}`);

  if (page) {
    page.classList.remove('hidden');
    page.classList.add('active');
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (typeof gsap !== 'undefined' && !prefersReduced) {
      gsap.fromTo(page, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
    }
  }
  if (navItem) navItem.classList.add('active');

  const titles = {
    dashboard: 'Dashboard',
    complaints: 'All Complaints',
    'my-complaints': 'My Complaints',
    'new-complaint': 'Post Complaint',
    admin: 'Admin Panel',
    notifications: 'Notifications',
  };
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = titles[pageName] || 'UniVoice';

  // Load page data
  if (pageName === 'dashboard') loadDashboard();
  else if (pageName === 'complaints') { currentPage = 1; loadComplaints(); }
  else if (pageName === 'my-complaints') loadMyComplaints();
  else if (pageName === 'admin') loadAdminPanel();
  else if (pageName === 'notifications') loadNotificationsPage();

  // Close sidebar on mobile
  if (window.innerWidth < 768) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.toggle('open');
}

// =====================
// DASHBOARD
// =====================
async function loadDashboard() {
  try {
    if (['authority', 'admin'].includes(currentUser?.role)) {
      const data = await apiCall('/complaints/stats');
      document.getElementById('stat-total').textContent = data.stats.total;
      document.getElementById('stat-pending').textContent = data.stats.pending;
      document.getElementById('stat-completed').textContent = data.stats.completed;
      document.getElementById('stat-fixed').textContent = data.stats.fixed;
    } else {
      const allData = await apiCall('/complaints?limit=100');
      document.getElementById('stat-total').textContent = allData.total;
      document.getElementById('stat-pending').textContent = allData.complaints.filter(c => c.status === 'pending').length;
      document.getElementById('stat-completed').textContent = allData.complaints.filter(c => c.status === 'completed').length;
      document.getElementById('stat-fixed').textContent = allData.complaints.filter(c => c.status === 'fixed_by_authority').length;
    }

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (typeof gsap !== 'undefined' && !prefersReduced) {
      gsap.fromTo('.stat-card',
        { opacity: 0, y: 15, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.08, ease: 'back.out(1.4)' }
      );
    }
  } catch (e) {
    // Graceful fallback
  }

  // Load top complaints
  try {
    const data = await apiCall('/complaints?limit=5');
    renderComplaintCards('top-complaints-list', data.complaints, true);
  } catch (e) {
    const list = document.getElementById('top-complaints-list');
    if (list) list.innerHTML = renderEmptyState('No complaints yet', 'Be the first to post!');
  }
}

// =====================
// COMPLAINTS LIST
// =====================
let debounceTimer = null;
function debounceSearch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => { currentPage = 1; loadComplaints(); }, 350);
}

async function loadComplaints() {
  const listEl = document.getElementById('complaints-list');
  if (!listEl) return;
  listEl.innerHTML = renderLoading();

  const search = document.getElementById('search-input')?.value.trim() || '';
  const status = document.getElementById('filter-status')?.value || '';
  const category = document.getElementById('filter-category')?.value || '';

  let query = `?page=${currentPage}&limit=15`;
  if (search) query += `&search=${encodeURIComponent(search)}`;
  if (status) query += `&status=${status}`;
  if (category) query += `&category=${encodeURIComponent(category)}`;

  try {
    const data = await apiCall(`/complaints${query}`);
    renderComplaintCards('complaints-list', data.complaints, false);
    renderPagination(data.page, data.pages);
  } catch (e) {
    listEl.innerHTML = renderEmptyState('Failed to load complaints', e.message);
  }
}

async function loadMyComplaints() {
  const listEl = document.getElementById('my-complaints-list');
  if (!listEl) return;
  listEl.innerHTML = renderLoading();
  try {
    const data = await apiCall('/complaints?limit=50');
    const mine = data.complaints.filter(c => c.isOwner);
    if (mine.length === 0) {
      listEl.innerHTML = renderEmptyState("You haven't posted any complaints yet", 'Click "Post Complaint" to get started');
    } else {
      renderComplaintCards('my-complaints-list', mine, false, true);
    }
  } catch (e) {
    listEl.innerHTML = renderEmptyState('Failed to load complaints', e.message);
  }
}

// =====================
// RENDER COMPLAINT CARDS
// =====================
function renderComplaintCards(containerId, complaints, compact = false, showOwnerActions = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!complaints || complaints.length === 0) {
    container.innerHTML = renderEmptyState('No complaints found', 'Try adjusting your search or filters');
    return;
  }

  const canUserVote = ['student', 'teacher'].includes(currentUser?.role);

  container.innerHTML = complaints.map(c => `
    <div class="complaint-card ${c.status}" onclick="openComplaint('${c._id}')">
      <div class="vote-col" onclick="event.stopPropagation()">
        ${c.isOwner ? `
          <button class="vote-btn is-own" disabled title="You cannot vote on your own complaint">
            <span class="vote-arrow">▲</span>
          </button>
        ` : !canUserVote ? `
          <button class="vote-btn is-own" disabled title="Only students and teachers can vote on complaints">
            <span class="vote-arrow">▲</span>
          </button>
        ` : `
          <button class="vote-btn ${c.hasVoted ? 'voted' : ''}" data-vote-btn="${c._id}" onclick="toggleVote('${c._id}', this)" title="${c.hasVoted ? 'Remove vote' : 'Upvote'}">
            <span class="vote-arrow">▲</span>
          </button>
        `}
        <span class="vote-count" data-vote-count="${c._id}" id="vc-${c._id}">${c.voteCount}</span>
      </div>
      <div class="complaint-content">
        <div class="card-meta">
          <span class="category-badge">${escapeHtml(c.category)}</span>
          <span class="status-badge status-${c.status}">${formatStatus(c.status)}</span>
        </div>
        <h3 class="card-title">${escapeHtml(c.title)}</h3>
        <p class="card-desc">${escapeHtml(c.description)}</p>
        <div class="card-footer">
          <span class="complaint-poster">By <span>${escapeHtml(c.postedBy?.name || 'Unknown')}</span> (${c.postedBy?.role || ''})</span>
          <span class="complaint-time">${timeAgo(c.createdAt)}</span>
        </div>
      </div>
    </div>
  `).join('');

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof gsap !== 'undefined' && !prefersReduced) {
    gsap.fromTo(`#${containerId} .complaint-card`,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.35, stagger: 0.05, ease: 'power2.out' }
    );
  }
}

// =====================
// VOTE HELPERS & SYNC
// =====================
function updateVoteUI(complaintId, voteCount, hasVoted) {
  document.querySelectorAll(`[data-vote-count="${complaintId}"]`).forEach(el => {
    el.textContent = voteCount;
  });
  const vc = document.getElementById(`vc-${complaintId}`);
  if (vc) vc.textContent = voteCount;

  document.querySelectorAll(`[data-vote-btn="${complaintId}"]`).forEach(btn => {
    btn.classList.toggle('voted', hasVoted);
    btn.title = hasVoted ? 'Remove vote' : 'Upvote';
  });

  const modalVc = document.getElementById('modal-vc');
  if (modalVc) modalVc.textContent = voteCount;
  const modalVoteCount = document.getElementById('modal-vote-count');
  if (modalVoteCount) modalVoteCount.textContent = `▲ ${voteCount} votes`;
  const modalVotedTag = document.getElementById('modal-voted-tag');
  if (modalVotedTag) modalVotedTag.textContent = hasVoted ? '(voted)' : '';
  const modalVoteBtn = document.getElementById('modal-vote-btn');
  if (modalVoteBtn) {
    modalVoteBtn.classList.toggle('voted', hasVoted);
    modalVoteBtn.title = hasVoted ? 'Remove vote' : 'Upvote';
  }
}

async function toggleVote(complaintId, btn) {
  if (!['student', 'teacher'].includes(currentUser?.role)) {
    showToast('Only students and teachers can vote on complaints', 'info');
    return;
  }
  try {
    const data = await apiCall(`/complaints/${complaintId}/vote`, { method: 'POST' });
    updateVoteUI(complaintId, data.voteCount, data.hasVoted);
    showToast(data.hasVoted ? '▲ Vote added!' : '▼ Vote removed', 'info');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// =====================
// COMPLAINT MODAL
// =====================
async function openComplaint(id) {
  const modal = document.getElementById('complaint-modal');
  const body = document.getElementById('modal-body');
  body.innerHTML = renderLoading();
  modal.classList.remove('hidden');

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof gsap !== 'undefined' && !prefersReduced) {
    gsap.fromTo('#modal-content',
      { opacity: 0, scale: 0.94, y: 15 },
      { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: 'back.out(1.4)' }
    );
  }

  try {
    const data = await apiCall(`/complaints/${id}`);
    renderComplaintModal(data.complaint);
  } catch (e) {
    body.innerHTML = renderEmptyState('Error loading complaint', e.message);
  }
}

function closeComplaintModal() {
  const modal = document.getElementById('complaint-modal');
  if (!modal || modal.classList.contains('hidden')) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof gsap !== 'undefined' && !prefersReduced) {
    gsap.to('#modal-content', {
      opacity: 0,
      scale: 0.95,
      y: 10,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        modal.classList.add('hidden');
        document.getElementById('modal-body').innerHTML = '';
      }
    });
  } else {
    modal.classList.add('hidden');
    document.getElementById('modal-body').innerHTML = '';
  }
}

function closeModal(e) {
  if (e.target.id === 'complaint-modal') closeComplaintModal();
}

function renderComplaintModal(c) {
  const isOwner = c.isOwner;
  const isAuthority = ['authority', 'admin'].includes(currentUser?.role);
  const canVote = ['student', 'teacher'].includes(currentUser?.role) && !isOwner;
  const isFixed = c.status === 'fixed_by_authority';
  const isCompleted = c.status === 'completed';
  const isPending = c.status === 'pending';
  const canDelete = (isOwner && c.status === 'completed') || currentUser?.role === 'admin';

  document.getElementById('modal-body').innerHTML = `
    <div class="modal-detail">
      <div class="modal-badges">
        <span class="category-badge">${escapeHtml(c.category)}</span>
        <span class="status-badge status-${c.status}">${formatStatus(c.status)}</span>
      </div>

      <h2 class="modal-title">${escapeHtml(c.title)}</h2>

      <div class="modal-info-grid">
        <div class="info-item">
          <label>Reported By</label>
          <p>${escapeHtml(c.postedBy?.name || 'Unknown')} (${c.postedBy?.role || ''})</p>
        </div>
        <div class="info-item">
          <label>Department</label>
          <p>${escapeHtml(c.postedBy?.department || 'Not specified')}</p>
        </div>
        <div class="info-item">
          <label>Date Submitted</label>
          <p>${formatDate(c.createdAt)}</p>
        </div>
        <div class="info-item">
          <label>Community Votes</label>
          <p id="modal-vote-count">▲ ${c.voteCount} votes</p>
        </div>
      </div>

      <div class="modal-section">
        <label>Description</label>
        <p class="modal-desc">${escapeHtml(c.description)}</p>
      </div>

      ${c.tags && c.tags.length ? `
        <div class="modal-section">
          <label>Tags</label>
          <div class="tags-list">
            ${c.tags.map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join('')}
          </div>
        </div>
      ` : ''}

      ${c.authorityNote ? `
        <div class="modal-section note-box">
          <label>🔧 Authority Resolution Note</label>
          <p>${escapeHtml(c.authorityNote)}</p>
          ${c.fixedBy ? `<small style="color:var(--text-muted);display:block;margin-top:0.35rem">Resolved by: ${escapeHtml(c.fixedBy.name || 'Authority')}</small>` : ''}
        </div>
      ` : ''}

      ${c.feedback && c.feedback.rating ? `
        <div class="modal-section note-box feedback-box">
          <label>★ Reporter Feedback (${c.feedback.rating}/5 Stars)</label>
          <div class="stars-display">${'★'.repeat(c.feedback.rating)}${'☆'.repeat(5 - c.feedback.rating)}</div>
          ${c.feedback.comment ? `<p style="margin-top:0.35rem">${escapeHtml(c.feedback.comment)}</p>` : ''}
        </div>
      ` : ''}

      <!-- Authority Action: Mark Fixed -->
      ${isAuthority && isPending ? `
        <div class="modal-action-box">
          <h4>Take Action as Authority</h4>
          <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.75rem">Document the corrective action taken to address this campus concern.</p>
          <div class="form-group">
            <textarea id="authority-note-input" placeholder="Explain how this issue was fixed..." rows="3" style="width:100%"></textarea>
          </div>
          <button class="btn-primary" onclick="markFixed('${c._id}')">
            <span>Mark as Fixed by Authority</span>
          </button>
        </div>
      ` : ''}

      <!-- Reporter Action: Confirm Completed -->
      ${isOwner && isFixed ? `
        <div class="modal-action-box">
          <h4>Verify Resolution</h4>
          <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.75rem">The university authority marked this as resolved. Did it fix your issue?</p>
          <button class="btn-primary" onclick="confirmComplete('${c._id}')">
            <span>Confirm Issue is Completed</span>
          </button>
        </div>
      ` : ''}

      <!-- Reporter Action: Leave Feedback -->
      ${isOwner && isCompleted && (!c.feedback || !c.feedback.rating) ? `
        <div class="modal-action-box">
          <h4>Share Your Feedback</h4>
          <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.75rem">Rate the resolution quality to help improve campus administration.</p>
          <div class="star-rating" id="star-rating">
            ${[1, 2, 3, 4, 5].map(i => `
              <button type="button" class="star-btn" onclick="setRating(${i})">★</button>
            `).join('')}
          </div>
          <div class="form-group" style="margin-top:0.75rem">
            <textarea id="feedback-comment" placeholder="Optional comments on how the issue was handled..." rows="2" style="width:100%"></textarea>
          </div>
          <button class="btn-primary" style="margin-top:0.5rem" onclick="submitFeedback('${c._id}')">
            <span>Submit Feedback</span>
          </button>
        </div>
      ` : ''}

      <!-- Vote and Delete Controls -->
      <div class="modal-controls">
        ${isOwner ? `
          <button id="modal-vote-btn" class="vote-btn is-own" disabled style="width:auto;padding:0.5rem 1.25rem;gap:0.5rem;display:flex;align-items:center"
            title="You cannot vote on your own complaint">
            ▲ <span id="modal-vc">${c.voteCount}</span> votes <span style="font-size:0.75rem;opacity:0.8">(Your Complaint)</span>
          </button>
        ` : !canVote ? `
          <button id="modal-vote-btn" class="vote-btn is-own" disabled style="width:auto;padding:0.5rem 1.25rem;gap:0.5rem;display:flex;align-items:center"
            title="Only students and teachers can vote on complaints">
            ▲ <span id="modal-vc">${c.voteCount}</span> votes
          </button>
        ` : `
          <button id="modal-vote-btn" data-vote-btn="${c._id}" class="vote-btn ${c.hasVoted ? 'voted' : ''}" style="width:auto;padding:0.5rem 1.25rem;gap:0.5rem;display:flex;align-items:center"
            onclick="toggleVoteModal('${c._id}', this)" title="${c.hasVoted ? 'Remove vote' : 'Upvote'}">
            ▲ <span id="modal-vc">${c.voteCount}</span> votes <span id="modal-voted-tag">${c.hasVoted ? '(voted)' : ''}</span>
          </button>
        `}

        ${canDelete ? `
          <button class="btn-danger" style="margin-left:auto" onclick="deleteComplaint('${c._id}')">
            Delete Complaint
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

async function toggleVoteModal(complaintId, btn) {
  if (!['student', 'teacher'].includes(currentUser?.role)) {
    showToast('Only students and teachers can vote on complaints', 'info');
    return;
  }
  try {
    const data = await apiCall(`/complaints/${complaintId}/vote`, { method: 'POST' });
    updateVoteUI(complaintId, data.voteCount, data.hasVoted);
    showToast(data.hasVoted ? '▲ Vote added!' : '▼ Vote removed', 'info');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// =====================
// COMPLAINT ACTIONS
// =====================
async function markFixed(complaintId) {
  const note = document.getElementById('authority-note-input')?.value.trim();
  if (!note) { showToast('Please provide a note about the resolution', 'error'); return; }
  try {
    await apiCall(`/complaints/${complaintId}/mark-fixed`, {
      method: 'PATCH',
      body: JSON.stringify({ authorityNote: note }),
    });
    closeComplaintModal();
    showToast('Complaint marked as fixed! User has been notified.', 'success');
    loadDashboard();
  } catch (e) { showToast(e.message, 'error'); }
}

async function confirmComplete(complaintId) {
  try {
    await apiCall(`/complaints/${complaintId}/confirm-complete`, { method: 'PATCH' });
    closeComplaintModal();
    showToast('Complaint marked as completed! You can now leave feedback.', 'success');
    loadMyComplaints();
    loadNotifications();
  } catch (e) { showToast(e.message, 'error'); }
}

function setRating(n) {
  selectedRating = n;
  document.querySelectorAll('.star-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i < n);
  });
}

async function submitFeedback(complaintId) {
  if (!selectedRating) { showToast('Please select a star rating', 'error'); return; }
  const comment = document.getElementById('feedback-comment')?.value.trim();
  try {
    await apiCall(`/complaints/${complaintId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ rating: selectedRating, comment }),
    });
    closeComplaintModal();
    showToast('Thank you for your feedback!', 'success');
    selectedRating = 0;
    loadMyComplaints();
  } catch (e) { showToast(e.message, 'error'); }
}

async function deleteComplaint(complaintId) {
  showConfirm(
    'Delete Complaint',
    'This will permanently delete the complaint. This action cannot be undone.',
    async () => {
      try {
        await apiCall(`/complaints/${complaintId}`, { method: 'DELETE' });
        closeComplaintModal();
        showToast('Complaint deleted successfully', 'success');
        loadMyComplaints();
        loadComplaints();
      } catch (e) { showToast(e.message, 'error'); }
    }
  );
}

// =====================
// POST NEW COMPLAINT
// =====================
async function submitComplaint(e) {
  e.preventDefault();
  setLoading('submit-complaint-btn', true);
  clearError('complaint-form-error');

  const title = document.getElementById('c-title').value.trim();
  const category = document.getElementById('c-category').value;
  const description = document.getElementById('c-description').value.trim();
  const tagsRaw = document.getElementById('c-tags').value.trim();
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  try {
    await apiCall('/complaints', {
      method: 'POST',
      body: JSON.stringify({ title, category, description, tags }),
    });
    showToast('Complaint posted successfully!', 'success');
    document.getElementById('complaint-form').reset();
    document.getElementById('title-count').textContent = '0 / 200';
    document.getElementById('desc-count').textContent = '0 / 2000';
    showPage('complaints');
  } catch (err) {
    showError('complaint-form-error', err.message);
  } finally {
    setLoading('submit-complaint-btn', false);
  }
}

function updateDescCount() {
  const desc = document.getElementById('c-description');
  const countEl = document.getElementById('desc-count');
  if (desc && countEl) {
    countEl.textContent = `${desc.value.length} / 2000`;
  }
}

// =====================
// PAGINATION
// =====================
function renderPagination(page, pages) {
  const container = document.getElementById('pagination');
  if (!container || pages <= 1) { if (container) container.innerHTML = ''; return; }
  let html = '';
  if (page > 1) html += `<button class="page-btn" onclick="goToPage(${page - 1})">← Prev</button>`;
  const start = Math.max(1, page - 2), end = Math.min(pages, page + 2);
  for (let i = start; i <= end; i++) {
    html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
  }
  if (page < pages) html += `<button class="page-btn" onclick="goToPage(${page + 1})">Next →</button>`;
  container.innerHTML = html;
}

function goToPage(page) {
  currentPage = page;
  loadComplaints();
  const pageContent = document.querySelector('.page-content');
  if (pageContent) pageContent.scrollTop = 0;
}

// =====================
// ADMIN PANEL
// =====================
async function loadAdminPanel() {
  await loadUsers();
}

async function loadUsers() {
  try {
    const data = await apiCall('/admin/users');
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;
    if (!data.users.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem">No users found</td></tr>';
      return;
    }
    tbody.innerHTML = data.users.map(u => `
      <tr>
        <td style="color:var(--text-primary);font-weight:500">${escapeHtml(u.name)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td><span class="role-tag role-${u.role}">${u.role}</span></td>
        <td>${u.department || '—'}</td>
        <td class="${u.isApproved ? 'status-approved' : 'status-suspended'}">${u.isApproved ? '✓ Active' : '✗ Suspended'}</td>
        <td>
          <button class="btn-secondary" style="font-size:0.75rem;padding:0.35rem 0.75rem"
            onclick="toggleUser('${u._id}', this)">
            ${u.isApproved ? 'Suspend' : 'Approve'}
          </button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function toggleUser(userId, btn) {
  try {
    const data = await apiCall(`/admin/users/${userId}/toggle-approval`, { method: 'PATCH' });
    showToast(data.message, 'success');
    loadUsers();
  } catch (e) { showToast(e.message, 'error'); }
}

async function createPrivilegedUser(e) {
  e.preventDefault();
  clearError('cu-error');
  try {
    const payload = {
      name: document.getElementById('cu-name').value.trim(),
      email: document.getElementById('cu-email').value.trim(),
      password: document.getElementById('cu-password').value,
      role: document.getElementById('cu-role').value,
      department: document.getElementById('cu-department').value.trim(),
    };
    await apiCall('/admin/create-user', { method: 'POST', body: JSON.stringify(payload) });
    showToast('Account created successfully!', 'success');
    document.getElementById('create-user-form').reset();
    switchAdminTab('users');
    loadUsers();
  } catch (e) {
    showError('cu-error', e.message);
  }
}

function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.add('hidden'));
  if (event && event.currentTarget) event.currentTarget.classList.add('active');
  const target = document.getElementById(`admin-tab-${tab}`);
  if (target) target.classList.remove('hidden');
}

// =====================
// NOTIFICATIONS
// =====================
async function loadNotifications() {
  try {
    const data = await apiCall('/auth/notifications');
    const unread = data.notifications.filter(n => !n.isRead).length;
    const badge = document.getElementById('notif-count');
    if (badge) {
      if (unread > 0) {
        badge.classList.remove('hidden');
        badge.textContent = unread > 9 ? '9+' : unread;
      } else {
        badge.classList.add('hidden');
      }
    }
  } catch (e) {}
}

async function loadNotificationsPage() {
  const container = document.getElementById('notifications-list');
  if (!container) return;
  container.innerHTML = renderLoading();
  try {
    const data = await apiCall('/auth/notifications');
    await apiCall('/auth/notifications/read', { method: 'PUT' });
    const badge = document.getElementById('notif-count');
    if (badge) badge.classList.add('hidden');

    if (!data.notifications.length) {
      container.innerHTML = renderEmptyState('No notifications', 'You\'re all caught up!');
      return;
    }

    const icons = {
      complaint_fixed: '🔧',
      complaint_completed: '✅',
      new_complaint: '📋',
      vote: '▲',
      feedback: '★',
    };

    container.innerHTML = data.notifications.map(n => `
      <div class="notif-item ${!n.isRead ? 'unread' : ''}">
        <span class="notif-icon">${icons[n.type] || '🔔'}</span>
        <div class="notif-text">
          <p>${escapeHtml(n.message)}</p>
          <small>${timeAgo(n.createdAt)}</small>
        </div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = renderEmptyState('Failed to load notifications', e.message);
  }
}

// =====================
// UTILITY FUNCTIONS
// =====================
function renderLoading() {
  return `<div class="loading-state"><div class="spinner"></div><span>Loading...</span></div>`;
}

function renderEmptyState(title, subtitle) {
  return `<div class="empty-state"><div class="empty-icon">📭</div><h3>${title}</h3><p>${subtitle}</p></div>`;
}

function formatStatus(s) {
  const map = {
    pending: '⏳ Pending',
    in_review: '🔍 In Review',
    fixed_by_authority: '🔧 Fixed (Verify)',
    completed: '✅ Completed'
  };
  return map[s] || s;
}

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ===== TOAST =====
function showToast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  c.appendChild(t);

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof gsap !== 'undefined' && !prefersReduced) {
    gsap.fromTo(t,
      { opacity: 0, y: 20, scale: 0.9 },
      { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'back.out(1.5)' }
    );
  }

  setTimeout(() => {
    if (typeof gsap !== 'undefined' && !prefersReduced) {
      gsap.to(t, {
        opacity: 0,
        y: -10,
        duration: 0.25,
        ease: 'power2.in',
        onComplete: () => t.remove()
      });
    } else {
      t.remove();
    }
  }, 3500);
}

// ===== ERROR DISPLAY =====
function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}
function clearError(id) {
  const el = document.getElementById(id);
  if (el) { el.textContent = ''; el.classList.add('hidden'); }
}

// ===== LOADING STATE =====
function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  const text = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  if (text) text.classList.toggle('hidden', loading);
  if (loader) loader.classList.toggle('hidden', !loading);
}

// ===== CONFIRM DIALOG =====
function showConfirm(title, message, callback) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;
  confirmCallback = callback;
  const dialog = document.getElementById('confirm-dialog');
  dialog.classList.remove('hidden');

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof gsap !== 'undefined' && !prefersReduced) {
    gsap.fromTo('.confirm-box',
      { opacity: 0, scale: 0.94, y: 15 },
      { opacity: 1, scale: 1, y: 0, duration: 0.25, ease: 'back.out(1.5)' }
    );
  }

  document.getElementById('confirm-ok-btn').onclick = () => {
    if (confirmCallback) confirmCallback();
    closeConfirm();
  };
}

function closeConfirm() {
  const dialog = document.getElementById('confirm-dialog');
  if (!dialog || dialog.classList.contains('hidden')) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof gsap !== 'undefined' && !prefersReduced) {
    gsap.to('.confirm-box', {
      opacity: 0,
      scale: 0.96,
      duration: 0.18,
      ease: 'power2.in',
      onComplete: () => {
        dialog.classList.add('hidden');
        confirmCallback = null;
      }
    });
  } else {
    dialog.classList.add('hidden');
    confirmCallback = null;
  }
}

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeComplaintModal();
    closeConfirm();
  }
});

// =============================================
// LANDING PAGE HELPERS & NAVIGATION
// =============================================
function smoothScroll(e, id) {
  if (e) e.preventDefault();
  const el = document.getElementById(id);
  if (el) {
    const navHeight = 70;
    const y = el.getBoundingClientRect().top + window.pageYOffset - navHeight;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
}

function toggleMobileMenu() {
  const nav = document.getElementById('mobile-nav');
  if (nav) nav.classList.toggle('hidden');
}

function closeMobileMenu() {
  const nav = document.getElementById('mobile-nav');
  if (nav) nav.classList.add('hidden');
}

// =============================================
// COMPLAINT LIFECYCLE SHOWCASE INTERACTIVITY
// =============================================
function setLifecycleStep(step) {
  currentLifecycleStep = step;
  const steps = [
    document.getElementById('lc-step-0'),
    document.getElementById('lc-step-1'),
    document.getElementById('lc-step-2'),
  ];
  const fill1 = document.getElementById('lc-fill-1');
  const fill2 = document.getElementById('lc-fill-2');
  const note = document.getElementById('lc-note');

  if (step === 0) {
    if (fill1) fill1.style.width = '0%';
    if (fill2) fill2.style.width = '0%';
    steps.forEach((s, idx) => s && s.classList.toggle('lc-active', idx === 0));
    if (note) note.classList.add('hidden');
  } else if (step === 1) {
    if (fill1) fill1.style.width = '100%';
    if (fill2) fill2.style.width = '0%';
    steps.forEach((s, idx) => s && s.classList.toggle('lc-active', idx <= 1));
    if (note) note.classList.add('hidden');
  } else if (step === 2) {
    if (fill1) fill1.style.width = '100%';
    if (fill2) fill2.style.width = '100%';
    steps.forEach((s) => s && s.classList.add('lc-active'));
    if (note) {
      note.classList.remove('hidden');
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (typeof gsap !== 'undefined' && !prefersReduced) {
        gsap.fromTo(note, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
      }
    }
  }
}

function nextLifecycleStep() {
  const next = (currentLifecycleStep + 1) % 3;
  setLifecycleStep(next);
}

function runLifecycleAnimation(reset = false) {
  if (lifecycleTimeline) lifecycleTimeline.kill();
  setLifecycleStep(0);

  const fill1 = document.getElementById('lc-fill-1');
  const fill2 = document.getElementById('lc-fill-2');
  const step1 = document.getElementById('lc-step-1');
  const step2 = document.getElementById('lc-step-2');
  const note = document.getElementById('lc-note');

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof gsap === 'undefined' || prefersReduced) {
    setLifecycleStep(2);
    return;
  }

  lifecycleTimeline = gsap.timeline({ delay: reset ? 0.1 : 0.4 });
  lifecycleTimeline
    .to(fill1, { width: '100%', duration: 0.9, ease: 'power2.inOut' })
    .add(() => {
      currentLifecycleStep = 1;
      if (step1) {
        step1.classList.add('lc-active');
        const dot = step1.querySelector('.lc-dot');
        if (dot) gsap.fromTo(dot, { scale: 0.9 }, { scale: 1.25, duration: 0.25, yoyo: true, repeat: 1 });
      }
    })
    .to(fill2, { width: '100%', duration: 0.9, ease: 'power2.inOut' }, '+=0.3')
    .add(() => {
      currentLifecycleStep = 2;
      if (step2) {
        step2.classList.add('lc-active');
        const dot = step2.querySelector('.lc-dot');
        if (dot) gsap.fromTo(dot, { scale: 0.9 }, { scale: 1.25, duration: 0.25, yoyo: true, repeat: 1 });
      }
      if (note) {
        note.classList.remove('hidden');
        gsap.fromTo(note, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, ease: 'back.out(1.4)' });
      }
    });
}

function toggleSampleVote() {
  sampleHasVoted = !sampleHasVoted;
  sampleVoteCount += sampleHasVoted ? 1 : -1;
  const countEl = document.getElementById('lc-vote-count');
  const votesBtn = document.getElementById('lc-sample-votes');
  if (countEl) countEl.textContent = sampleVoteCount;
  if (votesBtn) votesBtn.classList.toggle('voted', sampleHasVoted);

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof gsap !== 'undefined' && !prefersReduced) {
    gsap.fromTo('#lc-vote-arrow', { y: -4 }, { y: 0, duration: 0.3, ease: 'back.out(2)' });
    gsap.fromTo('#lc-vote-count', { scale: 1.3 }, { scale: 1, duration: 0.3, ease: 'back.out(2)' });
  }
  showToast(sampleHasVoted ? '▲ Sample upvote registered!' : '▼ Sample vote removed', 'info');
}

// =============================================
// GSAP MOTION DIRECTION & ANIMATIONS
// =============================================
function animateLanding() {
  if (typeof gsap === 'undefined') {
    // Fallback: make all elements visible
    document.querySelectorAll('.hero-eyebrow, .hero-headline, .hero-desc, .hero-ctas, .hero-caption, .hero-visual, .strip-item, .problem-card, .sol-step, .how-step, .role-card').forEach(el => {
      el.style.opacity = '1';
    });
    return;
  }

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    gsap.set(['.hero-eyebrow', '.hero-headline', '.hero-desc', '.hero-ctas', '.hero-caption', '.hero-visual', '.strip-item', '.problem-card', '.sol-step', '.how-step', '.role-card'], { opacity: 1 });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // Clear existing triggers to avoid duplicates upon page transitions
  ScrollTrigger.getAll().forEach(t => t.kill());

  // 1. Hero animation sequence following exact prompt order:
  // Navigation fades into view -> Eyebrow appears -> Headline reveals through masked text animation ->
  // Description fades in with slight upward movement -> CTA buttons appear with staggered entrance ->
  // Campus illustration elements animate into position -> Supporting caption fades in
  const heroTl = gsap.timeline({ delay: 0.1 });
  heroTl
    // 1. Navigation fades into view
    .fromTo('#landing-nav',
      { opacity: 0, y: -12 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
    )
    // 2. Eyebrow appears
    .fromTo('#hero-eyebrow',
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
      '-=0.2'
    )
    // 3. Headline reveals through masked text animation
    .fromTo('#hero-headline',
      { opacity: 0, y: 35, clipPath: 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)' },
      { opacity: 1, y: 0, clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', duration: 0.75, ease: 'power3.out' },
      '-=0.15'
    )
    // 4. Description fades in with slight upward movement
    .fromTo('#hero-desc',
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
      '-=0.25'
    )
    // 5. CTA buttons appear with a staggered entrance
    .fromTo('#hero-ctas button',
      { opacity: 0, y: 18, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.1, ease: 'back.out(1.5)' },
      '-=0.2'
    )
    // 6. Campus illustration elements animate into position
    .fromTo('#hero-visual',
      { opacity: 0, scale: 0.96 },
      { opacity: 1, scale: 1, duration: 0.6, ease: 'power2.out' },
      '-=0.2'
    )
    .fromTo('.illus-building',
      { opacity: 0 },
      { opacity: 0.25, duration: 0.4, stagger: 0.08, ease: 'power2.out' },
      '-=0.3'
    )
    .fromTo('.illus-float-card',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.12, ease: 'back.out(1.4)' },
      '-=0.2'
    )
    .fromTo('.illus-person',
      { opacity: 0, scale: 0 },
      { opacity: 0.7, scale: 1, duration: 0.35, stagger: 0.08, ease: 'back.out(1.6)' },
      '-=0.2'
    )
    .fromTo('.illus-line',
      { opacity: 0 },
      { opacity: 0.4, duration: 0.3, stagger: 0.06, ease: 'power2.out' },
      '-=0.15'
    )
    .fromTo('.illus-notif',
      { opacity: 0, scale: 0 },
      { opacity: 0.85, scale: 1, duration: 0.3, stagger: 0.08, ease: 'back.out(2)' },
      '-=0.15'
    )
    // 7. Supporting caption fades in
    .fromTo('#hero-caption',
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
      '-=0.1'
    );

  // Subtle floating motion loops for illustration cards
  gsap.to('.illus-float-card:nth-child(1)', { y: -7, duration: 3.2, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 1.8 });
  gsap.to('.illus-float-card:nth-child(2)', { y: 6, duration: 2.8, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 2.1 });
  gsap.to('.illus-float-card:nth-child(3)', { y: -5, duration: 3.6, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 2.4 });

  // 2. Impact strip reveal
  gsap.fromTo('.strip-item',
    { opacity: 0, y: 20 },
    {
      opacity: 1, y: 0, duration: 0.45, stagger: 0.1, ease: 'power2.out',
      scrollTrigger: { trigger: '.impact-strip', start: 'top 85%' }
    }
  );

  // 3. Section reveals
  document.querySelectorAll('.landing-section').forEach(section => {
    const eyebrow = section.querySelector('.section-eyebrow');
    const headline = section.querySelector('.section-headline');
    const cards = section.querySelectorAll('.problem-card, .sol-step, .how-step, .role-card');

    if (eyebrow) {
      gsap.fromTo(eyebrow,
        { opacity: 0, y: 20 },
        {
          opacity: 1, y: 0, duration: 0.5, ease: 'power2.out',
          scrollTrigger: { trigger: section, start: 'top 80%' }
        }
      );
    }
    if (headline) {
      gsap.fromTo(headline,
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0, duration: 0.6, ease: 'power2.out',
          scrollTrigger: { trigger: section, start: 'top 75%' }
        }
      );
    }
    if (cards.length) {
      gsap.fromTo(cards,
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out',
          scrollTrigger: { trigger: cards[0], start: 'top 85%' }
        }
      );
    }
  });

  // 4. Status timeline animation
  ScrollTrigger.create({
    trigger: '#status-timeline',
    start: 'top 80%',
    onEnter: () => {
      const tl = gsap.timeline();
      tl.fromTo('.tl-pending .tl-dot',
          { scale: 0.8 },
          { scale: 1.25, duration: 0.3, yoyo: true, repeat: 1, ease: 'back.out(2)' })
        .fromTo('#tl-line-1',
          { scaleX: 0, transformOrigin: 'left center' },
          { scaleX: 1, duration: 0.5, ease: 'power2.inOut' })
        .fromTo('.tl-fixed .tl-dot',
          { scale: 0.8 },
          { scale: 1.25, duration: 0.3, yoyo: true, repeat: 1, ease: 'back.out(2)' },
          '-=0.1')
        .fromTo('#tl-line-2',
          { scaleX: 0, transformOrigin: 'left center' },
          { scaleX: 1, duration: 0.5, ease: 'power2.inOut' })
        .fromTo('.tl-completed .tl-dot',
          { scale: 0.8 },
          { scale: 1.25, duration: 0.3, yoyo: true, repeat: 1, ease: 'back.out(2)' },
          '-=0.1');
    }
  });

  // 5. Complaint Lifecycle Showcase animation
  ScrollTrigger.create({
    trigger: '#section-lifecycle',
    start: 'top 75%',
    onEnter: () => runLifecycleAnimation(false),
  });

  // 6. Creator card
  gsap.fromTo('.creator-card',
    { opacity: 0, y: 30, scale: 0.98 },
    {
      opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'power2.out',
      scrollTrigger: { trigger: '.creator-card', start: 'top 85%' }
    }
  );
}

function animateAuth() {
  if (typeof gsap === 'undefined') return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  const tl = gsap.timeline();
  tl.fromTo('#auth-container',
    { opacity: 0, y: 25, scale: 0.98 },
    { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'power2.out' }
  )
  .fromTo(['.auth-logo', '.auth-tabs'],
    { opacity: 0, y: 12 },
    { opacity: 1, y: 0, duration: 0.35, stagger: 0.08, ease: 'power2.out' },
    '-=0.25'
  )
  .fromTo('.auth-form:not(.hidden) .auth-form-desc, .auth-form:not(.hidden) .auth-form-sub',
    { opacity: 0, y: 10 },
    { opacity: 1, y: 0, duration: 0.3, stagger: 0.06, ease: 'power2.out' },
    '-=0.2'
  )
  .fromTo('.auth-form:not(.hidden) .form-group, .auth-form:not(.hidden) .form-row',
    { opacity: 0, y: 12 },
    { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: 'power2.out' },
    '-=0.15'
  )
  .fromTo('.auth-form:not(.hidden) button[type="submit"], .auth-form:not(.hidden) .auth-footer-text',
    { opacity: 0, y: 10 },
    { opacity: 1, y: 0, duration: 0.3, stagger: 0.08, ease: 'power2.out' },
    '-=0.15'
  );
}
