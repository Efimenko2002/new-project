// NoteMap PWA Script – v5.1 (полный)
// ----------------------------------

// ───── 1. Инициализация карты ─────
const map = L.map('map').setView([55.75, 37.61], 10);          // Москва по-умолчанию
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap'
}).addTo(map);

// ───── 2. Системные маркеры (не относятся к заметкам) ─────
let userMarker   = null;   // текущее «Вы здесь»
let createMarker = null;   // маркер при создании
let editMarker   = null;   // маркер при редактировании

// ───── 3. Глобальные состояния ─────
const notes        = JSON.parse(localStorage.getItem('notes') || '[]'); // все заметки
let createMode            = false;      // создаём новую?
let createText            = '';         // текст новой заметки
let createCoords          = null;       // координаты новой заметки
let currentlyEditingIndex = null;       // индекс редактируемой заметки
let editingCoords         = null;       // новые координаты при редактировании

// ───── 4. DOM-элементы ─────
const list        = document.getElementById('note-list');
const input       = document.getElementById('note-input');
const saveBtn     = document.getElementById('save-btn');
const locateBtn   = document.getElementById('locate-btn');
const locationInp = document.getElementById('location-input');

// ───── 5. Вспомогательные функции ─────
function saveNotes() {
  localStorage.setItem('notes', JSON.stringify(notes));
}
function autoGrow(el) {                 // динамическая высота textarea
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}
function updateCreateMarker(latlng) {    // маркер во время создания
  if (createMarker) map.removeLayer(createMarker);
  createMarker = L.marker(latlng, { draggable: false })
                  .addTo(map)
                  .bindPopup('Новая заметка')
                  .openPopup();
}
function updateEditMarker(latlng) {      // маркер во время редактирования
  if (editMarker) map.removeLayer(editMarker);
  editMarker = L.marker(latlng, { draggable: false })
                .addTo(map)
                .bindPopup('Редактирование')
                .openPopup();
}
function redrawMarkers() {
  // удалить все пользовательские маркеры (кроме системных)
  map.eachLayer(l => {
    if (l instanceof L.Marker && ![userMarker, createMarker, editMarker].includes(l)) {
      map.removeLayer(l);
    }
  });
  // нарисовать заново
  notes.forEach(n => L.marker(n.latlng)
    .addTo(map)
    .bindPopup(n.text));
}

// ───── 6. Отрисовка списка заметок ─────
function renderNotes() {
  list.innerHTML = '';
  redrawMarkers();

  notes.forEach((note, i) => {
    const li = document.createElement('li');

    // ------ режим редактирования ------
    if (currentlyEditingIndex === i) {
      const ta = document.createElement('textarea');
      ta.value = note.text;
      ta.rows  = 6;
      ta.style.width = '100%';
      ta.style.resize = 'vertical';
      ta.oninput = () => autoGrow(ta);
      autoGrow(ta);

      const coordInput = document.createElement('input');
      coordInput.type  = 'text';
      coordInput.style.width = '100%';
      coordInput.value = `${(editingCoords || note.latlng).lat.toFixed(5)},${(editingCoords || note.latlng).lng.toFixed(5)}`;
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
      tip.style.color    = '#666';

      const save = document.createElement('button');
      save.textContent = '💾 Сохранить';
      save.onclick = () => {
        note.text = ta.value;
        if (editingCoords) note.latlng = editingCoords;
        currentlyEditingIndex = null;
        editingCoords = null;
        if (editMarker) { map.removeLayer(editMarker); editMarker = null; }
        saveNotes();
        renderNotes();
      };

      const cancel = document.createElement('button');
      cancel.textContent = '❌ Отмена';
      cancel.onclick = () => {
        currentlyEditingIndex = null;
        editingCoords = null;
        if (editMarker) { map.removeLayer(editMarker); editMarker = null; }
        renderNotes();
      };

      li.append(ta, coordInput, save, cancel, tip);
      list.appendChild(li);
      return;
    }

    // ------ режим просмотра ------
    const text = document.createElement('div');
    text.textContent     = note.text;
    text.style.whiteSpace= 'pre-wrap';
    text.style.background= '#f7f7f7';
    text.style.padding   = '0.5em';
    text.style.borderRadius = '4px';

    const coord = document.createElement('div');
    coord.textContent = `Координаты: ${note.latlng.lat.toFixed(5)}, ${note.latlng.lng.toFixed(5)}`;
    coord.style.fontSize = '0.9em';
    coord.style.color    = '#777';

    const edit = document.createElement('button');
    edit.textContent = '✏️ Редактировать';
    edit.onclick = () => {
      currentlyEditingIndex = i;
      editingCoords = null;
      renderNotes();
    };

    const del = document.createElement('button');
    del.textContent = '🗑️';
    del.onclick = () => {
      if (confirm('Удалить заметку?')) {
        notes.splice(i, 1);
        saveNotes();
        renderNotes();
      }
    };

    li.append(text, coord, edit, del);
    list.appendChild(li);
  });
}

