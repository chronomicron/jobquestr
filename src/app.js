import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.mjs';

const sampleData = {
  label: 'Sample data',
  origin: null,
  companies: [
    { id: 'northstar', name: 'Northstar Systems', sector: 'Embedded software', website: 'https://example.com', address: 'Downtown Montréal, QC', glassdoorUrl: '', coordinates: [-73.5673, 45.5017], applications: [{ role: 'Embedded Software Developer', status: 'Interview', appliedAt: '2026-10-14', nextAction: 'Interview · tomorrow, 10:30 AM', notes: 'Sample record for preview only.', events: [{ date: '2026-10-29', time: '09:15', type: 'Follow-up', title: 'Follow-up reminder', detail: 'Send a short note to the hiring team.' }, { date: '2026-10-28', time: '16:40', type: 'Email', title: 'Interview scheduled', detail: 'Technical interview · tomorrow at 10:30 AM.' }, { date: '2026-10-14', time: '11:20', type: 'Applied', title: 'Application submitted', detail: 'Embedded Software Developer · Northstar Systems.' }] }] },
    { id: 'asterion', name: 'Asterion Robotics', sector: 'Robotics & automation', website: 'https://example.com', address: 'Longueuil, QC', glassdoorUrl: '', coordinates: [-73.5107, 45.5312], applications: [{ role: 'Firmware Engineer', status: 'Applied', appliedAt: '2026-10-21', nextAction: 'Check in next week', notes: 'Sample record for preview only.', events: [{ date: '2026-10-21', time: '14:05', type: 'Applied', title: 'Application submitted', detail: 'Firmware Engineer · Asterion Robotics.' }] }] },
    { id: 'vectorvision', name: 'Vector Vision Labs', sector: 'Computer vision', website: 'https://example.com', address: 'Laval, QC', glassdoorUrl: '', coordinates: [-73.7452, 45.6066], applications: [{ role: 'Computer Vision Developer', status: 'In review', appliedAt: '2026-10-23', nextAction: 'Waiting for a response', notes: 'Sample record for preview only.', events: [{ date: '2026-10-23', time: '10:40', type: 'Applied', title: 'Application submitted', detail: 'Computer Vision Developer · Vector Vision Labs.' }, { date: '2026-10-25', time: '09:00', type: 'Status', title: 'Application under review', detail: 'The team has received the application.' }] }] }
  ]
};

let data = sampleData;
let dataModeLabel = 'DEMO DATA';
let selectedId = sampleData.companies[0].id;
let travelMode = 'transit';
let markerRefs = [];
let toastTimer;
let origin = null;
let originPlacementActive = false;
let showProspects = true;
let filteredCompanies = null;
let geocodeCandidates = [];
let rememberedFileHandle = null;

