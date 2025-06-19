/*  NoteMap PWA – script.js  (v7.1)  */
/*  -------------------------------- */

/* ───── 1. Карта ───── */
const map = L.map('map').setView([55.75, 37.61], 10);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);

/* ───── 2. Маркеры ───── */
let userMarker = null, createMarker = null, editMarker = null;

/* ───── 3. Данные ───── */
function saveNotes() {                   // ← объявление ДО первого вызова
  localStorage.setItem('notes', JSON.stringify(notes));
}

const notes = JSON.parse(localStorage.getItem('notes') || '[]');
notes.forEach(n => { if (!n.created) n.created = Date.now(); });
saveNotes();                              // одноразовая синхронизация

let createMode = false, createText = '', createCoords = null;
let editingIndex = null, editingCoords = null;

/* ───── 4. DOM ───── */
const $ = id => document.getElementById(id);
const list = $('note-list'), noteInput = $('note-input');
const saveBtn = $('save-btn'), locateBtn = $('locate-btn');
const locationInp = $('location-input'), filterToggle = $('filterToggle');
const exportBtn = $('export-btn'), importBtn = $('import-btn'), importFile = $('import-file');

/* ───── 5. Утилиты ───── */
function autoGrow(el, first = false) {
  const lh = parseFloat(getComputedStyle(el).lineHeight) || 20;
  if (first) {
    el.style.height = 'auto';
    el.style.minHeight = el.scrollHeight + lh + 'px';
    el.style.height = el.scrollHeight + 'px';
    return;
  }
  if (el.scrollHeight > el.offsetHeight) {
    el.style.height = el.scrollHeight + 'px';
    el.style.minHeight = el.scrollHeight + lh + 'px';
  }
}
const updateCreateMarker = ll => {
  if (createMarker) map.removeLayer(createMarker);
  createMarker = L.marker(ll).addTo(map).bindPopup('Новая').openPopup();
};
const updateEditMarker = ll => {
  if (editMarker) map.removeLayer(editMarker);
  editMarker = L.marker(ll).addTo(map).bindPopup('Редакт.').openPopup();
};
function redrawMarkers() {
  map.eachLayer(l => {
    if (l instanceof L.Marker && ![userMarker, createMarker, editMarker].includes(l))
      map.removeLayer(l);
  });
  notes.forEach(n => L.marker(n.latlng).addTo(map).bindPopup(n.text));
}

/* ───── 6. Фильтр ───── */
function applyBoundsFilter() {
  if (!filterToggle.checked) { list.childNodes.forEach(li => li.style.display = ''); return; }
  const b = map.getBounds();
  list.childNodes.forEach((li, idx) => {
    const n = notes[idx]; if (!n) return;
    li.style.display = b.contains(n.latlng) ? '' : 'none';
  });
}
map.on('moveend', applyBoundsFilter);

