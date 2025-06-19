/*  NoteMap PWA – script.js  (v7.1, финальный)  */
/*  ------------------------------------------- */

/*  ─── 0. Утилита сохранения — объявляем первой (чтобы hoisting не ломал) ─── */
function saveNotes() {
  localStorage.setItem('notes', JSON.stringify(notes));
}

/*  Зависимости в index.html:
      – Leaflet CSS/JS   – <link>, <script> CDN
      – div#map          – карта
      – sidebar:  #note-list, #note-input, #save-btn,
                   #location_input, #locate-btn, #filterToggle,
                   #export-btn, #import-btn, #import-file
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
notes.forEach(n => { if (!n.created) n.created = Date.now(); });
saveNotes();                                   // одноразовая синхронизация

let createMode   = false;
let createText   = '';
let createCoords = null;

let editingIndex  = null;
let editingCoords = null;

/* ───── 4. DOM ───── */
const list         = document.getElementById('note-list');
const noteInput    = document.getElementById('note-input');
const saveBtn      = document.getElementById('save-btn');
const locateBtn    = document.getElementById('locate-btn');
const locationInp  = document.getElementById('location-input');
const filterToggle = document.getElementById('filterToggle');
const exportBtn    = document.getElementById('export-btn');
const importBtn    = document.getElementById('import-btn');
const importFile   = document.getElementById('import-file');

/* ───── 5. Вспомогательные ───── */
function autoGrow(el, first = false) {
  const lh = parseFloat(getComputedStyle(el).lineHeight) || 20;
  if (first) {
    el.style.height    = 'auto';
    el.style.minHeight = el.scrollHeight + lh + 'px';
    el.style.height    = el.scrollHeight + 'px';
    return;
  }
  if (el.scrollHeight > el.offsetHeight) {
    el.style.height    = el.scrollHeight + 'px';
    el.style.minHeight = el.scrollHeight + lh + 'px';
  }
}
const short = (t, len = 120) => (t.length > len ? t.slice(0, len) + '…' : t);

function updateCreateMarker(latlng) {
  if (createMarker) map.removeLayer(createMarker);
  createMarker = L.marker(latlng).addTo(map).bindPopup('Новая').openPopup();
}
function updateEditMarker(latlng) {
  if (editMarker) map.removeLayer(editMarker);
  editMarker = L.marker(latlng).addTo(map).bindPopup('Редакт.').openPopup();
}
function redrawMarkers() {
  map.eachLayer(l=>{
    if(l instanceof L.Marker &&
       ![userMarker,createMarker,editMarker].includes(l)){map.removeLayer(l);}
  });
  notes.forEach(n=>L.marker(n.latlng).addTo(map).bindPopup(short(n.text)));
}

/* ───── 6. Фильтр по области ───── */
function applyBoundsFilter() {
  if (!filterToggle.checked) {
    Array.from(list.children).forEach(li => (li.style.display = ''));
    return;
  }
  const b = map.getBounds();
  Array.from(list.children).forEach((li, idx) => {
    const n = notes[idx];
    if (!n) return;
    li.style.display = b.contains(n.latlng) ? '' : 'none';
  });
}
map.on('moveend', applyBoundsFilter);

/* ───── 7. Рендер списка ───── */
function renderNotes() {
  list.innerHTML = '';
  redrawMarkers();

  notes.forEach((n, i) => {
    const li = document.createElement('li');

    /* --- режим редактирования --- */
    if (editingIndex === i) {
      const ta = document.createElement('textarea');
      ta.value = n.text;
      ta.style.width = '100%';
      ta.style.resize = 'vertical';
      li.appendChild(ta);
      autoGrow(ta, true);
      ta.oninput = () => autoGrow(ta);

      const coord = document.createElement('input');
      coord.type = 'text';
      coord.style.width = '100%';
      coord.value = `${(editingCoords||n.latlng).lat.toFixed(5)},${(editingCoords||n.latlng).lng.toFixed(5)}`;
      coord.oninput = () => {
        const [lat,lng] = coord.value.split(',').map(Number);
        if(!isNaN(lat)&&!isNaN(lng)){
          editingCoords={lat,lng};
          updateEditMarker(editingCoords);
        }
      };
      li.appendChild(coord);
      updateEditMarker(editingCoords||n.latlng);

      const ok = document.createElement('button');
      ok.textContent = '💾 Сохранить';
      ok.onclick = () => {
        n.text = ta.value;
        if (editingCoords) n.latlng = editingCoords;
        n.created = Date.now();              // обновляем дату
        editingIndex = editingCoords = null;
        if (editMarker){map.removeLayer(editMarker); editMarker=null;}
        saveNotes(); renderNotes();
      };
      const cancel = document.createElement('button');
      cancel.textContent = '❌ Отмена';
      cancel.onclick = () => {
        editingIndex = editingCoords = null;
        if (editMarker){map.removeLayer(editMarker); editMarker=null;}
        renderNotes();
      };
      li.append(ok, cancel);
      list.appendChild(li);
      return;
    }

    /* --- режим просмотра --- */
    const txt = document.createElement('div');
    txt.className = 'note-text';
    txt.textContent = n.text;

    const coord = document.createElement('div');
    coord.style.fontSize='12px';
    coord.innerHTML = `📍 <strong>${n.latlng.lat.toFixed(5)}, ${n.latlng.lng.toFixed(5)}</strong>`;

    const time = document.createElement('div');
    time.style.fontSize='12px';
    time.innerHTML = `🕒 ${new Date(n.created).toLocaleString()}`;

    const edit = document.createElement('button');
    edit.textContent='✏️'; edit.onclick=()=>{editingIndex=i;renderNotes();};

    const del  = document.createElement('button');
    del.textContent='🗑️';
    del.onclick=()=>{if(confirm('Удалить?')){notes.splice(i,1);saveNotes();renderNotes();}};

    li.append(txt, coord, time, edit, del);
    list.appendChild(li);
  });

  applyBoundsFilter();
}