const byId = (id) => document.getElementById(id);
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const safeHttpUrl = (value = '') => /^https?:\/\//i.test(String(value)) ? String(value) : '';
const validCoordinates = (value) => Array.isArray(value) && value.length === 2 && value.every((coordinate) => Number.isFinite(Number(coordinate)));
function normalizeOrigin(value) {
  if (!value || !validCoordinates(value.coordinates)) return null;
  return { label: String(value.label || 'Transit start point'), coordinates: value.coordinates.map(Number) };
}
function loadSavedOrigin() {
  try { return normalizeOrigin(JSON.parse(localStorage.getItem('jobquestr-origin') || 'null')); }
  catch { return null; }
}
function handleStoreRequest(mode, operation, value) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('jobquestr-browser-data', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('handles');
    request.onerror = () => reject(request.error || new Error('Could not access browser storage.'));
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('handles', mode);
      const store = transaction.objectStore('handles');
      const result = operation === 'get' ? store.get('jobquest-data') : operation === 'delete' ? store.delete('jobquest-data') : store.put(value, 'jobquest-data');
      result.onsuccess = () => resolve(result.result);
      result.onerror = () => reject(result.error || new Error('Could not update browser storage.'));
      transaction.oncomplete = () => db.close();
      transaction.onerror = () => { db.close(); reject(transaction.error || new Error('Could not update browser storage.')); };
    };
  });
}
const getSavedFileHandle = () => handleStoreRequest('readonly', 'get');
const saveFileHandle = (handle) => handleStoreRequest('readwrite', 'put', handle);
const forgetFileHandle = () => handleStoreRequest('readwrite', 'delete');
function saveOrigin() {
  data.origin = origin;
  try {
    if (origin) localStorage.setItem('jobquestr-origin', JSON.stringify(origin));
    else localStorage.removeItem('jobquestr-origin');
  } catch { /* The origin remains available for this session when storage is unavailable. */ }
  renderOriginControl();
}
const selectedCompany = () => data.companies.find((company) => company.id === selectedId) || data.companies[0];
const currentApplications = () => data.companies.flatMap((company) => (company.applications || []).map((application) => ({ ...application, companyName: company.name, companyId: company.id })));
const latestApplication = (company) => [...(company?.applications || [])].sort((a, b) => (b.appliedAt || '').localeCompare(a.appliedAt || ''))[0];
const isProspect = (application) => {
  const stage = String(application?.stage || '').toLowerCase();
  const status = String(application?.status || '').toLowerCase();
  if (/^(found|shortlisted|preparing|prospect|to prepare|saved)$/.test(stage)) return true;
  if (application?.appliedAt || /^(applied|in review|interview|offer|not selected|withdrawn)$/.test(status)) return false;
  return /prospect|to prepare|shortlist|saved|not applied/.test(`${stage} ${status} ${application?.sourceStatus || ''}`.toLowerCase());
};
const companyHasProspects = (company) => (company.applications || []).some(isProspect);
const companyHasSubmittedRoles = (company) => (company.applications || []).some((application) => !isProspect(application));

origin = normalizeOrigin(sampleData.origin) || loadSavedOrigin();

function renderOriginControl() {
  const chip = document.querySelector('.origin-chip');
  if (!chip) return;
  chip.querySelector('small').textContent = origin ? `${origin.label} · click to move` : (originPlacementActive ? 'Click the map to place it' : 'Set a transit origin');
  const button = byId('set-origin');
  button.textContent = originPlacementActive ? '×' : origin ? '↻' : '＋';
  button.setAttribute('aria-label', originPlacementActive ? 'Cancel origin placement' : origin ? 'Move commute origin' : 'Set commute origin');
  button.title = originPlacementActive ? 'Cancel placement' : origin ? 'Move start pin' : 'Set start pin';
}
function beginOriginPlacement() {
  if (originDialog?.open) originDialog.close();
  originPlacementActive = true;
  renderOriginControl();
  map.getCanvasContainer().style.cursor = 'crosshair';
  showToast('Click the map to place your transit start pin. Press Escape to cancel.');
}
renderOriginControl();

function showToast(message) {
  const toast = byId('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function statusColor(status = '') {
  const light = document.body.dataset.theme === 'light';
  if (/interview/i.test(status)) return light ? '#075985' : '#38dfff';
  if (/not selected|rejected|follow/i.test(status)) return light ? '#9b276f' : '#ff43c6';
  return light ? '#263b8f' : '#00f2a5';
}

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
}

