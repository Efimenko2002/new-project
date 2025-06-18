/*  NoteMap PWA – script.js  (v5.2, full)  */
/*  --------------------------------------  */
/*  Требует только Leaflet CDN и HTML-разметку:             */
/*  - div#map, sidebar с  #note-list, #note-input, buttons  */
/*  - input#location-input, button#locate-btn, button#save-btn */

//////////////////// 1. Карта и тайлы ////////////////////
const map = L.map('map').setView([55.75, 37.61], 10);        // Москва by default
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap'
}).addTo(map);

//////////////////// 2. Системные маркеры ////////////////////
let userMarker   = null;   // «Вы здесь»
let createMarker = null;   // маркер при создании
let editMarker   = null;   // маркер при редактировании

//////////////////// 3. Состояния ////////////////////
const notes  = JSON.parse(localStorage.getItem('notes') || '[]');
let createMode            = false;
let createText            = '';
let createCoords          = null;
let currentlyEditingIndex = null;
let editingCoords         = null;

//////////////////// 4. DOM ////////////////////
const list        = document.getElementById('note-list');
const input       = document.getElementById('note-input');
const saveBtn     = document.getElementById('save-btn');
const locateBtn   = document.getElementById('locate-btn');
const locationInp = document.getElementById('location-input');

//////////////////// 5. Утилиты ////////////////////
const saveNotes = () => localStorage.setItem('notes', JSON.stringify(notes));

function autoGrow(el, extraLine = false) {
  const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
  const currentHeight = el.clientHeight;
  el.style.height = 'auto';
  let newHeight = el.scrollHeight + (extraLine ? lineHeight : 0);
  if (newHeight < currentHeight) newHeight = currentHeight;
  el.style.height = newHeight + 'px';
}

function updateCreateMarker(latlng) {
  if (createMarker) map.removeLayer(createMarker);
  createMarker = L.marker(latlng, { draggable: false })
                  .addTo(map)
                  .bindPopup('Новая заметка')
                  .openPopup();
}

function updateEditMarker(latlng) {
  if (editMarker) map.removeLayer(editMarker);
  editMarker = L.marker(latlng, { draggable: false })
                .addTo(map)
                .bindPopup('Редактирование')
                .openPopup();
}

function redrawMarkers() {
  map.eachLayer(l => {
    if (l instanceof L.Marker && ![userMarker, createMarker, editMarker].includes(l)) {
      map.removeLayer(l);
    }
  });
  notes.forEach(n => L.marker(n.latlng).addTo(map).bindPopup(n.text));
}

//////////////////// 6. Рисуем список ////////////////////
function renderNotes() {
  list.innerHTML = '';
  redrawMarkers();

  notes.forEach((note, i) => {
    const li = document.createElement('li');

    // ----- редактор -----
    if (currentlyEditingIndex === i) {
      const ta = document.createElement('textarea');
      ta.value = note.text;
      ta.rows  = 6;
      ta.style.width = '100%';
      ta.style.resize = 'vertical';
      ta.oninput = () => { autoGrow(ta); };
      autoGrow(ta, true);

      const coordInput = document.createElement('input');
      coordInput.type  = 'text';
      coordInput.style.width = '100%';
      coordInput.value = `${(editingCoords || note.latlng).lat.toFixed(5)},${(editingCoords || note.latlng).lng.toFixed(5)}`;
      coordInput.oninput = () => {
        const [lat,lng] = coordInput.value.split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lng)) {
          editingCoords = { lat, lng };
          updateEditMarker(editingCoords);
        }
      };
      updateEditMarker(editingCoords || note.latlng);

      const tip = document.createElement('div');
      tip.textContent = 'Кликните по карте или введите lat,lng';
      tip.style.fontSize = '0.8em'; tip.style.color = '#666';

      const save = document.createElement('button');
      save.textContent = '💾 Сохранить';
      save.onclick = () => {
        note.text = ta.value;
        if (editingCoords) note.latlng = editingCoords;
        currentlyEditingIndex = null;
        editingCoords = null;
        if (editMarker) { map.removeLayer(editMarker); editMarker = null; }
        saveNotes(); renderNotes();
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

    // ----- просмотр -----
    const text = document.createElement('div');
    text.className = 'note-text';                    // стиль в CSS
    text.textContent = note.text;

    const coord = document.createElement('div');
    coord.textContent = `Координаты: ${note.latlng.lat.toFixed(5)}, ${note.latlng.lng.toFixed(5)}`;
    coord.style.fontSize = '0.9em'; coord.style.color = '#777';

    const edit = document.createElement('button');
    edit.textContent = '✏️ Редактировать';
    edit.onclick = () => {
      currentlyEditingIndex = i;
      editingCoords = null;
      renderNotes();
    };

    const del = document.createElement('button');
    del.textContent = '🗑️'; del.title = 'Удалить';
    del.onclick = () => {
      if (confirm('Удалить заметку?')) {
        notes.splice(i,1); saveNotes(); renderNotes();
      }
    };

    li.append(text, coord, edit, del);
    list.appendChild(li);
  });
}

