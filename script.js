let map = L.map('map').setView([55.75, 37.61], 10); // Москва по умолчанию
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap'
}).addTo(map);

let userMarker = null;

const notes = JSON.parse(localStorage.getItem('notes')) || [];
const list = document.getElementById('note-list');
const input = document.getElementById('note-input');
const button = document.getElementById('save-btn');
const locateBtn = document.getElementById('locate-btn');
const locationInput = document.getElementById('location-input');

function renderNotes() {
  list.innerHTML = '';
  notes.forEach((note, index) => {
    if (map.getBounds().contains(note.latlng)) {
      const li = document.createElement('li');
      const textInput = document.createElement('input');
      textInput.type = 'text';
      textInput.value = note.text;
      textInput.onchange = () => {
        notes[index].text = textInput.value;
        localStorage.setItem('notes', JSON.stringify(notes));
        renderNotes();
      };
      const coordInput = document.createElement('input');
      coordInput.type = 'text';
      coordInput.placeholder = 'lat,lng';
      coordInput.value = `${note.latlng.lat.toFixed(5)},${note.latlng.lng.toFixed(5)}`;
      coordInput.onchange = () => {
        const [lat, lng] = coordInput.value.split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lng)) {
          note.latlng = { lat, lng };
          localStorage.setItem('notes', JSON.stringify(notes));
          renderNotes();
        }
      };
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '🗑️';
      deleteBtn.onclick = () => deleteNote(index);
      li.appendChild(textInput);
      li.appendChild(coordInput);
      li.appendChild(deleteBtn);
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

function deleteNote(index) {
  if (confirm('Удалить эту заметку?')) {
    notes.splice(index, 1);
    localStorage.setItem('notes', JSON.stringify(notes));
    renderNotes();
  }
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

locateBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert('Геолокация не поддерживается вашим браузером.');
    return;
  }
  navigator.geolocation.getCurrentPosition(position => {
    const { latitude, longitude } = position.coords;
    const latlng = [latitude, longitude];
    map.setView(latlng, 15);
    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.marker(latlng, { icon: L.icon({
      iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    }) }).addTo(map).bindPopup('Вы здесь').openPopup();
  }, () => {
    alert('Не удалось получить ваше местоположение.');
  });
});

locationInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const query = locationInput.value.trim();
    if (!query) return;
    const isCoords = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(query);
    if (isCoords) {
      const [lat, lng] = query.split(',').map(Number);
      map.setView([lat, lng], 15);
    } else {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => {
          if (data.length > 0) {
            const { lat, lon } = data[0];
            map.setView([lat, lon], 15);
          } else {
            alert('Адрес не найден');
          }
        });
    }
  }
});

renderNotes();
notes.forEach(note => L.marker(note.latlng).addTo(map).bindPopup(note.text));
map.on('moveend', renderNotes);