function formatDate(value) {
  if (!value) return 'Date not set';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function renderCompany() {
  const company = selectedCompany();
  if (!company) {
    byId('company-card').innerHTML = '<div class="empty-state">Load a local JobQuestR data file to see companies here.</div>';
    byId('application-details').innerHTML = '';
    return;
  }
  const applications = [...(company.applications || [])].sort((a, b) => (b.appliedAt || '').localeCompare(a.appliedAt || ''));
  const application = applications[0];
  const status = application?.status || 'Prospect';
  const statusTagClass = status === 'Not selected' ? 'pink' : status === 'Interview' ? 'blue' : 'green';
  const websiteUrl = safeHttpUrl(company.website);
  const photoUrl = safeHttpUrl(company.photoUrl);
  const logoUrl = safeHttpUrl(company.logoUrl);
  const directGlassdoorUrl = safeHttpUrl(company.glassdoorUrl);
  const glassdoorUrl = directGlassdoorUrl || `https://www.glassdoor.ca/Search/results.htm?keyword=${encodeURIComponent(company.name)}`;
  const streetViewUrl = safeHttpUrl(company.streetViewUrl) || (company.locationPrecision === 'exact' && company.coordinates ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${company.coordinates[1]},${company.coordinates[0]}` : '');
  const mapsUrl = streetViewUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([company.name, company.address].filter(Boolean).join(' '))}`;
  const website = websiteUrl ? `<a class="small-link" href="${escapeHtml(websiteUrl)}" target="_blank" rel="noopener noreferrer">COMPANY SITE ↗</a>` : '';
  const glassdoorLabel = directGlassdoorUrl ? 'GLASSDOOR PROFILE ↗' : 'SEARCH GLASSDOOR ↗';
  const glassdoor = `<a class="small-link" href="${escapeHtml(glassdoorUrl)}" target="_blank" rel="noopener noreferrer">${glassdoorLabel}</a>`;
  const profileImage = photoUrl
    ? `<img class="company-photo" src="${escapeHtml(photoUrl)}" alt="${escapeHtml(company.name)} office" loading="lazy" referrerpolicy="no-referrer" />`
    : logoUrl ? `<img class="company-logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(company.name)} logo" loading="lazy" referrerpolicy="no-referrer" />` : '';
  const photoCredit = photoUrl && company.photoAttribution ? `<span class="photo-credit">${escapeHtml(company.photoAttribution)}</span>` : '';
  byId('company-card').innerHTML = `
    <div class="company-art${photoUrl ? ' has-photo' : ''}">${profileImage}${photoCredit}<span class="selected-badge">◉ &nbsp;SELECTED</span></div>
    <div class="company-info">
      <div class="company-heading"><div><h2>${escapeHtml(company.name)}</h2><div class="company-sector">${escapeHtml(company.sector || 'Company')}</div></div></div>
      <div class="company-meta"><span class="loc"><span>⌖</span>${escapeHtml(company.address || 'Address not provided')}</span><span class="distance">${company.locationPrecision === 'approximate' ? 'AREA PIN' : (company.distance ? escapeHtml(company.distance) : '—')}</span></div>
      ${company.locationNote ? `<div class="location-note">${escapeHtml(company.locationNote)}</div>` : ''}
      <div class="tag-row"><span class="tag ${statusTagClass}">${escapeHtml(status)}</span><span class="tag blue">${escapeHtml(application?.workMode || 'LOCATION')}</span><span class="tag pink">${escapeHtml(application?.priority || 'TRACKED')}</span></div>
      <div class="company-desc">${escapeHtml(company.summary || 'Company details and application notes appear here when available in your local data file.')}</div>
      <div class="company-links">${website}${glassdoor}<a class="small-link" href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer">${streetViewUrl ? 'STREET VIEW ↗' : 'GOOGLE MAPS ↗'}</a></div>
    </div>`;
  byId('company-card').querySelector('.company-photo, .company-logo')?.addEventListener('error', (event) => {
    if (event.currentTarget.classList.contains('company-photo') && logoUrl) {
      byId('company-card').querySelector('.photo-credit')?.remove();
      event.currentTarget.outerHTML = `<img class="company-logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(company.name)} logo" loading="lazy" referrerpolicy="no-referrer" />`;
      byId('company-card').querySelector('.company-logo')?.addEventListener('error', (logoEvent) => logoEvent.currentTarget.remove());
      return;
    }
    event.currentTarget.remove();
  });
  byId('application-details').innerHTML = applications.length ? applications.map((item) => `
    <article class="application-entry">
      <div class="application-role-row"><div class="app-role">${escapeHtml(item.role || 'Role not specified')}</div><span class="tag ${item.status === 'Not selected' ? 'pink' : item.status === 'Interview' ? 'blue' : 'green'}">${escapeHtml(item.status || 'Applied')}</span></div>
      <div class="app-date">APPLIED &nbsp;${escapeHtml(formatDate(item.appliedAt))}${item.positionId ? ` &nbsp;·&nbsp; ${escapeHtml(item.positionId)}` : ''}</div>
      ${item.location ? `<div class="application-location"><b>WORKSITE</b> ${escapeHtml(item.location)}</div>` : ''}
      ${item.jobDescription ? `<div class="job-description"><b>JOB DESCRIPTION</b><p>${escapeHtml(item.jobDescription)}</p></div>` : ''}
      ${item.sourceStatus ? `<div class="application-source-status">${escapeHtml(item.sourceStatus)}</div>` : ''}
      ${item.postingUrl ? `<a class="small-link application-posting" href="${escapeHtml(item.postingUrl)}" target="_blank" rel="noreferrer">VIEW POSTING ↗</a>` : ''}
    </article>`).join('') : '<div class="empty-state">No applications recorded for this company yet.</div>';
  byId('notes-button').setAttribute('data-notes', application?.notes || 'No local notes for this company.');
  byId('data-mode').textContent = dataModeLabel;
}

function renderTimeline() {
  const allEvents = currentApplications().flatMap((application) => (application.events || []).map((event) => ({ ...event, companyName: application.companyName, companyId: application.companyId })))
    .sort((a, b) => `${b.date || ''} ${b.time || ''}`.localeCompare(`${a.date || ''} ${a.time || ''}`));
  const events = allEvents.length ? allEvents : [{ date: '', type: 'Info', title: 'No activity yet', detail: 'Your application events will appear here.' }];
  const groups = new Map();
  for (const event of events) {
    const day = event.date ? formatDate(event.date).toUpperCase() : 'START HERE';
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day).push(event);
  }
  byId('timeline-list').innerHTML = [...groups.entries()].map(([day, group]) => `<div class="timeline-day ${day.includes('TODAY') || day.includes('TOMORROW') ? 'future' : ''}">${escapeHtml(day)}</div>${group.map((event) => {
    const color = statusColor(event.type);
    const icon = /interview/i.test(event.type) ? '◷' : /follow/i.test(event.type) ? '♧' : /email/i.test(event.type) ? '✉' : /status/i.test(event.type) ? '◈' : '▤';
    return `<article class="event-card" data-company-id="${escapeHtml(event.companyId || '')}" style="--event-color:${color}"><div class="event-title-row"><span class="event-icon">${icon}</span><span class="event-title">${escapeHtml(event.title || event.type || 'Update')}</span><span class="event-time">${escapeHtml(event.time || '')}</span></div><div class="event-description">${escapeHtml(event.detail || event.companyName || '')}</div></article>`;
  }).join('')}`).join('');
  byId('timeline-list').querySelectorAll('.event-card[data-company-id]').forEach((card) => card.addEventListener('click', () => selectCompany(card.dataset.companyId)));
  const apps = currentApplications();
  const interviews = apps.filter((app) => /interview/i.test(app.status)).length;
  const followups = apps.filter((app) => app.nextAction && /follow/i.test(app.nextAction)).length;
  byId('summary-applications').textContent = String(apps.length).padStart(2, '0');
  byId('summary-interviews').textContent = String(interviews).padStart(2, '0');
  byId('summary-followups').textContent = String(followups).padStart(2, '0');
  const now = new Date();
  byId('today-date').textContent = new Intl.DateTimeFormat('en-CA', { weekday: 'short', month: 'short', day: 'numeric' }).format(now).toUpperCase();
  byId('today-short-date').textContent = new Intl.DateTimeFormat('en-CA', { weekday: 'short', month: 'short', day: 'numeric' }).format(now).toUpperCase();
  const upcoming = apps.find((app) => app.nextAction && !/waiting/i.test(app.nextAction));
  byId('today-title').textContent = followups ? `${followups} follow-up${followups > 1 ? 's' : ''} to keep moving.` : 'Your search is moving.';
  byId('today-subtitle').textContent = interviews ? `${interviews} interview${interviews > 1 ? 's' : ''} in progress.` : `${apps.length} application${apps.length === 1 ? '' : 's'} in your orbit.`;
  byId('up-next-text').textContent = upcoming?.nextAction || 'Add a next step to see it here.';
}

const map = new maplibregl.Map({ container: 'map', style: 'https://tiles.openfreemap.org/styles/dark', center: [-73.62, 45.54], zoom: 10.15, minZoom: 8, maxZoom: 17, attributionControl: true });
map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');

function clearMarkers() {
  markerRefs.forEach((marker) => marker.remove());
  markerRefs = [];
}

function drawMarkers() {
  if (!map.isStyleLoaded()) return;
  clearMarkers();
  const visibleCompanies = (filteredCompanies || data.companies).filter((company) => Array.isArray(company.coordinates) && company.coordinates.length === 2);
  for (const company of visibleCompanies) {
    const submitted = (company.applications || []).filter((application) => !isProspect(application));
    const app = latestApplication({ applications: submitted }) || latestApplication(company);
    const prospectOnly = !submitted.length;
    const color = prospectOnly ? (document.body.dataset.theme === 'light' ? '#825100' : '#ffbd4a') : statusColor(app?.status);
    const node = document.createElement('button');
    node.type = 'button';
    node.className = `company-marker ${prospectOnly ? 'prospect' : ''} ${company.id === selectedId ? 'selected' : ''}`.trim();
    node.style.setProperty('--pin-color', color);
    node.style.setProperty('--pin-glow', `${color}99`);
    node.setAttribute('aria-label', `Show ${company.name}${prospectOnly ? ', saved job prospect' : ''}`);
    if (prospectOnly) node.title = 'Saved job prospect';
    node.innerHTML = `<span>${escapeHtml(initials(company.name))}</span>`;
    node.addEventListener('click', () => selectCompany(company.id));
    const marker = new maplibregl.Marker({ element: node, anchor: 'bottom' }).setLngLat(company.coordinates).addTo(map);
    markerRefs.push(marker);
  }
  if (origin?.coordinates) {
    const home = document.createElement('button');
    home.type = 'button';
    home.className = 'origin-marker';
    home.setAttribute('aria-label', 'Your transit start point. Click to move it.');
    home.title = 'Your transit start point';
    home.innerHTML = '<span>⌂</span>';
    home.addEventListener('click', (event) => {
      // Keep this click from bubbling into the map's click-to-place handler.
      // Otherwise the click that activates repositioning is also saved as the
      // new point, shifting the origin by the marker's visual offset.
      event.stopPropagation();
      beginOriginPlacement();
    });
    markerRefs.push(new maplibregl.Marker({ element: home, anchor: 'bottom' }).setLngLat(origin.coordinates).addTo(map));
  }
  byId('map-status').innerHTML = `<span class="status-square"></span><span>${visibleCompanies.length} COMPANY SIGNAL${visibleCompanies.length === 1 ? '' : 'S'}</span><span class="status-divider">·</span><span>1 SELECTED</span>`;
}

function fitMapToData() {
  if (!map.isStyleLoaded()) {
    map.once('load', fitMapToData);
    return;
  }
  const points = data.companies.map((company) => company.coordinates).filter(validCoordinates);
  if (origin?.coordinates) points.push(origin.coordinates);
  if (!points.length) return;
  const distinctPoints = [...new Map(points.map((point) => [point.map(Number).join(','), point.map(Number)])).values()];
  if (distinctPoints.length === 1) {
    map.flyTo({ center: distinctPoints[0], zoom: 12, duration: 650 });
    return;
  }
  const bounds = new maplibregl.LngLatBounds(distinctPoints[0], distinctPoints[0]);
  distinctPoints.slice(1).forEach((point) => bounds.extend(point));
  map.fitBounds(bounds, { padding: { top: 90, right: 70, bottom: 65, left: 70 }, maxZoom: 12, duration: 700 });
}

function selectCompany(id) {
  if (!data.companies.some((company) => company.id === id)) return;
  selectedId = id;
  renderCompany();
  drawMarkers();
  const company = selectedCompany();
  if (company?.coordinates) map.easeTo({ center: company.coordinates, zoom: Math.max(map.getZoom(), 11.3), duration: 600 });
}

map.on('load', drawMarkers);
map.on('styledata', () => { if (!markerRefs.length && data.companies.length) drawMarkers(); });
map.on('click', (event) => {
  if (!originPlacementActive) return;
  origin = { label: 'Transit start point', coordinates: [event.lngLat.lng, event.lngLat.lat] };
  originPlacementActive = false;
  map.getCanvasContainer().style.cursor = '';
  try { localStorage.removeItem('jobquestr-origin-address'); } catch { /* Ignore unavailable browser storage. */ }
  saveOrigin();
  drawMarkers();
  showToast('Start pin saved on this device.');
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || !originPlacementActive) return;
  originPlacementActive = false;
  map.getCanvasContainer().style.cursor = '';
  renderOriginControl();
});

