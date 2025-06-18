// NoteMap PWA Script (v4 — фиксы отображения, textarea и маркеров)
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
  redrawMarkers();
  notes.forEach((note, index) => {
    const li = document.createElement('li');
    if (currentlyEditingIndex === index) {
      const textarea = document.createElement('textarea');
      textarea.value = note.text;
      textarea.style.width = '100%';
      textarea.style.minWidth = '100%';
      textarea.style.maxWidth = '100%';
      textarea.rows = 6;
      textarea.style.resize = 'vertical';
      textarea.style.marginBottom = '0.5em';
      textarea.oninput = () => {
        textarea.style.width = '100%';
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