// ───── 7. Форма создания новой заметки ─────
function renderCreateForm() {
  list.innerHTML = '';
  const li = document.createElement('li');

  const ta = document.createElement('textarea');
  ta.rows = 6;
  ta.style.width = '100%';
  ta.style.resize = 'vertical';
  ta.value = createText;
  ta.oninput = () => { createText = ta.value; autoGrow(ta); };
  autoGrow(ta);

  const coordInput = document.createElement('input');
  coordInput.type  = 'text';
  coordInput.style.width = '100%';
  if (createCoords) coordInput.value = `${createCoords.lat.toFixed(5)},${createCoords.lng.toFixed(5)}`;
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
  tip.style.color    = '#666';

  const add = document.createElement('button');
  add.textContent = '💾 Добавить';
  add.onclick = () => {
    if (!createCoords) { alert('Укажите координаты.'); return; }
    notes.push({ text: createText, latlng: createCoords });
    saveNotes();
    if (createMarker) { map.removeLayer(createMarker); createMarker = null; }
    createMode   = false;
    createText   = '';
    createCoords = null;
    renderNotes();
  };

  const cancel = document.createElement('button');
  cancel.textContent = '❌ Отмена';
  cancel.onclick = () => {
    if (createMarker) { map.removeLayer(createMarker); createMarker = null; }
    createMode   = false;
    createText   = '';
    createCoords = null;
    renderNotes();
  };

  li.append(ta, coordInput, add, cancel, tip);
  list.appendChild(li);
}

// ───── 8. Обработчики карты ─────
map.on('click', e => {
  // режим создания
  if (createMode) {
    createCoords = e.latlng;
    updateCreateMarker(e.latlng);
    renderCreateForm();
    return;
  }
  // режим редактирования
  if (currentlyEditingIndex !== null) {
    editingCoords = e.latlng;
    updateEditMarker(e.latlng);
    renderNotes();
    return;
  }
  // не создаём, не редактируем — если есть текст в верхнем input → начать создание
  const txt = input.value.trim();
  if (!txt) return;
  createMode   = true;
  createText   = txt;
  createCoords = e.latlng;
  input.value  = '';
  updateCreateMarker(e.latlng);
  renderCreateForm();
});

// ───── 9. Кнопки и поля ввода ─────
saveBtn.onclick = () => {
  const txt = input.value.trim();
  if (!txt) return;
  createMode = true;
  createText = txt;
  createCoords = null;
  input.value = '';
  renderCreateForm();
};

locateBtn.onclick = () => {
  if (!navigator.geolocation) { alert('Геолокация не поддерживается'); return; }
  navigator.geolocation.getCurrentPosition(
    pos => {
      const latlng = [pos.coords.latitude, pos.coords.longitude];
      map.setView(latlng, 15);
      if (userMarker) map.removeLayer(userMarker);
      userMarker = L.marker(latlng, {
        icon: L.icon({
          iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png',
          iconSize: [32, 32]
        })
      }).addTo(map).bindPopup('Вы здесь').openPopup();
    },
    () => alert('Не удалось получить геопозицию')
  );
};

// Поиск по адресу или по координатам (Enter в поле)
locationInp.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const query = locationInp.value.trim();
  if (!query) return;

  // 1) координаты через запятую
  const coordParts = query.split(',').map(Number);
  if (coordParts.length === 2 && !coordParts.some(isNaN)) {
    const latlng = { lat: coordParts[0], lng: coordParts[1] };
    map.setView(latlng, 15);
    if (createMode) {
      createCoords = latlng;
      updateCreateMarker(latlng);
      renderCreateForm();
    }
    if (currentlyEditingIndex !== null) {
      editingCoords = latlng;
      updateEditMarker(latlng);
      renderNotes();
    }
    return;
  }

  // 2) поиск адреса через Nominatim
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
    .then(r => r.json())
    .then(res => {
      if (!res.length) { alert('Ничего не найдено'); return; }
      const lat = parseFloat(res[0].lat);
      const lng = parseFloat(res[0].lon);
      const latlng = { lat, lng };
      map.setView(latlng, 15);

      if (createMode) {
        createCoords = latlng;
        updateCreateMarker(latlng);
        renderCreateForm();
      }
      if (currentlyEditingIndex !== null) {
        editingCoords = latlng;
        updateEditMarker(latlng);
        renderNotes();
      }
    })
    .catch(() => alert('Ошибка геокодера'));
});

// Обновление списка заметок при перемещении карты (фильтр по bounds)
map.on('moveend', () => {
  const bounds = map.getBounds();
  Array.from(list.children).forEach((li, idx) => {
    const note = notes[idx];
    if (!note) return;                         // при create/edit пустой список
    li.style.display = bounds.contains(note.latlng) ? '' : 'none';
  });
});

// ───── 10. Первая отрисовка ─────
renderNotes();