function applyFilters() {
  const query = byId('search').value.trim().toLowerCase();
  const status = byId('status-filter').value;
  const matching = data.companies.filter((company) => {
    const app = latestApplication(company);
    const matchesQuery = !query || [company.name, company.sector, company.address, ...(company.applications || []).map((item) => item.role)].join(' ').toLowerCase().includes(query);
    const matchesStatus = status === 'all' || (company.applications || []).some((item) => item.status === status);
    const matchesProspectFilter = showProspects || !companyHasProspects(company) || companyHasSubmittedRoles(company);
    return matchesQuery && matchesStatus && (status === 'all' || app) && matchesProspectFilter;
  });
  filteredCompanies = matching;
  drawMarkers();
  if (matching.length && !matching.some((company) => company.id === selectedId)) selectCompany(matching[0].id);
}

function validateData(value) {
  if (!value || !Array.isArray(value.companies)) throw new Error('Expected a JSON object with a “companies” array.');
  if (value.origin && !normalizeOrigin(value.origin)) throw new Error('Origin must include [longitude, latitude] coordinates.');
  for (const company of value.companies) {
    if (!company.id || !company.name) throw new Error('Each company needs an id and name.');
    if (company.coordinates && (!Array.isArray(company.coordinates) || company.coordinates.length !== 2 || company.coordinates.some((n) => !Number.isFinite(Number(n))))) throw new Error(`Coordinates for ${company.name} must be [longitude, latitude].`);
    if (company.applications && !Array.isArray(company.applications)) throw new Error(`Applications for ${company.name} must be an array.`);
  }
}