//////////////////// 7. Форма создания ////////////////////
function renderCreateForm() {
  list.innerHTML = '';
  const li = document.createElement('li');

  const ta = document.createElement('textarea');
  ta.rows = 6; ta.style.width='100%'; ta.style.resize='vertical';
  ta.value = createText; autoGrow(ta, true);
  ta.oninput = () => { createText = ta.value; autoGrow(ta); };

  const coordInput = document.createElement('input');
  coordInput.type='text'; coordInput.style.width='100%';
  if (createCoords) coordInput.value = `${createCoords.lat.toFixed(5)},${createCoords.lng.toFixed(5)}`;
  coordInput.oninput = () => {
    const [lat,lng] = coordInput.value.split(',').map(Number);
    if (!isNaN(lat)&&!isNaN(lng)) {
      createCoords={lat,lng}; updateCreateMarker(createCoords);
    }
  };
  if (createCoords) updateCreateMarker(createCoords);

  const tip=document.createElement('div');
  tip.textContent='Кликните по карте или введите lat,lng';
  tip.style.fontSize='0.8em'; tip.style.color='#666';

  const add=document.createElement('button');
  add.textContent='💾 Добавить';
  add.onclick=()=>{
    if(!createCoords){alert('Укажите координаты');return;}
    notes.push({text:createText,latlng:createCoords});
    saveNotes();
    if(createMarker){map.removeLayer(createMarker);createMarker=null;}
    createMode=false;createText='';createCoords=null;
    renderNotes();
  };

  const cancel=document.createElement('button');
  cancel.textContent='❌ Отмена';
  cancel.onclick=()=>{
    if(createMarker){map.removeLayer(createMarker);createMarker=null;}
    createMode=false;createText='';createCoords=null; renderNotes();
  };

  li.append(ta,coordInput,add,cancel,tip);
  list.appendChild(li);
}

//////////////////// 8. Обработчики карты ////////////////////
map.on('click', e => {
  if(createMode){ createCoords = e.latlng; updateCreateMarker(e.latlng); renderCreateForm(); return; }
  if(currentlyEditingIndex!==null){ editingCoords=e.latlng; updateEditMarker(e.latlng); renderNotes(); return; }

  const txt=input.value.trim();
  if(!txt) return;
  createMode=true; createText=txt; createCoords=e.latlng; input.value='';
  updateCreateMarker(e.latlng); renderCreateForm();
});

//////////////////// 9. Кнопки ////////////////////
saveBtn.onclick = () => {
  const txt=input.value.trim(); if(!txt) return;
  createMode=true; createText=txt; createCoords=null; input.value='';
  renderCreateForm();
};

locateBtn.onclick = () => {
  if(!navigator.geolocation){alert('Геолокация не поддерживается');return;}
  navigator.geolocation.getCurrentPosition(pos=>{
    const latlng=[pos.coords.latitude,pos.coords.longitude];
    map.setView(latlng,15);
    if(userMarker) map.removeLayer(userMarker);
    userMarker=L.marker(latlng,{icon:L.icon({
      iconUrl:'https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png',
      iconSize:[32,32]
    })}).addTo(map).bindPopup('Вы здесь').openPopup();
  },()=>alert('Не удалось получить геопозицию'));
};

//////////////////// 10. Поиск адреса/координат ////////////////////
locationInp.addEventListener('keydown', e=>{
  if(e.key!=='Enter')return;
  e.preventDefault();
  const q=locationInp.value.trim(); if(!q) return;

  const parts=q.split(',').map(Number);
  if(parts.length===2 && !parts.some(isNaN)){
    jumpTo({lat:parts[0],lng:parts[1]}); return;
  }
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`)
    .then(r=>r.json())
    .then(res=>{
      if(!res.length){alert('Ничего не найдено');return;}
      jumpTo({lat:+res[0].lat,lng:+res[0].lon});
    })
    .catch(()=>alert('Ошибка геокодера'));
});

function jumpTo(latlng){
  map.setView(latlng,15);
  if(createMode){ createCoords=latlng; updateCreateMarker(latlng); renderCreateForm(); }
  else if(currentlyEditingIndex!==null){ editingCoords=latlng; updateEditMarker(latlng); renderNotes(); }
}

//////////////////// 11. Фильтрация списка по границам ////////////////////
map.on('moveend', ()=>{
  const b=map.getBounds();
  Array.from(list.children).forEach((li,idx)=>{
    const n=notes[idx]; if(!n) return;
    li.style.display = b.contains(n.latlng) ? '' : 'none';
  });
});

//////////////////// 12. Первая отрисовка ////////////////////
renderNotes();
