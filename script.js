/*  NoteMap PWA – script.js  (v6.0, финальный)  */
/*  ------------------------------------------- */

/*  Зависимости в index.html:
      – Leaflet CSS/JS   – <link>, <script> CDN
      – div#map          – карта
      – sidebar:  #note-list, #note-input, #save-btn,
                         #location-input, #locate-btn, #filterToggle
*/

/* ───── 1. Карта ───── */
const map = L.map('map').setView([55.75, 37.61], 10);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);

/* ───── 2. Маркеры (служебные) ───── */
let userMarker   = null;
let createMarker = null;
let editMarker   = null;

/* ───── 3. Данные и состояния ───── */
const notes = JSON.parse(localStorage.getItem('notes') || '[]');

let createMode            = false;   // сейчас создаём новую?
let createText            = '';
let createCoords          = null;

let editingIndex          = null;    // индекс редактируемой заметки
let editingCoords         = null;

/* ───── 4. DOM ───── */
const list        = document.getElementById('note-list');
const noteInput   = document.getElementById('note-input');
const saveBtn     = document.getElementById('save-btn');
const locateBtn   = document.getElementById('locate-btn');
const locationInp = document.getElementById('location-input');
const filterToggle= document.getElementById('filterToggle');

/* ───── 5. Вспомогательные ───── */
const saveNotes = () => localStorage.setItem('notes', JSON.stringify(notes));

function autoGrow(el, first = false) {
  const lh = parseFloat(getComputedStyle(el).lineHeight) || 20;
  if (first) {
    el.style.height    = 'auto';
    el.style.minHeight = el.scrollHeight + lh + 'px';  // +1 строка
    el.style.height    = el.scrollHeight + 'px';
    return;
  }
  if (el.scrollHeight > el.offsetHeight) {
    el.style.height    = el.scrollHeight + 'px';
    el.style.minHeight = el.scrollHeight + lh + 'px';
  }
}

function updateCreateMarker(latlng) {
  if (createMarker) map.removeLayer(createMarker);
  createMarker = L.marker(latlng).addTo(map).bindPopup('Новая').openPopup();
}
function updateEditMarker(latlng) {
  if (editMarker) map.removeLayer(editMarker);
  editMarker = L.marker(latlng).addTo(map).bindPopup('Редакт.').openPopup();
}

function redrawMarkers() {
  map.eachLayer(l => {
    if (l instanceof L.Marker &&
        ![userMarker, createMarker, editMarker].includes(l)) { map.removeLayer(l); }
  });
  notes.forEach(n => L.marker(n.latlng).addTo(map).bindPopup(n.text));
}

/* ───── 6. Фильтр по видимой области ───── */
function applyBoundsFilter() {
  if (!filterToggle.checked) {                     // выключен → показываем всё
    Array.from(list.children).forEach(li => li.style.display = '');
    return;
  }
  const bounds = map.getBounds();
  Array.from(list.children).forEach((li, idx) => {
    const n = notes[idx];
    if (!n) return;                                // первая строка может быть форма
    li.style.display = bounds.contains(n.latlng) ? '' : 'none';
  });
}
map.on('moveend', applyBoundsFilter);

/* ───── 7. Рендер списка ───── */
function renderNotes() {
  list.innerHTML = '';
  redrawMarkers();

  notes.forEach((n, i) => {
    const li = document.createElement('li');

    /* ----- режим редактирования ----- */
    if (editingIndex === i) {
      const ta = document.createElement('textarea');
      ta.value = n.text; ta.style.width = '100%'; ta.style.resize = 'vertical';
      autoGrow(ta, true); ta.oninput = () => autoGrow(ta);

      const coord = document.createElement('input');
      coord.type = 'text'; coord.style.width = '100%';
      coord.value = `${(editingCoords || n.latlng).lat.toFixed(5)},${(editingCoords || n.latlng).lng.toFixed(5)}`;
      coord.oninput = () => {
        const [lat, lng] = coord.value.split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lng)) {
          editingCoords = { lat, lng }; updateEditMarker(editingCoords);
        }
      };
      updateEditMarker(editingCoords || n.latlng);

      const ok   = document.createElement('button'); ok.textContent = '💾 Сохранить';
      ok.onclick = () => {
        n.text = ta.value;
        if (editingCoords) n.latlng = editingCoords;
        editingIndex = editingCoords = null;
        if (editMarker) { map.removeLayer(editMarker); editMarker = null; }
        saveNotes(); renderNotes();
      };
      const cancel = document.createElement('button'); cancel.textContent = '❌ Отмена';
      cancel.onclick = () => {
        editingIndex = editingCoords = null;
        if (editMarker) { map.removeLayer(editMarker); editMarker = null; }
        renderNotes();
      };

      li.append(ta, coord, ok, cancel);
      list.appendChild(li);
      autoGrow(ta, true);
      return;
    }

    /* ----- просмотр ----- */
    const txt = document.createElement('div');
    txt.className = 'note-text';
    txt.textContent = n.text;

    const c   = document.createElement('div');
    c.style.fontSize = '12px';
    c.textContent = `${n.latlng.lat.toFixed(5)}, ${n.latlng.lng.toFixed(5)}`;

    const edit = document.createElement('button'); edit.textContent = '✏️';
    edit.onclick = () => { editingIndex = i; renderNotes(); };

    const del  = document.createElement('button'); del.textContent = '🗑️';
    del.onclick = () => { if (confirm('Удалить?')) { notes.splice(i,1); saveNotes(); renderNotes(); } };

    li.append(txt, c, edit, del);
    list.appendChild(li);
  });

  applyBoundsFilter();        // ← фильтр после полного рендера
}

