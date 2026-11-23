/**
 * =========================================================================
 * AMANDINHA — SISTEMA DE GESTÃO HOSPITALAR
 * Frontend Application Framework & UI Controller
 * =========================================================================
 */

// 1. GERENCIAMENTO DE SESSÃO E AUTENTICAÇÃO
const AUTH_STORAGE_KEY = 'amandinha_session';

function getAuthSession() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setAuthSession(token, user) {
  const session = {
    token,
    user,
    timestamp: Date.now()
  };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

function clearAuthSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  location.href = 'index.html';
}

function checkPageAuth(allowedRoles = null) {
  const session = getAuthSession();
  const currentPage = location.pathname.split('/').pop() || 'index.html';

  // index.html (login) e tv.html (painel de chamada público) não exigem login obrigatório
  if (currentPage === 'index.html' || currentPage === '' || currentPage === 'tv.html') {
    return session;
  }

  if (!session || !session.token) {
    console.warn('Sessão não encontrada, redirecionando para login.');
    location.href = 'index.html';
    return null;
  }

  if (allowedRoles && Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const userRole = session.user?.tipo;
    if (userRole !== 'admin' && !allowedRoles.includes(userRole)) {
      alert(`Acesso restrito: seu perfil (${userRole}) não tem permissão para esta tela.`);
      location.href = 'dashboard.html';
      return null;
    }
  }

  return session;
}

// 2. REQUISIÇÕES HTTP SEGURAS (apiFetch)
async function apiFetch(endpoint, options = {}) {
  const session = getAuthSession();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (session && session.token) {
    headers['Authorization'] = `Bearer ${session.token}`;
  }

  // Normaliza o endpoint: se não começar com / ou http, adiciona /api/
  let url = endpoint;
  if (!url.startsWith('http')) {
    if (!url.startsWith('/')) url = '/' + url;
    if (!url.startsWith('/api') && !url.startsWith('/login') && !url.startsWith('/tv') && !url.startsWith('/health')) {
      url = '/api' + url;
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 && !url.includes('/login')) {
        showToast('Sessão expirada. Faça login novamente.', 'danger');
        setTimeout(clearAuthSession, 1500);
      }
      throw new Error(data.erro || data.message || `Erro na requisição (${response.status})`);
    }

    return data;
  } catch (err) {
    console.error(`Falha em [${options.method || 'GET'}] ${url}:`, err);
    throw err;
  }
}

// 3. TOASTS & NOTIFICAÇÕES MODERNAS
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = {
    success: '✅',
    danger: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> <div>${escapeHtml(message)}</div>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// 4. SANITIZAÇÃO E PROTEÇÃO CONTRA XSS
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 5. MÁSCARAS & FORMATADORES BRASILEIROS
function formatCPF(cpf) {
  if (!cpf) return '';
  const cleaned = String(cpf).replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function validarCPF(cpf) {
  const cleaned = String(cpf).replace(/\D/g, '');
  if (cleaned.length !== 11 || /^(\d)\1{10}$/.test(cleaned)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cleaned.charAt(i), 10) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cleaned.charAt(9), 10)) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cleaned.charAt(i), 10) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(cleaned.charAt(10), 10);
}

function formatDate(isoString) {
  if (!isoString) return '--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return isoString;
  }
}

// 6. SINTETIZADOR DE SOM HOSPITALAR (Web Audio API)
function playHospitalChime() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;

    const playTone = (freq, start, duration) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(start);
      osc.stop(start + duration);
    };

    // Toque característico de chamada hospitalar: Sol5 (784Hz) seguido de Mi5 (659Hz)
    playTone(783.99, now, 0.6);
    playTone(659.25, now + 0.35, 0.9);
  } catch (err) {
    console.log('Áudio automático indisponível ou bloqueado pelo navegador.');
  }
}