/* ───── 7. Список ───── */
function renderNotes() {
  list.innerHTML = ''; redrawMarkers();
  notes.forEach((n, i) => {
    const li = document.createElement('li');

    /* режим редактирования */
    if (editingIndex === i) {
      const ta = document.createElement('textarea');
      ta.value = n.text; ta.style.width = '100%'; ta.style.resize = 'vertical';
      ta.oninput = () => autoGrow(ta);
      const coord = document.createElement('input');
      coord.type = 'text'; coord.style.width = '100%';
      coord.value = `${(editingCoords || n.latlng).lat.toFixed(5)},${(editingCoords || n.latlng).lng.toFixed(5)}`;
      coord.oninput = () => {
        const [lat,lng] = coord.value.split(',').map(Number);
        if (!isNaN(lat)&&!isNaN(lng)) { editingCoords={lat,lng}; updateEditMarker(editingCoords); }
      };
      updateEditMarker(editingCoords || n.latlng);
      const ok = document.createElement('button'); ok.textContent = '💾 Сохранить';
      ok.onclick = () => {
        n.text = ta.value;
        if (editingCoords) n.latlng = editingCoords;
        n.created = Date.now();                       // обновляем время
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
      li.append(ta, coord, ok, cancel); list.appendChild(li);
      autoGrow(ta, true);           // после вставки в DOM
      return;
    }

    /* просмотр */
    const txt = document.createElement('div');
    txt.className = 'note-text'; txt.textContent = n.text;

    const coord = document.createElement('div');
    coord.style.fontSize='12px';
    coord.innerHTML = `📍 <strong>${n.latlng.lat.toFixed(5)}, ${n.latlng.lng.toFixed(5)}</strong>`;

    const time = document.createElement('div');
    time.style.fontSize='12px'; time.innerHTML = `🕒 ${new Date(n.created).toLocaleString()}`;

    const edit = document.createElement('button'); edit.textContent='✏️';
    edit.onclick = () => { editingIndex = i; renderNotes(); };

    const del  = document.createElement('button'); del.textContent='🗑️';
    del.onclick = () => { if(confirm('Удалить?')){ notes.splice(i,1); saveNotes(); renderNotes(); } };

    li.append(txt, coord, time, edit, del); list.appendChild(li);
  });
  applyBoundsFilter();
}

/* ───── 8. Форма создания ───── */
function renderCreateForm() {
  list.innerHTML=''; const li=document.createElement('li');
  const ta=document.createElement('textarea');
  ta.value=createText; ta.style.width='100%'; ta.style.resize='vertical';
  ta.oninput=()=>{ createText=ta.value; autoGrow(ta); };
  const coord=document.createElement('input');
  coord.type='text'; coord.style.width='100%';
  if(createCoords) coord.value=`${createCoords.lat.toFixed(5)},${createCoords.lng.toFixed(5)}`;
  coord.oninput=()=>{ const [lat,lng]=coord.value.split(',').map(Number);
    if(!isNaN(lat)&&!isNaN(lng)){ createCoords={lat,lng}; updateCreateMarker(createCoords);} };
  if(createCoords) updateCreateMarker(createCoords);
  const add=document.createElement('button'); add.textContent='💾 Добавить';
  add.onclick=()=>{
    if(!createCoords) return alert('Сначала укажите координаты');
    notes.push({text:createText,latlng:createCoords,created:Date.now()});
    saveNotes(); if(createMarker){map.removeLayer(createMarker);createMarker=null;}
    createMode=createText=createCoords=false; renderNotes();
  };
  const cancel=document.createElement('button'); cancel.textContent='❌ Отмена';
  cancel.onclick=()=>{ if(createMarker){map.removeLayer(createMarker);createMarker=null;}
    createMode=createText=createCoords=false; renderNotes(); };
  li.append(ta,coord,add,cancel); list.appendChild(li);
  autoGrow(ta, true); applyBoundsFilter();
}

/* ───── 9. Клик по карте ───── */
map.on('click',e=>{
  if(createMode){ createCoords=e.latlng; updateCreateMarker(e.latlng); renderCreateForm(); return; }
  if(editingIndex!==null){ editingCoords=e.latlng; updateEditMarker(e.latlng); renderNotes(); return; }
  const txt=noteInput.value.trim(); if(!txt) return;
  createMode=true; createText=txt; noteInput.value=''; createCoords=e.latlng;
  updateCreateMarker(e.latlng); renderCreateForm();
});

/* ───── 10. Кнопки ───── */
saveBtn.onclick=()=>{ const t=noteInput.value.trim(); if(!t) return;
  createMode=true; createText=t; noteInput.value=''; renderCreateForm(); };

locateBtn.onclick=()=>{
  if(!navigator.geolocation) return alert('Геолокация не поддерживается');
  navigator.geolocation.getCurrentPosition(p=>{
    const ll=[p.coords.latitude,p.coords.longitude]; map.setView(ll,15);
    if(userMarker) map.removeLayer(userMarker);
    userMarker=L.marker(ll,{icon:L.icon({
      iconUrl:'https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png', iconSize:[32,32]
    })}).addTo(map).bindPopup('Вы здесь').openPopup();
  },()=>alert('Не удалось получить позицию'));
};

/* --- экспорт --- */
exportBtn.onclick=()=>{
  const blob=new Blob([JSON.stringify(notes,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url; a.download='notes.json'; a.click(); URL.revokeObjectURL(url);
};

/* --- импорт --- */
importBtn.onclick=()=>importFile.click();
importFile.onchange=e=>{
  const file=e.target.files[0]; if(!file)return;
  const r=new FileReader();
  r.onload=evt=>{
    try{
      const arr=JSON.parse(evt.target.result); if(!Array.isArray(arr)) throw 0;
      arr.forEach(o=>{
        if(!o.text||!o.latlng) return;
        const d=notes.find(n=>n.text===o.text&&n.latlng.lat===o.latlng.lat&&n.latlng.lng===o.latlng.lng);
        if(!d) notes.push(o);
      });
      saveNotes(); renderNotes(); alert('Импорт завершён');
    }catch{ alert('Файл не похож на notes.json'); }
  };
  r.readAsText(file);
};

/* ───── 11. Поиск ───── */
locationInp.addEventListener('keydown',e=>{
  if(e.key!=='Enter')return; e.preventDefault();
  const q=locationInp.value.trim(); if(!q)return;
  const p=q.split(',').map(Number);
  if(p.length===2&&!p.some(isNaN)){ jumpTo({lat:p[0],lng:p[1]}); return; }
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`)
    .then(r=>r.json()).then(j=>{ if(!j.length)return alert('Не найдено');
      jumpTo({lat:+j[0].lat,lng:+j[0].lon}); }).catch(()=>alert('Ошибка геокодера'));
});
function jumpTo(ll){
  map.setView(ll,15);
  if(createMode){ createCoords=ll; updateCreateMarker(ll); renderCreateForm(); }
  else if(editingIndex!==null){ editingCoords=ll; updateEditMarker(ll); renderNotes(); }
}

/* ───── 12. Первый рендер ───── */
renderNotes();
