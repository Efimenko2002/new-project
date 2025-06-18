// NoteMap PWA Script (v3 - улучшенный UX: маркеры, координаты, textarea)
let map = L.map('map').setView([55.75, 37.61], 10);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap'
}).addTo(map);

let userMarker = null;
let createMarker = null;
let editMarker = null;
let currentlyEditingIndex = null;
let editingCoords = null;
let createMode = false;
let createText = '';
let createCoords = null;

const notes = JSON.parse(localStorage.getItem('notes')) || [];
const list = document.getElementById('note-list');
const input = document.getElementById('note-input');
const button = document.getElementById('save-btn');
const locateBtn = document.getElementById('locate-btn');
const locationInput = document.getElementById('location-input');

function renderNotes() {
  list.innerHTML = '';
  notes.forEach((note, index) => {
    const li = document.createElement('li');
    if (currentlyEditingIndex === index) {
      const textarea = document.createElement('textarea');
      textarea.value = note.text;
      textarea.style.width = '100%';
      textarea.rows = 6;
      textarea.style.resize = 'vertical';
      textarea.style.marginBottom = '0.5em';
      textarea.oninput = () => {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      };
      textarea.oninput();

      const coordInput = document.createElement('input');
      coordInput.type = 'text';
      coordInput.placeholder = 'lat,lng';
      coordInput.value = `${(editingCoords || note.latlng).lat.toFixed(5)},${(editingCoords || note.latlng).lng.toFixed(5)}`;
      coordInput.style.width = '100%';
      coordInput.oninput = () => {
        const [lat, lng] = coordInput.value.split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lng)) {
          editingCoords = { lat, lng };
          updateEditMarker(editingCoords);
        }
      };

      updateEditMarker(editingCoords || note.latlng);

      const tip = document.createElement('div');
      tip.textContent = 'Кликните по карте или измените координаты вручную';
      tip.style.fontSize = '0.8em';
      tip.style.color = '#888';

      const saveBtn = document.createElement('button');
      saveBtn.textContent = '💾 Сохранить';
      saveBtn.onclick = () => {
        note.text = textarea.value;
        if (editingCoords) note.latlng = editingCoords;
        currentlyEditingIndex = null;
        editingCoords = null;
        if (editMarker) {
          map.removeLayer(editMarker);
          editMarker = null;
        }
        localStorage.setItem('notes', JSON.stringify(notes));
        renderNotes();
      };

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = '❌ Отмена';
      cancelBtn.onclick = () => {
        currentlyEditingIndex = null;
        editingCoords = null;
        if (editMarker) {
          map.removeLayer(editMarker);
          editMarker = null;
        }
        renderNotes();
      };

      li.appendChild(textarea);
      li.appendChild(coordInput);
      li.appendChild(saveBtn);
      li.appendChild(cancelBtn);
      li.appendChild(tip);
    } else {
      const textBlock = document.createElement('div');
      textBlock.textContent = note.text;
      textBlock.style.whiteSpace = 'pre-wrap';
      textBlock.style.width = '100%';
      textBlock.style.overflowWrap = 'break-word';
      textBlock.style.marginBottom = '0.5em';
      textBlock.style.background = '#f7f7f7';
      textBlock.style.borderRadius = '4px';
      textBlock.style.padding = '0.5em';
      textBlock.style.maxHeight = 'none';

      const coordShow = document.createElement('div');
      coordShow.textContent = `Координаты: ${note.latlng.lat.toFixed(5)}, ${note.latlng.lng.toFixed(5)}`;
      coordShow.style.fontSize = '0.9em';
      coordShow.style.color = '#777';

      const editBtn = document.createElement('button');
      editBtn.textContent = '✏️ Редактировать';
      editBtn.onclick = () => {
        currentlyEditingIndex = index;
        editingCoords = null;
        renderNotes();
      };

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '🗑️';
      deleteBtn.onclick = () => deleteNote(index);

      li.appendChild(textBlock);
      li.appendChild(coordShow);
      li.appendChild(editBtn);
      li.appendChild(deleteBtn);
    }
    list.appendChild(li);
  });
}

