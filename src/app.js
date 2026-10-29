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
let selectedId = sampleData.companies[0].id;
let travelMode = 'transit';
let markerRefs = [];
let toastTimer;

const byId = (id) => document.getElementById(id);
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const selectedCompany = () => data.companies.find((company) => company.id === selectedId) || data.companies[0];
const currentApplications = () => data.companies.flatMap((company) => (company.applications || []).map((application) => ({ ...application, companyName: company.name, companyId: company.id })));

function showToast(message) {
  const toast = byId('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function statusColor(status = '') {
  if (/interview/i.test(status)) return '#38dfff';
  if (/follow/i.test(status)) return '#ff43c6';
  return '#00f2a5';
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
  const application = (company.applications || [])[0];
  const status = application?.status || 'Prospect';
  const website = company.website ? `<a class="small-link" href="${escapeHtml(company.website)}" target="_blank" rel="noreferrer">COMPANY SITE ↗</a>` : '';
  const glassdoor = company.glassdoorUrl ? `<a class="small-link" href="${escapeHtml(company.glassdoorUrl)}" target="_blank" rel="noreferrer">GLASSDOOR ↗</a>` : '';
  byId('company-card').innerHTML = `
    <div class="company-art"><span class="selected-badge">◉ &nbsp;SELECTED</span></div>
    <div class="company-info">
      <div class="company-heading"><div><h2>${escapeHtml(company.name)}</h2><div class="company-sector">${escapeHtml(company.sector || 'Company')}</div></div></div>
      <div class="company-meta"><span class="loc"><span>⌖</span>${escapeHtml(company.address || 'Address not provided')}</span><span class="distance">${company.distance ? escapeHtml(company.distance) : '—'}</span></div>
      <div class="tag-row"><span class="tag green">${escapeHtml(status)}</span><span class="tag blue">${escapeHtml(application?.workMode || 'LOCATION')}</span><span class="tag pink">${escapeHtml(application?.priority || 'TRACKED')}</span></div>
      <div class="company-desc">${escapeHtml(company.summary || 'Company details and application notes appear here when available in your local data file.')}</div>
      <div class="company-links">${website}${glassdoor || '<span class="small-link muted-link">GLASSDOOR LINK</span>'}<button class="small-link" id="streetview-link" type="button">STREET VIEW ↗</button></div>
    </div>`;
  byId('streetview-link')?.addEventListener('click', () => showToast('Street View integration is planned for a later version.'));
  byId('application-details').innerHTML = application ? `
    <div class="app-role">${escapeHtml(application.role || 'Role not specified')}</div>
    <div class="app-date">APPLIED &nbsp;${escapeHtml(formatDate(application.appliedAt))}</div>
    <div class="status-track">
      <div class="track-line"><span class="track-point complete"></span></div><div class="track-copy"><b>Application submitted</b><small>${escapeHtml(formatDate(application.appliedAt))}</small></div>
      <div class="track-line"><span class="track-point ${/review|interview|offer/i.test(status) ? 'complete' : ''}"></span></div><div class="track-copy"><b>${escapeHtml(status)}</b><small>${escapeHtml(application.lastUpdated ? formatDate(application.lastUpdated) : 'Latest status')}</small></div>
      <div class="track-line"><span class="track-point"></span></div><div class="track-copy"><b>Next step</b><small>${escapeHtml(application.nextAction || 'No follow-up scheduled')}</small></div>
    </div>` : '<div class="empty-state">No applications recorded for this company yet.</div>';
  byId('notes-button').setAttribute('data-notes', application?.notes || 'No local notes for this company.');
  byId('data-mode').textContent = data.label || 'LOCAL DATA';
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
  const visibleCompanies = data.companies.filter((company) => Array.isArray(company.coordinates) && company.coordinates.length === 2);
  for (const company of visibleCompanies) {
    const app = (company.applications || [])[0];
    const color = statusColor(app?.status);
    const node = document.createElement('button');
    node.type = 'button';
    node.className = `company-marker ${company.id === selectedId ? 'selected' : ''}`;
    node.style.setProperty('--pin-color', color);
    node.style.setProperty('--pin-glow', `${color}99`);
    node.setAttribute('aria-label', `Show ${company.name}`);
    node.innerHTML = `<span>${escapeHtml(initials(company.name))}</span>`;
    node.addEventListener('click', () => selectCompany(company.id));
    const marker = new maplibregl.Marker({ element: node, anchor: 'bottom' }).setLngLat(company.coordinates).addTo(map);
    markerRefs.push(marker);
  }
  byId('map-status').innerHTML = `<span class="status-square"></span><span>${visibleCompanies.length} COMPANY SIGNAL${visibleCompanies.length === 1 ? '' : 'S'}</span><span class="status-divider">·</span><span>1 SELECTED</span>`;
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

function applyFilters() {
  const query = byId('search').value.trim().toLowerCase();
  const status = byId('status-filter').value;
  const matching = data.companies.filter((company) => {
    const app = (company.applications || [])[0];
    const matchesQuery = !query || [company.name, company.sector, company.address, ...(company.applications || []).map((item) => item.role)].join(' ').toLowerCase().includes(query);
    const matchesStatus = status === 'all' || (company.applications || []).some((item) => item.status === status);
    return matchesQuery && matchesStatus && (status === 'all' || app);
  });
  const old = data.companies;
  data.companies = matching;
  drawMarkers();
  data.companies = old;
  if (matching.length && !matching.some((company) => company.id === selectedId)) selectCompany(matching[0].id);
}

function validateData(value) {
  if (!value || !Array.isArray(value.companies)) throw new Error('Expected a JSON object with a “companies” array.');
  for (const company of value.companies) {
    if (!company.id || !company.name) throw new Error('Each company needs an id and name.');
    if (company.coordinates && (!Array.isArray(company.coordinates) || company.coordinates.length !== 2 || company.coordinates.some((n) => !Number.isFinite(Number(n))))) throw new Error(`Coordinates for ${company.name} must be [longitude, latitude].`);
    if (company.applications && !Array.isArray(company.applications)) throw new Error(`Applications for ${company.name} must be an array.`);
  }
}

byId('search').addEventListener('input', applyFilters);
byId('status-filter').addEventListener('change', applyFilters);
byId('load-data').addEventListener('click', () => byId('file-input').click());
byId('file-input').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    validateData(parsed);
    data = { ...parsed, label: parsed.label || 'LOCAL DATA' };
    if (!data.companies.length) throw new Error('This file has no companies yet.');
    selectedId = data.companies[0].id;
    byId('data-mode').textContent = data.label;
    renderCompany(); renderTimeline(); drawMarkers();
    if (selectedCompany()?.coordinates) map.flyTo({ center: selectedCompany().coordinates, zoom: 10.5 });
    showToast(`Loaded ${data.companies.length} companies locally.`);
  } catch (error) {
    showToast(error.message || 'Could not read that file.');
  } finally { event.target.value = ''; }
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
  byId('theme-toggle').setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode');
  byId('theme-toggle').querySelector('.theme-label').textContent = light ? 'LIGHT MODE' : 'DARK MODE';
  byId('theme-toggle').querySelector('.theme-icon').textContent = light ? '☾' : '☼';
});
byId('reset-map').addEventListener('click', () => { byId('search').value = ''; byId('status-filter').value = 'all'; map.flyTo({ center: [-73.62, 45.54], zoom: 10.15 }); applyFilters(); });
byId('followup-button').addEventListener('click', () => showToast('Follow-up editing is planned for the next version.'));
byId('notes-button').addEventListener('click', (event) => showToast(event.currentTarget.dataset.notes || 'No notes for this company.'));
byId('set-origin').addEventListener('click', () => showToast('Origin selection and commute estimates are planned for a later version.'));
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
