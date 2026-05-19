const STORAGE_KEY = 'tutor_admin_token';

const state = {
  token: localStorage.getItem(STORAGE_KEY) || '',
  admin: null,
  filter: 'pending',
  items: [],
  selectedId: null,
  selectedDetail: null,
};

const elements = {
  loginView: document.getElementById('loginView'),
  dashboardView: document.getElementById('dashboardView'),
  loginForm: document.getElementById('loginForm'),
  usernameInput: document.getElementById('usernameInput'),
  passwordInput: document.getElementById('passwordInput'),
  loginButton: document.getElementById('loginButton'),
  loginMessage: document.getElementById('loginMessage'),
  adminName: document.getElementById('adminName'),
  refreshButton: document.getElementById('refreshButton'),
  logoutButton: document.getElementById('logoutButton'),
  statusFilter: document.getElementById('statusFilter'),
  queueSummary: document.getElementById('queueSummary'),
  verificationList: document.getElementById('verificationList'),
  emptyState: document.getElementById('emptyState'),
  detailView: document.getElementById('detailView'),
  detailMeta: document.getElementById('detailMeta'),
  detailTitle: document.getElementById('detailTitle'),
  detailStatus: document.getElementById('detailStatus'),
  accountInfo: document.getElementById('accountInfo'),
  teacherInfo: document.getElementById('teacherInfo'),
  proofImage: document.getElementById('proofImage'),
  imageLink: document.getElementById('imageLink'),
  reviewNote: document.getElementById('reviewNote'),
  approveButton: document.getElementById('approveButton'),
  rejectButton: document.getElementById('rejectButton'),
  reviewMessage: document.getElementById('reviewMessage'),
};

function setMessage(target, message, isError = true) {
  target.textContent = message || '';
  target.style.color = isError ? '#b91c1c' : '#15803d';
}

function setToken(token) {
  state.token = token || '';
  if (state.token) {
    localStorage.setItem(STORAGE_KEY, state.token);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  let body = null;
  try {
    body = await response.json();
  } catch (_) {
    body = null;
  }

  if (!response.ok) {
    const error = new Error((body && body.message) || `Request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return body;
}

function statusText(status) {
  return {
    pending: '待审核',
    approved: '已通过',
    rejected: '已驳回',
  }[status] || status;
}

function formatTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

function renderLogin() {
  elements.loginView.classList.remove('hidden');
  elements.dashboardView.classList.add('hidden');
}

function renderDashboard() {
  elements.loginView.classList.add('hidden');
  elements.dashboardView.classList.remove('hidden');
  elements.adminName.textContent = state.admin ? `管理员：${state.admin.username}` : '';
}

function renderList() {
  const items = state.items || [];
  elements.queueSummary.textContent = items.length ? `当前共 ${items.length} 条记录` : '当前没有记录';

  if (!items.length) {
    elements.verificationList.innerHTML = '<div class="verification-item"><p>当前筛选条件下没有记录。</p></div>';
    state.selectedId = null;
    state.selectedDetail = null;
    renderDetail();
    return;
  }

  elements.verificationList.innerHTML = items.map((item) => `
    <button class="verification-item ${state.selectedId === item.id ? 'active' : ''}" data-id="${item.id}">
      <div class="item-meta">
        <h3>${item.teacher && item.teacher.real_name ? item.teacher.real_name : `用户 #${item.user_id}`}</h3>
        <span class="status-badge status-${item.status}">${statusText(item.status)}</span>
      </div>
      <p>${item.user ? `${item.user.phone} · ${item.user.role}` : `用户ID ${item.user_id}`}</p>
      <p>${item.document_type === 'student_id' ? '学生证' : '录取通知书'} · ${formatTime(item.createdAt)}</p>
    </button>
  `).join('');

  elements.verificationList.querySelectorAll('.verification-item[data-id]').forEach((button) => {
    button.addEventListener('click', () => {
      selectVerification(Number(button.dataset.id));
    });
  });
}

function renderInfoList(target, rows) {
  target.innerHTML = rows.map(([label, value]) => `
    <dt>${label}</dt>
    <dd>${value || '-'}</dd>
  `).join('');
}

function renderDetail() {
  if (!state.selectedDetail) {
    elements.emptyState.classList.remove('hidden');
    elements.detailView.classList.add('hidden');
    return;
  }

  const detail = state.selectedDetail;
  const user = detail.user || {};
  const teacher = detail.teacher || {};
  const status = detail.status || 'pending';

  elements.emptyState.classList.add('hidden');
  elements.detailView.classList.remove('hidden');
  elements.detailMeta.textContent = `提交时间：${formatTime(detail.createdAt)} · 用户ID：${detail.user_id}`;
  elements.detailTitle.textContent = teacher.real_name || user.nickname || `用户 #${detail.user_id}`;
  elements.detailStatus.className = `status-badge status-${status}`;
  elements.detailStatus.textContent = statusText(status);

  renderInfoList(elements.accountInfo, [
    ['手机号', user.phone],
    ['角色', user.role],
    ['昵称', user.nickname],
    ['用户状态', user.identity_status],
  ]);

  renderInfoList(elements.teacherInfo, [
    ['老师姓名', teacher.real_name],
    ['科目', teacher.teaching_subjects],
    ['资料电话', teacher.phone],
    ['老师认证', teacher.verification_status],
  ]);

  const imageUrl = detail.file_url || '';
  elements.imageLink.href = imageUrl;
  elements.imageLink.textContent = imageUrl ? '新窗口查看原图' : '暂无原图';
  elements.proofImage.src = imageUrl;
  elements.proofImage.alt = detail.file_name || '认证材料';
  elements.reviewNote.value = detail.review_note || '';
  elements.reviewMessage.textContent = '';

  const canReview = status === 'pending';
  elements.approveButton.disabled = !canReview;
  elements.rejectButton.disabled = !canReview;
}

async function loadProfile() {
  const body = await request('/api/admin/profile');
  state.admin = body.data;
  renderDashboard();
}

async function loadVerifications() {
  const body = await request(`/api/admin/verifications?status=${encodeURIComponent(state.filter)}`);
  state.items = body.data || [];

  if (!state.items.some((item) => item.id === state.selectedId)) {
    state.selectedId = state.items[0] ? state.items[0].id : null;
  }

  renderList();

  if (state.selectedId) {
    await selectVerification(state.selectedId);
  } else {
    state.selectedDetail = null;
    renderDetail();
  }
}

async function selectVerification(id) {
  state.selectedId = id;
  renderList();
  const body = await request(`/api/admin/verifications/${id}`);
  state.selectedDetail = body.data;
  renderDetail();
}

async function handleLogin(event) {
  event.preventDefault();
  elements.loginButton.disabled = true;
  setMessage(elements.loginMessage, '');

  try {
    const body = await request('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: elements.usernameInput.value.trim(),
        password: elements.passwordInput.value,
      }),
    });

    setToken(body.data.token);
    state.admin = body.data.admin;
    renderDashboard();
    await loadVerifications();
  } catch (error) {
    setMessage(elements.loginMessage, error.message || '登录失败');
  } finally {
    elements.loginButton.disabled = false;
  }
}