function updateCreateMarker(latlng) {
  if (createMarker) map.removeLayer(createMarker);
  createMarker = L.marker(latlng).addTo(map).bindPopup('Новая заметка').openPopup();
}

function updateEditMarker(latlng) {
  if (editMarker) map.removeLayer(editMarker);
  editMarker = L.marker(latlng, { draggable: false }).addTo(map).bindPopup('Редактирование').openPopup();
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
  if (createMode) {
    createCoords = e.latlng;
    updateCreateMarker(e.latlng);
    renderCreateForm();
    return;
  }
  if (currentlyEditingIndex !== null) {
    editingCoords = e.latlng;
    updateEditMarker(e.latlng);
    renderNotes();
    return;
  }
  const text = input.value.trim();
  if (!text) return;
  createMode = true;
  createText = text;
  input.value = '';
  createCoords = e.latlng;
  updateCreateMarker(e.latlng);
  renderCreateForm();
});

button.addEventListener('click', () => {
  const text = input.value.trim();
  if (!text) return;
  createMode = true;
  createText = text;
  input.value = '';
  renderCreateForm();
});

function renderCreateForm() {
  list.innerHTML = '';
  const li = document.createElement('li');
  const textarea = document.createElement('textarea');
  textarea.value = createText;
  textarea.style.width = '100%';
  textarea.rows = 6;
  textarea.style.resize = 'vertical';
  textarea.style.marginBottom = '0.5em';
  textarea.oninput = () => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };
  textarea.oninput();

  const coordInput = document.createElement('input');
  coordInput.type = 'text';
  coordInput.placeholder = 'lat,lng';
  coordInput.value = createCoords ? `${createCoords.lat.toFixed(5)},${createCoords.lng.toFixed(5)}` : '';
  coordInput.style.width = '100%';
  coordInput.oninput = () => {
    const [lat, lng] = coordInput.value.split(',').map(Number);
    if (!isNaN(lat) && !isNaN(lng)) {
      createCoords = { lat, lng };
      updateCreateMarker(createCoords);
    }
  };

  if (createCoords) updateCreateMarker(createCoords);

  const tip = document.createElement('div');
  tip.textContent = 'Кликните по карте или измените координаты вручную';
  tip.style.fontSize = '0.8em';
  tip.style.color = '#888';

  const saveBtn = document.createElement('button');
  saveBtn.textContent = '💾 Добавить';
  saveBtn.onclick = () => {
    if (!createCoords) {
      alert('Укажите координаты кликом на карту или вручную.');
      return;
    }
    addMarkerAndNote(textarea.value, createCoords);
    createMode = false;
    createText = '';
    createCoords = null;
    if (createMarker) {
      map.removeLayer(createMarker);
      createMarker = null;
    }
    renderNotes();
  };

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '❌ Отмена';
  cancelBtn.onclick = () => {
    createMode = false;
    createText = '';
    createCoords = null;
    if (createMarker) {
      map.removeLayer(createMarker);
      createMarker = null;
    }
    renderNotes();
  };

  li.appendChild(textarea);
  li.appendChild(coordInput);
  li.appendChild(saveBtn);
  li.appendChild(cancelBtn);
  li.appendChild(tip);
  list.appendChild(li);
}

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

function redrawMarkers() {
  map.eachLayer(layer => {
    if (layer instanceof L.Marker && layer !== userMarker && layer !== createMarker && layer !== editMarker) {
      map.removeLayer(layer);
    }
  });
  notes.forEach(note => L.marker(note.latlng).addTo(map).bindPopup(note.text));
}

renderNotes();
redrawMarkers();
map.on('moveend', renderNotes);
map.on('moveend', redrawMarkers);
