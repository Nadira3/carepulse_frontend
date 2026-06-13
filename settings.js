// settings.js — CarePulse Settings (combined profile + hospital config)
let currentUser = null;

const defaultSettings = {
  hospital:  { name: 'ISTH Irrua', address: '', adminName: '', contactEmail: '' },
  sms:       { senderId: 'CarePulse', defaultLanguage: 'English' },
  reminders: { appointmentLeadTime: '3' },
  gemini:    { messageStyle: 'Friendly' },
};

document.addEventListener('DOMContentLoaded', async () => {
  // Profile section
  currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
  document.getElementById('myName').value  = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
  document.getElementById('myEmail').value = currentUser.email || '';
  document.getElementById('myRole').value  = currentUser.role  || '';

  // Admin section
  if (currentUser.role === 'ADMIN') {
    document.getElementById('adminSection').style.display = 'block';
    await loadUsers();
  }

  // Load stored settings
  loadSettingsFromStorage();
  setupEventListeners();
});

// ── Profile / Clinician Management ──────────────────────────────────────────

async function loadUsers() {
  try {
    const data = await listUsers();
    renderUsers(data.results || []);
  } catch (err) {
    document.getElementById('usersTableBody').innerHTML =
      '<tr><td colspan="6" class="table-empty-message" style="color:#dc3545">Failed to load users</td></tr>';
  }
}

function renderUsers(users) {
  const tbody = document.getElementById('usersTableBody');
  tbody.innerHTML = '';
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="table-empty-message">No users found</td></tr>';
    return;
  }
  users.forEach(u => {
    const row       = document.createElement('tr');
    const isMe      = u.id === currentUser.id;
    const lastLogin = u.lastLoginAt
      ? new Date(u.lastLoginAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
      : 'Never';
    row.innerHTML = `
      <td>${u.firstName} ${u.lastName} ${isMe ? '<span class="adherence-badge badge-green">You</span>' : ''}</td>
      <td>${u.email}</td>
      <td>${u.role}</td>
      <td>${lastLogin}</td>
      <td><span class="adherence-badge ${u.isActive ? 'badge-green' : 'badge-red'}">${u.isActive ? 'Active' : 'Inactive'}</span></td>
      <td>${!isMe ? `<button class="action-icon" onclick="toggleUserStatus('${u.id}', ${u.isActive})" title="${u.isActive ? 'Deactivate' : 'Activate'}">${u.isActive ? '🔒' : '🔓'}</button>` : '—'}</td>
    `;
    tbody.appendChild(row);
  });
}

async function toggleUserStatus(id, currentlyActive) {
  try {
    await updateUserStatus(id, !currentlyActive);
    showToast(`User ${currentlyActive ? 'deactivated' : 'activated'}`);
    await loadUsers();
  } catch (err) {
    showToast(`Failed: ${err.message}`, 'error');
  }
}

function setupEventListeners() {
  const btnAdd    = document.getElementById('btnAddClinician');
  const btnCancel = document.getElementById('btnCancelAdd');
  const btnCreate = document.getElementById('btnCreateClinician');

  if (btnAdd)    btnAdd.addEventListener('click', () => {
    document.getElementById('addClinicianForm').style.display = 'block';
    btnAdd.style.display = 'none';
  });
  if (btnCancel) btnCancel.addEventListener('click', () => {
    document.getElementById('addClinicianForm').style.display = 'none';
    document.getElementById('btnAddClinician').style.display  = 'inline-block';
    clearForm();
  });
  if (btnCreate) btnCreate.addEventListener('click', handleCreateClinician);
}

async function handleCreateClinician() {
  const firstName = document.getElementById('newFirstName').value.trim();
  const lastName  = document.getElementById('newLastName').value.trim();
  const email     = document.getElementById('newEmail').value.trim();
  const password  = document.getElementById('newPassword').value;
  const role      = document.getElementById('newRole').value;

  if (!firstName || !lastName || !email || !password) { showToast('All fields required', 'error'); return; }
  if (password.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }

  const btn = document.getElementById('btnCreateClinician');
  btn.disabled = true; btn.textContent = 'Creating…';
  try {
    await createClinician({ firstName, lastName, email, password, role });
    showToast(`${role === 'ADMIN' ? 'Admin' : 'Clinician'} account created`);
    document.getElementById('addClinicianForm').style.display = 'none';
    document.getElementById('btnAddClinician').style.display  = 'inline-block';
    clearForm();
    await loadUsers();
  } catch (err) {
    showToast(`Failed: ${err.message}`, 'error');
  } finally {
    btn.disabled = false; btn.textContent = '✓ Create Account';
  }
}

function clearForm() {
  ['newFirstName','newLastName','newEmail','newPassword'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('newRole').value = 'CLINICIAN';
}

// ── Hospital / SMS / Reminders / Gemini Settings (localStorage) ──────────────

function loadSettingsFromStorage() {
  const stored   = localStorage.getItem('carepulseSettings');
  const settings = stored ? JSON.parse(stored) : defaultSettings;

  document.getElementById('hospitalNameInput').value  = settings.hospital.name;
  document.getElementById('hospitalAddress').value    = settings.hospital.address;
  document.getElementById('adminName').value          = settings.hospital.adminName;
  document.getElementById('contactEmail').value       = settings.hospital.contactEmail;
  document.getElementById('smsSenderId').value        = settings.sms.senderId;
  document.getElementById('defaultLanguage').value    = settings.sms.defaultLanguage;
  document.getElementById('appointmentLeadTime').value = settings.reminders.appointmentLeadTime;
  document.getElementById('messageStyle').value       = settings.gemini.messageStyle;
}

function getStoredSettings() {
  const stored = localStorage.getItem('carepulseSettings');
  return stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(defaultSettings));
}

function saveSettings(settings) {
  localStorage.setItem('carepulseSettings', JSON.stringify(settings));
}

function saveHospitalSettings() {
  const settings = getStoredSettings();
  settings.hospital = {
    name:         document.getElementById('hospitalNameInput').value,
    address:      document.getElementById('hospitalAddress').value,
    adminName:    document.getElementById('adminName').value,
    contactEmail: document.getElementById('contactEmail').value,
  };
  saveSettings(settings);
  showToast('Hospital settings saved');
}

function saveSmsSettings() {
  const senderId = document.getElementById('smsSenderId').value.trim();
  if (!senderId)       { showToast('Sender ID required', 'error'); return; }
  if (senderId.length > 11) { showToast('Max 11 characters', 'error'); return; }
  const settings = getStoredSettings();
  settings.sms = { senderId, defaultLanguage: document.getElementById('defaultLanguage').value };
  saveSettings(settings);
  showToast('SMS settings saved');
}

function saveReminderSettings() {
  const settings = getStoredSettings();
  settings.reminders = { appointmentLeadTime: document.getElementById('appointmentLeadTime').value };
  saveSettings(settings);
  showToast('Reminder settings saved');
}

function saveGeminiSettings() {
  const settings = getStoredSettings();
  settings.gemini = { messageStyle: document.getElementById('messageStyle').value };
  saveSettings(settings);
  showToast('AI settings saved');
}

// ── Toast ────────────────────────────────────────────────────────────────────

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (toast) {
    document.getElementById('toastMessage').textContent = message;
    toast.style.backgroundColor = type === 'error' ? '#dc3545' : '#28a745';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
  }
}