byId('search').addEventListener('input', applyFilters);
byId('status-filter').addEventListener('change', applyFilters);
byId('toggle-prospects').addEventListener('click', (event) => {
  showProspects = !showProspects;
  const button = event.currentTarget;
  button.setAttribute('aria-pressed', String(showProspects));
  button.textContent = showProspects ? 'PROSPECTS ON' : 'PROSPECTS OFF';
  button.title = showProspects ? 'Hide saved and shortlisted job posts' : 'Show saved and shortlisted job posts';
  applyFilters();
});
async function loadDataFile(file, autoLoad = false) {
  const parsed = JSON.parse(await file.text());
  validateData(parsed);
  if (!parsed.companies.length) throw new Error('This file has no companies yet.');
  data = { ...parsed, label: parsed.label || 'LOCAL DATA' };
  origin = normalizeOrigin(parsed.origin) || loadSavedOrigin();
  if (parsed.origin) saveOrigin(); else renderOriginControl();
  selectedId = data.companies[0].id;
  renderCompany();
  renderTimeline();
  applyFilters();
  fitMapToData();
  dataModeLabel = autoLoad ? 'AUTO-LOAD ON VISIT' : 'LOCAL FILE';
  byId('data-mode').textContent = dataModeLabel;
  byId('forget-data').hidden = !rememberedFileHandle;
  showToast(`Loaded ${data.companies.length} companies locally.`);
}