/* ───── 8. Форма создания ───── */
function renderCreateForm() {
  list.innerHTML='';
  const li=document.createElement('li');

  const ta=document.createElement('textarea');
  ta.value=createText; ta.style.width='100%'; ta.style.resize='vertical';
  li.appendChild(ta); autoGrow(ta,true);
  ta.oninput=()=>{createText=ta.value;autoGrow(ta);};

  const coord=document.createElement('input');
  coord.type='text'; coord.style.width='100%';
  if(createCoords)coord.value=`${createCoords.lat.toFixed(5)},${createCoords.lng.toFixed(5)}`;
  coord.oninput=()=>{
    const [lat,lng]=coord.value.split(',').map(Number);
    if(!isNaN(lat)&&!isNaN(lng)){createCoords={lat,lng};updateCreateMarker(createCoords);}
  };
  li.appendChild(coord);
  if(createCoords)updateCreateMarker(createCoords);

  const add=document.createElement('button'); add.textContent='💾 Добавить';
  add.onclick=()=>{
    if(!createCoords)return alert('Сначала укажите координаты.');
    notes.push({text:createText,latlng:createCoords,created:Date.now()});
    saveNotes();
    if(createMarker){map.removeLayer(createMarker);createMarker=null;}
    createMode=false; createText=''; createCoords=null; renderNotes();
  };
  const cancel=document.createElement('button'); cancel.textContent='❌ Отмена';
  cancel.onclick=()=>{
    if(createMarker){map.removeLayer(createMarker);createMarker=null;}
    createMode=createText=createCoords=false; renderNotes();
  };

  li.append(add,cancel);
  list.appendChild(li);
  applyBoundsFilter();
}

/* ───── 9. Клик по карте ───── */
map.on('click',e=>{
  if(createMode){createCoords=e.latlng;updateCreateMarker(e.latlng);renderCreateForm();return;}
  if(editingIndex!==null){editingCoords=e.latlng;updateEditMarker(e.latlng);renderNotes();return;}

  const txt=noteInput.value.trim();
  if(!txt)return;
  createMode=true; createText=txt; noteInput.value='';
  createCoords=e.latlng; updateCreateMarker(e.latlng); renderCreateForm();
});

/* ───── 10. Кнопки ───── */
saveBtn.onclick=()=>{
  const txt=noteInput.value.trim(); if(!txt)return;
  createMode=true; createText=txt; noteInput.value=''; renderCreateForm();
};

locateBtn.onclick=()=>{
  if(!navigator.geolocation)return alert('Геолокация не поддерживается');
  navigator.geolocation.getCurrentPosition(pos=>{
    const ll=[pos.coords.latitude,pos.coords.longitude];
    map.setView(ll,15);
    if(userMarker)map.removeLayer(userMarker);
    userMarker=L.marker(ll,{icon:L.icon({
      iconUrl:'https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png',
      iconSize:[32,32]
    })}).addTo(map).bindPopup('Вы здесь').openPopup();
  },()=>alert('Не удалось получить позицию'));
};

/* --- экспорт JSON --- */
exportBtn.onclick=()=>{
  const blob=new Blob([JSON.stringify(notes,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download='notes.json'; a.click();
  URL.revokeObjectURL(url);
};

/* --- импорт JSON --- */
importBtn.onclick=()=>importFile.click();
importFile.onchange=e=>{
  const file=e.target.files[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=evt=>{
    try{
      const arr=JSON.parse(evt.target.result);
      if(!Array.isArray(arr))throw 'not array';
      arr.forEach(o=>{
        if(!o.text||!