// 7. INJEÇÃO DINÂMICA DA BARRA LATERAL (SIDEBAR) & CABEÇALHO
function initAppLayout(activePageKey) {
  const session = getAuthSession();
  const userName = session?.user?.nome || 'Usuário Amandinha';
  const userRole = session?.user?.tipo || 'Visitante';
  const userInitials = userName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  const sidebarContainer = document.getElementById('sidebar-container');
  if (sidebarContainer) {
    sidebarContainer.innerHTML = `
      <aside class="app-sidebar" id="appSidebar">
        <div class="sidebar-header">
          <div class="sidebar-logo-icon">🎀</div>
          <div class="sidebar-title">
            <h1>Amandinha</h1>
            <span>Gestão Hospitalar</span>
          </div>
        </div>

        <nav class="sidebar-nav">
          <div class="sidebar-label">Principal</div>
          <a href="dashboard.html" class="nav-link ${activePageKey === 'dashboard' ? 'active' : ''}">
            <span class="icon">📊</span>
            <span>Dashboard</span>
          </a>

          <div class="sidebar-label">Atendimento Clínico</div>
          <a href="atendimento.html" class="nav-link ${activePageKey === 'atendimento' ? 'active' : ''}">
            <span class="icon">🪪</span>
            <span>Recepção & Cadastro</span>
          </a>
          <a href="triagem.html" class="nav-link ${activePageKey === 'triagem' ? 'active' : ''}">
            <span class="icon">🩺</span>
            <span>Triagem Manchester</span>
          </a>
          <a href="medico.html" class="nav-link ${activePageKey === 'medico' ? 'active' : ''}">
            <span class="icon">👨‍⚕️</span>
            <span>Consultório Médico</span>
          </a>

          <div class="sidebar-label">Internação & Leitos</div>
          <a href="internacao.html" class="nav-link ${activePageKey === 'internacao' ? 'active' : ''}">
            <span class="icon">🛏️</span>
            <span>Gestão de Leitos</span>
          </a>
          <a href="alta.html" class="nav-link ${activePageKey === 'alta' ? 'active' : ''}">
            <span class="icon">📄</span>
            <span>Alta Hospitalar</span>
          </a>

          <div class="sidebar-label">Suprimentos & Mídia</div>
          <a href="medicacoes.html" class="nav-link ${activePageKey === 'medicacoes' ? 'active' : ''}">
            <span class="icon">💊</span>
            <span>Farmácia Hospitalar</span>
          </a>
          <a href="almoxarifado.html" class="nav-link ${activePageKey === 'almoxarifado' ? 'active' : ''}">
            <span class="icon">📦</span>
            <span>Almoxarifado</span>
          </a>
          <a href="tv.html" target="_blank" class="nav-link ${activePageKey === 'tv' ? 'active' : ''}">
            <span class="icon">📺</span>
            <span>Painel de TV</span>
          </a>

          <div class="sidebar-label">Governança</div>
          <a href="auditoria.html" class="nav-link ${activePageKey === 'auditoria' ? 'active' : ''}">
            <span class="icon">🛡️</span>
            <span>Auditoria & Segurança</span>
          </a>
        </nav>

        <div class="sidebar-user">
          <div class="user-info">
            <div class="user-avatar">${userInitials}</div>
            <div class="user-details">
              <div class="user-name" title="${escapeHtml(userName)}">${escapeHtml(userName)}</div>
              <span class="user-role-badge">${escapeHtml(userRole)}</span>
            </div>
          </div>
          <button class="btn-logout" title="Sair do sistema" onclick="clearAuthSession()">🚪</button>
        </div>
      </aside>
    `;
  }

  // Botão toggle mobile
  const btnToggle = document.getElementById('btnToggleSidebar');
  if (btnToggle) {
    btnToggle.addEventListener('click', () => {
      const sidebar = document.getElementById('appSidebar');
      if (sidebar) sidebar.classList.toggle('open');
    });
  }
}

// 8. CONTROLE DE MODAIS
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Expor utilitários globalmente
window.apiFetch = apiFetch;
window.showToast = showToast;
window.getAuthSession = getAuthSession;
window.setAuthSession = setAuthSession;
window.clearAuthSession = clearAuthSession;
window.checkPageAuth = checkPageAuth;
window.escapeHtml = escapeHtml;
window.formatCPF = formatCPF;
window.validarCPF = validarCPF;
window.formatDate = formatDate;
window.playHospitalChime = playHospitalChime;
window.initAppLayout = initAppLayout;
window.openModal = openModal;
window.closeModal = closeModal;