/* ───── 8. Рендер формы создания ───── */
function renderCreateForm() {
  list.innerHTML = '';
  const li = document.createElement('li');

  const ta = document.createElement('textarea');
  ta.value = createText; ta.style.width='100%'; ta.style.resize='vertical';
  autoGrow(ta, true); ta.oninput = () => { createText = ta.value; autoGrow(ta); };

  const coord = document.createElement('input');
  coord.type='text'; coord.style.width='100%';
  if (createCoords) coord.value = `${createCoords.lat.toFixed(5)},${createCoords.lng.toFixed(5)}`;
  coord.oninput = () => {
    const [lat,lng] = coord.value.split(',').map(Number);
    if (!isNaN(lat)&&!isNaN(lng)) { createCoords={lat,lng}; updateCreateMarker(createCoords); }
  };
  if (createCoords) updateCreateMarker(createCoords);

  const add = document.createElement('button'); add.textContent = '💾 Добавить';
  add.onclick = () => {
    if (!createCoords) return alert('Сначала укажите координаты.');
    notes.push({ text:createText, latlng:createCoords });
    saveNotes();
    if (createMarker) { map.removeLayer(createMarker); createMarker=null; }
    createMode = false; createText = ''; createCoords = null;
    renderNotes();
  };
  const cancel=document.createElement('button'); cancel.textContent='❌ Отмена';
  cancel.onclick=()=>{
    if(createMarker){map.removeLayer(createMarker);createMarker=null;}
    createMode=createText=createCoords=false; renderNotes();
  };

  li.append(ta,coord,add,cancel);
  list.appendChild(li);
  autoGrow(ta, true);
  applyBoundsFilter();
}

/* ───── 9. Клик по карте ───── */
map.on('click', e=>{
  if (createMode) { createCoords = e.latlng; updateCreateMarker(e.latlng); renderCreateForm(); return; }
  if (editingIndex!==null) { editingCoords = e.latlng; updateEditMarker(e.latlng); renderNotes(); return; }

  const txt = noteInput.value.trim();
  if (!txt) return;
  createMode = true; createText = txt; noteInput.value = '';
  createCoords = e.latlng; updateCreateMarker(e.latlng); renderCreateForm();
});

/* ───── 10. Кнопки ───── */
saveBtn.onclick = () => {
  const txt = noteInput.value.trim(); if (!txt) return;
  createMode = true; createText = txt; noteInput.value = ''; renderCreateForm();
};

locateBtn.onclick = () => {
  if (!navigator.geolocation) return alert('Геолокация не поддерживается');
  navigator.geolocation.getCurrentPosition(pos=>{
    const ll=[pos.coords.latitude,pos.coords.longitude];
    map.setView(ll,15);
    if(userMarker) map.removeLayer(userMarker);
    userMarker=L.marker(ll, {icon:L.icon({
      iconUrl:'https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png',
      iconSize:[32,32]
    })}).addTo(map).bindPopup('Вы здесь').openPopup();
  },()=>alert('Не удалось получить позицию'));
};

/* ───── 11. Поиск адреса / координат ───── */
locationInp.addEventListener('keydown',e=>{
  if(e.key!=='Enter') return; e.preventDefault();
  const q=locationInp.value.trim(); if(!q) return;
  const parts=q.split(',').map(Number);
  if(parts.length===2&&!parts.some(isNaN)){ jumpTo({lat:parts[0],lng:parts[1]}); return; }
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`)
    .then(r=>r.json()).then(j=>{
      if(!j.length) return alert('Не найдено');
      jumpTo({lat:+j[0].lat,lng:+j[0].lon});
    }).catch(()=>alert('Ошибка геокодера'));
});
function jumpTo(latlng){
  map.setView(latlng,15);
  if(createMode){ createCoords=latlng; updateCreateMarker(latlng); renderCreateForm(); }
  else if(editingIndex!==null){ editingCoords=latlng; updateEditMarker(latlng); renderNotes(); }
}

/* ───── 12. Первый рендер ───── */
renderNotes();
