let map = L.map('map').setView([55.75, 37.61], 10); // Москва по умолчанию
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap'
}).addTo(map);

const notes = JSON.parse(localStorage.getItem('notes')) || [];
const markers = [];
const list = document.getElementById('note-list');
const input = document.getElementById('note-input');
const button = document.getElementById('save-btn');
const message = document.getElementById('message');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const locateBtn = document.getElementById('locate-btn');
let pendingText = null;

function renderNotes() {
  list.innerHTML = '';
  notes.forEach((note, idx) => {
    if (map.getBounds().contains(note.latlng)) {
      const li = document.createElement('li');
      const textSpan = document.createElement('span');
      textSpan.textContent = note.text;
      li.appendChild(textSpan);

      const editBtn = document.createElement('button');
      editBtn.textContent = '✏️';
      editBtn.addEventListener('click', () => editNote(idx));
      li.appendChild(editBtn);

      const delBtn = document.createElement('button');
      delBtn.textContent = '🗑️';
      delBtn.addEventListener('click', () => deleteNote(idx));
      li.appendChild(delBtn);

      list.appendChild(li);
    }
  });
}

function addMarkerAndNote(text, latlng) {
  const marker = L.marker(latlng).addTo(map).bindPopup(text);
  markers.push(marker);
  notes.push({ text, latlng });
  localStorage.setItem('notes', JSON.stringify(notes));
  renderNotes();
}

function updateButtonState() {
  button.disabled = input.value.trim() === '' || pendingText !== null;
}

function editNote(index) {
  const newText = prompt('Измените текст заметки', notes[index].text);
  if (newText === null) return;
  const text = newText.trim();
  if (text === '') return;
  notes[index].text = text;
  markers[index].bindPopup(text);
  localStorage.setItem('notes', JSON.stringify(notes));
  renderNotes();
}

function deleteNote(index) {
  map.removeLayer(markers[index]);
  markers.splice(index, 1);
  notes.splice(index, 1);
  localStorage.setItem('notes', JSON.stringify(notes));
  renderNotes();
}

input.addEventListener('input', updateButtonState);

searchBtn.addEventListener('click', () => {
  const query = searchInput.value.trim();
  if (!query) return;
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
    .then(res => res.json())
    .then(data => {
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        map.setView([lat, lon], 15);
      } else {
        alert('Адрес не найден');
      }
    })
    .catch(err => console.error(err));
});

locateBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert('Геолокация не поддерживается');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude, longitude } = pos.coords;
      map.setView([latitude, longitude], 15);
    },
    () => alert('Не удалось получить местоположение')
  );
});

map.on('click', e => {
  if (pendingText) {
    addMarkerAndNote(pendingText, e.latlng);
    pendingText = null;
    message.textContent = '';
    updateButtonState();
  }
});

button.addEventListener('click', () => {
  const text = input.value.trim();
  if (!text) return;
  pendingText = text;
  input.value = '';
  message.textContent = 'Теперь выберите место на карте';
  updateButtonState();
});

updateButtonState();

notes.forEach(note => {
  const marker = L.marker(note.latlng).addTo(map).bindPopup(note.text);
  markers.push(marker);
});
renderNotes();
map.on('moveend', renderNotes);