async function openDataFile() {
  if (typeof window.showOpenFilePicker !== 'function') {
    byId('file-input').click();
    return;
  }
  try {
    if (rememberedFileHandle) {
      let permission = 'prompt';
      try { permission = await rememberedFileHandle.requestPermission({ mode: 'read' }); }
      catch { /* Fall through to a fresh file selection if permission cannot be renewed. */ }
      if (permission === 'granted') {
        await loadDataFile(await rememberedFileHandle.getFile(), true);
        return;
      }
    }
    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      types: [{ description: 'JobQuestR data', accept: { 'application/json': ['.json'] } }],
    });
    rememberedFileHandle = handle;
    let remembered = false;
    try {
      await saveFileHandle(handle);
      remembered = true;
    } catch { /* The data can still be used when persistent handles are unavailable. */ }
    await loadDataFile(await handle.getFile(), remembered);
  } catch (error) {
    if (error.name !== 'AbortError') showToast(error.message || 'Could not open that data file.');
  }
}

async function restoreRememberedData() {
  if (!window.indexedDB) return;
  try {
    rememberedFileHandle = await getSavedFileHandle();
    if (!rememberedFileHandle) return;
    byId('forget-data').hidden = false;
    const permission = await rememberedFileHandle.queryPermission({ mode: 'read' });
    if (permission === 'granted') {
      await loadDataFile(await rememberedFileHandle.getFile(), true);
    } else {
      dataModeLabel = 'CLICK LOAD DATA TO RECONNECT';
      byId('data-mode').textContent = dataModeLabel;
      byId('load-data').title = 'Reconnect to your remembered local JSON file';
    }
  } catch {
    dataModeLabel = 'CHOOSE LOCAL DATA FILE';
    byId('data-mode').textContent = dataModeLabel;
  }
}