function logout() {
  setToken('');
  state.admin = null;
  state.items = [];
  state.selectedId = null;
  state.selectedDetail = null;
  elements.passwordInput.value = '';
  renderLogin();
}

async function handleReview(status) {
  if (!state.selectedDetail) return;
  const actionText = status === 'approved' ? '审核通过' : '审核驳回';
  const reviewedId = state.selectedDetail.id;
  elements.approveButton.disabled = true;
  elements.rejectButton.disabled = true;
  setMessage(elements.reviewMessage, '');

  try {
    await request(`/api/admin/verifications/${reviewedId}/review`, {
      method: 'POST',
      body: JSON.stringify({
        status,
        review_note: elements.reviewNote.value.trim(),
      }),
    });

    if (state.filter === 'pending') {
      state.filter = status;
      elements.statusFilter.value = status;
    }
    await loadVerifications();
    if (state.items.some((item) => item.id === reviewedId)) {
      state.selectedId = reviewedId;
      await selectVerification(reviewedId);
    }
    setMessage(elements.reviewMessage, `${actionText}，结果已保存`, false);
  } catch (error) {
    setMessage(elements.reviewMessage, error.message || '审核失败');
  } finally {
    elements.approveButton.disabled = false;
    elements.rejectButton.disabled = false;
  }
}

async function bootstrap() {
  elements.loginForm.addEventListener('submit', handleLogin);
  elements.refreshButton.addEventListener('click', () => loadVerifications().catch((error) => {
    setMessage(elements.reviewMessage, error.message || '刷新失败');
  }));
  elements.logoutButton.addEventListener('click', logout);
  elements.statusFilter.addEventListener('change', async (event) => {
    state.filter = event.target.value;
    await loadVerifications();
  });
  elements.approveButton.addEventListener('click', () => handleReview('approved'));
  elements.rejectButton.addEventListener('click', () => handleReview('rejected'));

  if (!state.token) {
    renderLogin();
    return;
  }

  try {
    await loadProfile();
    await loadVerifications();
  } catch (_) {
    logout();
  }
}

bootstrap();
