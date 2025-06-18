let map = L.map('map').setView([55.75, 37.61], 10); // Москва по умолчанию
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap'
}).addTo(map);

const notes = JSON.parse(localStorage.getItem('notes')) || [];
const list = document.getElementById('note-list');
const input = document.getElementById('note-input');
const button = document.getElementById('save-btn');

function renderNotes() {
  list.innerHTML = '';
  notes.forEach(note => {
    if (map.getBounds().contains(note.latlng)) {
      const li = document.createElement('li');
      li.textContent = note.text;
      list.appendChild(li);
    }
  });
}

function addMarkerAndNote(text, latlng) {
  L.marker(latlng).addTo(map).bindPopup(text);
  notes.push({ text, latlng });
  localStorage.setItem('notes', JSON.stringify(notes));
  renderNotes();
}

map.on('click', e => {
  const text = input.value.trim();
  if (!text) return;
  addMarkerAndNote(text, e.latlng);
  input.value = '';
});

button.addEventListener('click', () => {
  alert('Чтобы сохранить заметку, кликните по карте!');
});

renderNotes();
notes.forEach(note => L.marker(note.latlng).addTo(map).bindPopup(note.text));
map.on('moveend', renderNotes);