byId('load-data').addEventListener('click', openDataFile);
byId('file-input').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    await loadDataFile(file);
  } catch (error) {
    showToast(error.message || 'Could not read that file.');
  } finally { event.target.value = ''; }
});
byId('forget-data').addEventListener('click', async () => {
  try { await forgetFileHandle(); } catch { /* The current page can still unlink its in-memory handle. */ }
  rememberedFileHandle = null;
  byId('forget-data').hidden = true;
  byId('load-data').title = '';
  dataModeLabel = data.label || 'LOCAL DATA';
  byId('data-mode').textContent = dataModeLabel;
  showToast('Remembered file unlinked. Your JSON file was not changed.');
});
byId('application-toggle').addEventListener('click', () => {
  const button = byId('application-toggle');
  const details = byId('application-details');
  const expanded = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', String(!expanded));
  details.hidden = expanded;
  button.querySelector('.toggle-chevron').textContent = expanded ? '⌄' : '⌃';
});
byId('theme-toggle').addEventListener('click', () => {
  const light = document.body.dataset.theme !== 'light';
  document.body.dataset.theme = light ? 'light' : 'dark';
  map.setStyle(`https://tiles.openfreemap.org/styles/${light ? 'positron' : 'dark'}`);
  map.once('style.load', drawMarkers);
  renderTimeline();
  drawMarkers();
  byId('theme-toggle').setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode');
  byId('theme-toggle').querySelector('.theme-label').textContent = light ? 'LIGHT MODE' : 'DARK MODE';
  byId('theme-toggle').querySelector('.theme-icon').textContent = light ? '☾' : '☼';
});
byId('reset-map').addEventListener('click', () => {
  byId('search').value = '';
  byId('status-filter').value = 'all';
  showProspects = true;
  byId('toggle-prospects').setAttribute('aria-pressed', 'true');
  byId('toggle-prospects').textContent = 'PROSPECTS ON';
  byId('toggle-prospects').title = 'Hide saved and shortlisted job posts';
  map.flyTo({ center: [-73.62, 45.54], zoom: 10.15 });
  applyFilters();
});
byId('followup-button').addEventListener('click', () => showToast('Follow-up editing is planned for the next version.'));
byId('notes-button').addEventListener('click', (event) => showToast(event.currentTarget.dataset.notes || 'No notes for this company.'));
const originDialog = byId('origin-dialog');
const originForm = byId('origin-form');
const originAddress = byId('origin-address');
const originResult = byId('origin-result');
const originResultField = byId('origin-result-field');
const originSubmit = byId('origin-submit');
byId('set-origin').addEventListener('click', () => {
  try { originAddress.value = localStorage.getItem('jobquestr-origin-address') || ''; }
  catch { originAddress.value = ''; }
  originResultField.hidden = true;
  geocodeCandidates = [];
  originSubmit.textContent = 'FIND ADDRESS ↗';
  originDialog.showModal();
  originAddress.focus();
});
byId('origin-dialog-close').addEventListener('click', () => originDialog.close());
byId('origin-map-pick').addEventListener('click', beginOriginPlacement);
originAddress.addEventListener('input', () => {
  geocodeCandidates = [];
  originResultField.hidden = true;
  originSubmit.textContent = 'FIND ADDRESS ↗';
  byId('origin-dialog-status').textContent = '';
});
originForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const status = byId('origin-dialog-status');
  const address = originAddress.value.trim();
  if (!address) return;
  originSubmit.disabled = true;
  status.textContent = 'Looking up this stop or place…';
  try {
    if (geocodeCandidates.length) {
      const chosen = geocodeCandidates[Number(originResult.value)];
      if (!chosen) throw new Error('Choose one of the matching places.');
      origin = { label: 'Transit start point', coordinates: chosen.coordinates };
      try { localStorage.setItem('jobquestr-origin-address', address); } catch { /* Pin still works for this session. */ }
      saveOrigin();
      originDialog.close();
      map.flyTo({ center: origin.coordinates, zoom: Math.max(map.getZoom(), 14) });
      drawMarkers();
      showToast('Start pin set from the selected place.');
      return;
    }

    const query = new URL('https://photon.komoot.io/api/');
    query.searchParams.set('q', address);
    query.searchParams.set('limit', '5');
    query.searchParams.set('lang', 'en');
    query.searchParams.set('lat', '45.5017');
    query.searchParams.set('lon', '-73.5673');
    const response = await fetch(query, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(response.status === 429 ? 'Photon is busy. Try placing the pin directly on the map.' : 'Address lookup is unavailable. Try placing the pin directly on the map.');
    const result = await response.json();
    geocodeCandidates = (result.features || []).filter((feature) => validCoordinates(feature.geometry?.coordinates)).map((feature) => {
      const place = feature.properties || {};
      const street = [place.housenumber, place.street].filter(Boolean).join(' ');
      const label = [...new Set([place.name, street, place.city, place.state, place.country].filter(Boolean))].join(', ');
      return { label: label || address, coordinates: feature.geometry.coordinates.map(Number) };
    });
    if (!geocodeCandidates.length) throw new Error('No matching stop or place found. Try a nearby intersection or station name.');
    try { localStorage.setItem('jobquestr-origin-address', address); } catch { /* Address remains in the dialog for this session. */ }
    originResult.replaceChildren(...geocodeCandidates.map((candidate, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = candidate.label;
      return option;
    }));
    originResultField.hidden = false;
    originSubmit.textContent = 'SET START PIN';
    status.textContent = geocodeCandidates.length === 1 ? 'Place found. Confirm to set the pin.' : 'Choose the matching place, then set the pin.';
  } catch (error) {
    geocodeCandidates = [];
    originResultField.hidden = true;
    status.textContent = error.message || 'Address lookup failed. Try placing the pin directly on the map.';
  } finally {
    originSubmit.disabled = false;
  }
});
document.querySelectorAll('.travel-option').forEach((button) => button.addEventListener('click', () => {
  travelMode = button.dataset.mode;
  document.querySelectorAll('.travel-option').forEach((item) => item.classList.toggle('selected', item === button));
  byId('route-chip').querySelector('b').textContent = travelMode === 'transit' ? 'TRANSIT ROUTE' : 'DRIVING ROUTE';
  byId('route-chip').querySelector('small').textContent = 'Connect a routing provider';
}));
document.querySelectorAll('[data-toast]').forEach((button) => button.addEventListener('click', () => showToast(button.dataset.toast)));
byId('activity-filter').addEventListener('click', () => showToast('Showing all sample activity.'));
byId('timeline-filter').addEventListener('click', () => showToast('Activity filters are planned for a later version.'));

renderCompany();
renderTimeline();
restoreRememberedData();
