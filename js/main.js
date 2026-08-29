/* main.js — Script principal del blog (extraido del inline de index.html).
   Se carga con defer para NO bloquear el render: el navegador dibuja toda la pagina
   y ejecuta este script despues. Todas las funciones quedan globales (window) igual
   que antes, asi los onclick del HTML siguen funcionando. */
// ── COUNTDOWN ──
const TRIP_TARGET = Date.UTC(2026, 11, 26, 3, 0, 0);
const TRIP_RETURN = Date.UTC(2027, 1, 1, 3, 0, 0);
function pad(n){ return String(Math.floor(Math.abs(n))).padStart(2,'0'); }
function tick(){
  var now=Date.now(), diff=TRIP_TARGET-now;
  if(diff>0){
    var s=diff/1000;
    document.getElementById('cd-days').textContent=Math.floor(s/86400);
    document.getElementById('cd-hours').textContent=pad(Math.floor((s%86400)/3600));
    document.getElementById('cd-mins').textContent=pad(Math.floor((s%3600)/60));
    document.getElementById('cd-secs').textContent=pad(Math.floor(s%60));
    document.getElementById('cd-status').textContent='para el despegue';
  } else if(now<TRIP_RETURN){
    var s=(now-TRIP_TARGET)/1000;
    document.getElementById('cd-days').textContent=Math.floor(s/86400);
    document.getElementById('cd-hours').textContent=pad(Math.floor((s%86400)/3600));
    document.getElementById('cd-mins').textContent=pad(Math.floor((s%3600)/60));
    document.getElementById('cd-secs').textContent=pad(Math.floor(s%60));
    document.getElementById('cd-status').textContent='¡Estás viajando!';
  } else {
    var s=(now-TRIP_TARGET)/1000;
    document.getElementById('cd-days').textContent=Math.floor(s/86400);
    document.getElementById('cd-hours').textContent=pad(Math.floor((s%86400)/3600));
    document.getElementById('cd-mins').textContent=pad(Math.floor((s%3600)/60));
    document.getElementById('cd-secs').textContent=pad(Math.floor(s%60));
    document.getElementById('cd-status').textContent='desde que comenzó el viaje';
  }
}
tick(); setInterval(tick,1000);

// ── IMÁGENES: transformación on-the-fly de Supabase Storage ──
// Las fotos del diario se suben grandes (~1 MB). Supabase puede redimensionarlas y
// recomprimirlas por URL (endpoint /render/image), así el móvil descarga versiones
// livianas SIN re-subir nada. imgTx() convierte una URL de Storage al ancho pedido;
// imgFallback() vuelve al original si la transformación fallara (p. ej. cuota).
function imgTx(url, width){
  if(!url || url.indexOf('/storage/v1/object/public/')===-1) return url; // solo fotos de Supabase
  return url.replace('/storage/v1/object/public/','/storage/v1/render/image/public/')
       + (url.indexOf('?')>-1?'&':'?') + 'width=' + width + '&quality=75';
}
function imgFallback(el){
  el.onerror = null;
  if(el.src.indexOf('/render/image/public/')>-1){
    el.src = el.src.replace('/render/image/public/','/object/public/').replace(/\?.*$/,'');
  }
}
window.imgTx = imgTx; window.imgFallback = imgFallback;

// ── COUNTRY SELECTOR ──
function showCountry(id){
  document.querySelectorAll('.ccontent').forEach(function(el){el.classList.remove('visible');});
  document.querySelectorAll('.c-card').forEach(function(el){el.classList.remove('active');});
  document.getElementById('content-'+id).classList.add('visible');
  document.getElementById('card-'+id).classList.add('active');
  setTimeout(function(){document.getElementById('content-'+id).scrollIntoView({behavior:'smooth',block:'start'});},120);
}

// ── LIGHTBOX ──
var lbImages=[],lbIndex=0;
function openLb(src,caption){
  document.getElementById('lb-img').src=src;
  document.getElementById('lb-caption').textContent=caption||'';
  document.getElementById('lightbox').classList.add('open');
  document.body.style.overflow='hidden';
  lbImages=[];
  document.querySelectorAll('.g-item img,.zone-img').forEach(function(img){lbImages.push({src:img.src,caption:img.alt});});
  lbIndex=0;
}
function closeLb(e){
  if(!e||e.target===document.getElementById('lightbox')||e.target.id==='lb-close'){
    document.getElementById('lightbox').classList.remove('open');
    document.body.style.overflow='';
  }
}
function lbNav(dir){
  lbIndex=(lbIndex+dir+lbImages.length)%lbImages.length;
  document.getElementById('lb-img').src=lbImages[lbIndex].src;
  document.getElementById('lb-caption').textContent=lbImages[lbIndex].caption;
}
document.addEventListener('keydown',function(e){
  if(e.key==='Escape') closeLb({target:document.getElementById('lightbox')});
  if(e.key==='ArrowRight') lbNav(1);
  if(e.key==='ArrowLeft') lbNav(-1);
});

// ── HALF-STAR RATINGS ──
var RATINGS_KEY='asia_trip_ratings_v2';
var _fbRatings={};
var _fbAllRatings={};
function starsDisplay(val){
  var s='';
  for(var i=1;i<=5;i++){s+=val>=i?'★':val>=i-0.5?'½':'☆';}
  return s;
}
function renderStars(id,ratingsObj){
  var container=document.getElementById('stars-'+id);
  if(!container) return;
  var ratings=ratingsObj||_fbRatings;
  var current=ratings[id]||0;
  container.innerHTML='';
  for(var star=1;star<=5;star++){
    var wrap=document.createElement('span'); wrap.className='star-wrap';
    var lh=document.createElement('span');
    lh.className='half half-left'+(current>=star-0.5?' lit':'');
    lh.textContent='★'; lh.dataset.val=star-0.5;
    var rh=document.createElement('span');
    rh.className='half half-right'+(current>=star?' lit':'');
    rh.textContent='★'; rh.dataset.val=star;
    (function(lid,lhEl,rhEl){
      [lhEl,rhEl].forEach(function(half){
        half.onmouseenter=function(){hoverStars(lid,parseFloat(half.dataset.val));};
        half.onmouseleave=function(){renderStars(lid);};
        half.onclick=function(e){e.stopPropagation();setRating(lid,parseFloat(half.dataset.val));};
      });
    })(id,lh,rh);
    wrap.appendChild(lh); wrap.appendChild(rh); container.appendChild(wrap);
  }
  var saved=document.getElementById('saved-'+id);
  if(saved) saved.textContent=current>0?'¡Guardado! '+starsDisplay(current)+' ('+current+'/5)':'';
}
function hoverStars(id,val){
  var container=document.getElementById('stars-'+id);
  if(!container) return;
  container.querySelectorAll('.half').forEach(function(h){h.classList.toggle('lit',parseFloat(h.dataset.val)<=val);});
}
function setRating(id,val){
  // Puntuar es exclusivo del grupo viajero (rol editor).
  if(!window._currentUser){ showLogin(); return; }
  if(_userRole !== 'editor'){ if(window.openUpgrade) openUpgrade(); return; }
  _fbRatings[id]=val;
  renderStars(id);
  if(window._fb && window._fb.saveRatingFlat){
    var uid=window._currentUser.uid;
    var name=(window._initProfile&&window._initProfile.displayName)||window._currentUser.email.split('@')[0];
    window._fb.saveRatingFlat(id,val,uid,name);
  }
}
var PLACES=[
  {id:'canggu',   place:'Canggu',      country:'Bali \uD83C\uDDEE\uD83C\uDDE9'},
  {id:'ubud',     place:'Ubud',        country:'Bali \uD83C\uDDEE\uD83C\uDDE9'},
  {id:'nusa',     place:'Nusa Penida', country:'Bali \uD83C\uDDEE\uD83C\uDDE9'},
  {id:'bangkok',  place:'Bangkok',     country:'Tailandia \uD83C\uDDF9\uD83C\uDDED'},
  {id:'chiangmai',place:'Chiang Mai',  country:'Tailandia \uD83C\uDDF9\uD83C\uDDED'},
  {id:'phuket',   place:'Phuket',      country:'Tailandia \uD83C\uDDF9\uD83C\uDDED'},
  {id:'krabi',    place:'Krabi',       country:'Tailandia \uD83C\uDDF9\uD83C\uDDED'},
  {id:'osaka',    place:'Osaka',       country:'Jap\u00F3n \uD83C\uDDEF\uD83C\uDDF5'},
  {id:'kyoto',    place:'Kyoto',       country:'Jap\u00F3n \uD83C\uDDEF\uD83C\uDDF5'},
  {id:'nara',     place:'Nara',        country:'Jap\u00F3n \uD83C\uDDEF\uD83C\uDDF5'},
  {id:'tokyo',    place:'Tokyo',       country:'Jap\u00F3n \uD83C\uDDEF\uD83C\uDDF5'},
  {id:'nagano',   place:'Nagano',      country:'Jap\u00F3n \uD83C\uDDEF\uD83C\uDDF5'},
];
PLACES.forEach(function(p){renderStars(p.id,{});});
document.addEventListener('firebase-ready',function(){
  if(window._fb.listenAllRatings){
    window._fb.listenAllRatings(function(allRatings){
      _fbAllRatings=allRatings;
      // Build my own ratings for star display
      var myUid=window._currentUser?window._currentUser.uid:'';
      _fbRatings={};
      PLACES.forEach(function(p){
        if(allRatings[p.id]&&allRatings[p.id][myUid]) _fbRatings[p.id]=allRatings[p.id][myUid].value;
      });
      PLACES.forEach(function(p){renderStars(p.id,_fbRatings);});
      var modal=document.getElementById('scores-modal');
      if(modal && modal.classList.contains('open')) openScores();
    });
  }
});

// ── SCORES MODAL ──
function openScores(){
  var list=document.getElementById('scores-list');
  document.getElementById('scores-modal').querySelector('h3').textContent='Puntuaciones del grupo';

  // Calculate group average per place
  var hasAny=false;
  var allPlacesHTML=PLACES.map(function(p){
    var placeRatings=_fbAllRatings[p.id]||{};
    var members=Object.values(placeRatings);
    var rated=members.filter(function(m){return m.value>0;});
    if(rated.length>0) hasAny=true;
    var avg=rated.length>0?(rated.reduce(function(s,m){return s+m.value;},0)/rated.length):0;
    var avgRounded=Math.round(avg*10)/10;

    var memberRows=rated.map(function(m){
      return '<div style="display:flex;align-items:center;justify-content:space-between;padding:.2rem 0;font-size:.78rem;color:rgba(0,0,0,.55);">'+
        '<span>'+escHtml(m.name||'?')+'</span>'+
        '<span style="color:var(--gold);">'+starsDisplay(m.value)+'</span>'+
      '</div>';
    }).join('');

    var avgDisplay=avg>0?
      '<div style="display:flex;align-items:center;gap:.5rem;">'+
        '<span style="color:var(--gold);font-size:1.05rem;">'+starsDisplay(Math.round(avg))+'</span>'+
        '<span style="font-size:.85rem;font-weight:700;color:var(--ink);">'+avgRounded+'/5</span>'+
        '<span style="font-size:.72rem;color:rgba(0,0,0,.35);">('+rated.length+' voto'+( rated.length!==1?'s':'')+')</span>'+
      '</div>':
      '<span style="color:#ddd;font-size:.95rem;">☆☆☆☆☆</span>';

    return '<div style="background:var(--sand);border-radius:14px;padding:.9rem 1.1rem;margin-bottom:.7rem;">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:'+( rated.length?'.5rem':'0')+';">'+
        '<div><div style="font-weight:600;font-size:.9rem;color:var(--ink);">'+p.place+'</div><div style="font-size:.7rem;color:rgba(0,0,0,.35);">'+p.country+'</div></div>'+
        avgDisplay+
      '</div>'+
      (memberRows?'<div style="border-top:1px solid rgba(0,0,0,.07);padding-top:.4rem;margin-top:.2rem;">'+memberRows+'</div>':'')+
    '</div>';
  });

  if(!hasAny){
    list.innerHTML='<div class="scores-empty">Aún no hay puntuaciones.<br>¡Sé el primero en puntuar!</div>';
  } else {
    // Sort by avg descending, unrated at bottom
    var rated2=PLACES.filter(function(p){return Object.values(_fbAllRatings[p.id]||{}).some(function(m){return m.value>0;});});
    var unrated2=PLACES.filter(function(p){return !Object.values(_fbAllRatings[p.id]||{}).some(function(m){return m.value>0;});});
    var sorted2=[...rated2].sort(function(a,b){
      var avgA=Object.values(_fbAllRatings[a.id]||{}).reduce(function(s,m){return s+m.value;},0)/(Object.values(_fbAllRatings[a.id]||{}).length||1);
      var avgB=Object.values(_fbAllRatings[b.id]||{}).reduce(function(s,m){return s+m.value;},0)/(Object.values(_fbAllRatings[b.id]||{}).length||1);
      return avgB-avgA;
    });
    list.innerHTML=[...sorted2,...unrated2].map(function(p){
      return allPlacesHTML[PLACES.findIndex(function(pl){return pl.id===p.id;})];
    }).join('');
  }
  document.getElementById('scores-modal').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeScores(e){
  if(!e||e.target===document.getElementById('scores-modal')||e.target.id==='scores-close'){
    document.getElementById('scores-modal').classList.remove('open');
    document.body.style.overflow='';
  }
}
function resetRatings(){
  if(!window._currentUser){alert('Inicia sesión');return;}
  if(!confirm('¿Restablecer TUS puntuaciones?')) return;
  var uid=window._currentUser.uid;
  PLACES.forEach(function(p){
    if(window._fb&&window._fb.saveRatingFlat) window._fb.saveRatingFlat(p.id,0,uid,'');
    _fbRatings[p.id]=0;
  });
  PLACES.forEach(function(p){renderStars(p.id,_fbRatings);});
  openScores();
}

// ── CHECKLIST ──
var ACT_KEY='asia_trip_activities';
var _fbChecks={};
function slugify(s){return s.toLowerCase().replace(/[^a-z0-9]/g,'_');}
function initZoneActivities(){
  document.querySelectorAll('.zone-acts').forEach(function(ul){
    var zoneName=ul.closest('.zone-card')?ul.closest('.zone-card').querySelector('.zone-name').textContent:'zone';
    ul.querySelectorAll('li').forEach(function(li,i){
      if(li.dataset.initialized) return;
      li.dataset.initialized='1';
      var key='act_'+slugify(zoneName)+'_'+i;
      li.dataset.key=key;
      var check=document.createElement('span'); check.className='act-check';
      var text=document.createElement('span'); text.textContent=li.textContent.trim();
      li.textContent=''; li.appendChild(check); li.appendChild(text);
      if(_fbChecks[key]) li.classList.add('done');
      li.onclick=function(){toggleAct(li);};
    });
    if(!ul.nextSibling||!ul.nextSibling.classList||!ul.nextSibling.classList.contains('zone-progress')){
      addProgressBar(ul);
    }
  });
}
function toggleAct(li){
  if(_userRole!=='editor') return; // solo el grupo viajero marca actividades
  var key=li.dataset.key;
  var isDone=li.classList.contains('done');
  li.classList.toggle('done',!isDone);
  _fbChecks[key]=!isDone;
  updateProgressBar(li.closest('.zone-acts'));
  if(window._fb && window._fb.saveCheck) window._fb.saveCheck(key,!isDone);
  else { try{var d=JSON.parse(localStorage.getItem(ACT_KEY)||'{}');d[key]=!isDone;localStorage.setItem(ACT_KEY,JSON.stringify(d));}catch(e){} }
}
function addProgressBar(ul){
  var total=ul.querySelectorAll('li').length;
  var doneN=ul.querySelectorAll('li.done').length;
  var pct=total>0?Math.round((doneN/total)*100):0;
  var bar=document.createElement('div'); bar.className='zone-progress';
  bar.innerHTML='<div class="zpbar-label"><span>Progreso del grupo</span><span>'+doneN+'/'+total+'</span></div><div class="zpbar-track"><div class="zpbar-fill" style="width:'+pct+'%"></div></div>';
  if(ul.nextSibling) ul.parentNode.insertBefore(bar,ul.nextSibling);
  else ul.parentNode.appendChild(bar);
}
function updateProgressBar(ul){
  var total=ul.querySelectorAll('li').length;
  var doneN=ul.querySelectorAll('li.done').length;
  var pct=total>0?Math.round((doneN/total)*100):0;
  var bar=ul.nextSibling;
  if(bar&&bar.classList&&bar.classList.contains('zone-progress')){
    bar.querySelector('.zpbar-fill').style.width=pct+'%';
    var lbl=bar.querySelector('.zpbar-label span:last-child');
    if(lbl) lbl.textContent=doneN+'/'+total;
  }
}
document.addEventListener('firebase-ready',function(){
  window._fb.listenChecklist(function(checks){
    _fbChecks=checks;
    document.querySelectorAll('.zone-acts li[data-key]').forEach(function(li){li.classList.toggle('done',!!checks[li.dataset.key]);});
    document.querySelectorAll('.zone-acts').forEach(function(ul){updateProgressBar(ul);});
  });
});
document.addEventListener('DOMContentLoaded',initZoneActivities);
if(document.readyState!=='loading') initZoneActivities();

// ── REACCIONES DEL DIARIO ──
var REACTIONS = ['❤️','😂','😮','🔥','👏'];
var _reactionUnsubs = {};

function renderReactionBar(entryId, counts, userReacted){
  var uid = window._currentUser ? window._currentUser.uid : null;
  return REACTIONS.map(function(emoji){
    var count  = counts[emoji] || 0;
    var reacted = uid && userReacted[emoji] && userReacted[emoji][uid];
    return '<button class="reaction-btn'+(reacted?' reacted':'')+'" '+
      'onclick="toggleReaction(\''+entryId+'\',\''+emoji+'\')" '+
      'title="'+(reacted?'Quitar ':'')+'reacción">'+
      '<span class="reaction-emoji">'+emoji+'</span>'+
      (count > 0 ? '<span class="reaction-count">'+count+'</span>' : '')+
    '</button>';
  }).join('');
}

function toggleReaction(entryId, emoji){
  if(!window._currentUser){ showLogin(); return; }
  if(!window._fb||!window._fb.toggleReaction) return;
  var uid  = window._currentUser.uid;
  var name = (window._initProfile&&window._initProfile.displayName)||window._currentUser.email.split('@')[0];
  window._fb.toggleReaction(entryId, emoji, uid, name);
  // Optimistic UI: the onSnapshot listener will update immediately
}

function listenReactions(entryId){
  if(_reactionUnsubs[entryId]) return; // already listening
  if(!window._fb||!window._fb.listenReactions) return;
  _reactionUnsubs[entryId] = window._fb.listenReactions(entryId, function(counts, userReacted){
    var bar = document.getElementById('reactions-'+entryId);
    if(bar) bar.innerHTML = renderReactionBar(entryId, counts, userReacted);
  });
}

// ── DIARIO ──
var DIARIO_KEY='asia_diario_v1';
var pendingPhotos=[];
var currentFilter='';
var _searchQuery='';
function searchDiario(q){ _searchQuery=q.toLowerCase().trim(); renderDiario(_lastEntries); }
var _unsubDiario=null;
var _userRole='viewer';
function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

document.addEventListener('DOMContentLoaded',function(){
  var inp=document.getElementById('diario-photo-input');
  if(!inp) return;
  inp.addEventListener('change',function(){
    pendingPhotos=[];
    document.getElementById('de-preview').innerHTML='';
    Array.from(this.files).slice(0,3).forEach(function(file){
      var reader=new FileReader();
      reader.onload=function(e){
        var img=new Image();
        img.onload=function(){
          var canvas=document.createElement('canvas');
          // 1600px basta para verse nítida en el lightbox de un teléfono (retina) y pesa
          // ~250-350KB en vez de ~1MB. Además al mostrarse se transforma aún más (imgTx).
          var maxW=1600,maxH=1600,w=img.width,h=img.height;
          if(w>maxW){h=Math.round(h*maxW/w);w=maxW;}
          if(h>maxH){w=Math.round(w*maxH/h);h=maxH;}
          canvas.width=w;canvas.height=h;
          canvas.getContext('2d').drawImage(img,0,0,w,h);
          var c=canvas.toDataURL('image/jpeg',0.82);
          pendingPhotos.push(c);
          var prev=document.createElement('img');
          prev.className='diario-preview-img';prev.src=c;
          document.getElementById('de-preview').appendChild(prev);
        };
        img.src=e.target.result;
      };
      reader.readAsDataURL(file);
    });
  });
});

function submitEntry(){
  if(!window._currentUser){ showLogin(); return; }
  if(_userRole !== 'editor'){ alert('Solo el grupo viajero puede publicar entradas.'); return; }
  // Autofill author from logged-in user
  var authorEl=document.getElementById('de-author');
  if(!authorEl.value.trim() && window._currentUser){
    var p=window._initProfile;
    var auto=(p&&p.username)?('@'+p.username):(p&&p.displayName)?p.displayName:(window._initUsername?('@'+window._initUsername):window._currentUser.email.split('@')[0]);
    authorEl.value=auto;
  }
  var author=authorEl.value.trim();
  var date=document.getElementById('de-date').value;
  var placeVal=document.getElementById('de-place').value;
  var title=document.getElementById('de-title').value.trim();
  var text=document.getElementById('de-text').value.trim();
  if(!author){alert('Escribe tu nombre');return;}
  if(!placeVal){alert('Selecciona un destino');return;}
  if(!title){alert('Ponle un título');return;}
  var parts=placeVal.split('|');
  var entry={author:author,date:date||new Date().toISOString().slice(0,10),place:parts[0],country:parts[1]||'',title:title,text:text,photos:pendingPhotos.slice()};
  var btn=document.querySelector('.diario-submit');
  if(btn){ btn.disabled=true; btn.textContent='Guardando...'; }
  if(window._fb) window._fb.saveDiarioEntry(entry).then(function(id){
    if(btn){ btn.disabled=false; btn.textContent='Publicar entrada'; }
    if(id){
      ['de-author','de-title','de-text'].forEach(function(id){document.getElementById(id).value='';});
      document.getElementById('de-date').value='';
      document.getElementById('de-place').value='';
      document.getElementById('de-preview').innerHTML='';
      document.getElementById('diario-photo-input').value='';
      pendingPhotos=[];
    } else {
      alert('Error al guardar. Revisa tu conexión.');
    }
  });
}

// ── EDITAR ENTRADA ──
var _editingEntry=null;
function openEditModal(btn){
  var wrap=btn.closest('.diario-entry-wrap');
  if(!wrap) return;
  var id=wrap.querySelector('.diario-entry').dataset.entryId;
  _editingEntry=_lastEntries.find(function(e){return e.id===id;});
  if(!_editingEntry) return;
  document.getElementById('edit-id').value=id;
  document.getElementById('edit-date').value=_editingEntry.date||'';
  document.getElementById('edit-title').value=_editingEntry.title||'';
  document.getElementById('edit-text').value=_editingEntry.text||'';
  var sel=document.getElementById('edit-place');
  var key=(_editingEntry.place||'')+'|'+(_editingEntry.country||'bali');
  for(var i=0;i<sel.options.length;i++){if(sel.options[i].value===key){sel.selectedIndex=i;break;}}
  document.getElementById('edit-msg').textContent='';
  document.getElementById('edit-modal').style.display='flex';
  document.body.style.overflow='hidden';
}
function closeEditModal(){
  document.getElementById('edit-modal').style.display='none';
  document.body.style.overflow='';
  _editingEntry=null;
}
function saveEdit(){
  var id=document.getElementById('edit-id').value;
  if(!id||!window._fb||!window._fb.updateDiarioEntry) return;
  var parts=document.getElementById('edit-place').value.split('|');
  var data={title:document.getElementById('edit-title').value.trim(),text:document.getElementById('edit-text').value.trim(),date:document.getElementById('edit-date').value,place:parts[0],country:parts[1]||'bali'};
  var msgEl=document.getElementById('edit-msg');
  if(!data.title){msgEl.textContent='El título no puede estar vacío';msgEl.style.color='var(--ember)';return;}
  var btn=document.getElementById('edit-save-btn');
  btn.disabled=true;btn.textContent='Guardando...';
  window._fb.updateDiarioEntry(id,data).then(function(ok){
    btn.disabled=false;btn.textContent='Guardar cambios';
    if(ok){msgEl.textContent='Guardado';msgEl.style.color='var(--moss)';setTimeout(closeEditModal,700);}
    else{msgEl.textContent='Error al guardar';msgEl.style.color='var(--ember)';}
  });
}
function deleteEntry(id){
  if(!window._currentUser || _userRole !== 'editor') return;
  if(!confirm('¿Eliminar esta entrada?')) return;
  if(window._fb) window._fb.deleteDiarioEntry(id);
}

function filterDiario(country,btn){
  currentFilter=country;
  document.querySelectorAll('.df-btn').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
}

function renderDiario(entries){
  var grid=document.getElementById('diario-grid');
  if(!grid) return;
  var filtered=(currentFilter?entries.filter(function(e){return e.country===currentFilter;}):entries).filter(function(e){
    if(!_searchQuery) return true;
    return ((e.title||'')+(e.text||'')+(e.place||'')+(e.author||'')).toLowerCase().indexOf(_searchQuery)>=0;
  });
  if(filtered.length===0){
    grid.innerHTML='<div class="diario-empty" style="grid-column:1/-1">Aún no hay entradas'+(currentFilter?' para este destino':'')+'.<br>¡Sé el primero en compartir!</div>';
    return;
  }
  var canEdit=window._currentUser && _userRole==='editor';
  grid.innerHTML=filtered.map(function(e){
    var colorClass='de-place-'+(e.country||'bali');
    var dateStr=e.date?new Date(e.date+'T12:00:00').toLocaleDateString('es-CL',{day:'numeric',month:'short',year:'numeric'}):'';
    var photosHTML='';
    if(e.photos&&e.photos.length>0){
      _lbPhotoMap[e.id] = e.photos;
      photosHTML='<div class="de-photos">'+e.photos.map(function(src,i){
        return '<img class="de-photo" loading="lazy" src="'+imgTx(src,900)+'" onerror="imgFallback(this)" alt="foto" onclick="openLightbox(\''+e.id+'\','+i+')" style="cursor:zoom-in">';
      }).join('')+'</div>';
    }
    var loggedIn=!!window._currentUser;
    return '<div class="diario-entry-wrap">'+(canEdit?'<button class="de-delete" onclick="delEntry(this)" title="Eliminar entrada">✕</button>'+'<button class="de-edit-btn" onclick="openEditModal(this)" title="Editar entrada">&#9998;</button>':'')+
      '<div class="diario-entry" data-entry-id="'+e.id+'">'+
      photosHTML+
      '<div class="de-body">'+
        '<div class="de-meta"><span class="de-place '+colorClass+'">'+escHtml(e.place)+'</span><span class="de-date">'+dateStr+'</span></div>'+
        '<div class="de-title">'+escHtml(e.title)+'</div>'+
        (e.text?'<div class="de-text">'+escHtml(e.text)+'</div>':'')+
        '<div style="margin-top:.7rem;">'+
          '<span class="de-author">'+escHtml(e.author)+'</span>'+
        '</div>'+
      '</div>'+
      '<div class="de-reactions" id="reactions-'+e.id+'">'+
        renderReactionBar(e.id, {}, {})+
      '</div>'+
      '<div class="de-comments">'+
        '<div class="de-comments-title">Comentarios</div>'+
        '<div class="comment-list" id="comments-'+e.id+'"><div class="no-comments">Sin comentarios a\u00FAn</div></div>'+
        (loggedIn
          ? '<div class="comment-form"><input class="comment-input" id="cinput-'+e.id+'" placeholder="Escribe un comentario..." maxlength="300"><button class="comment-send" onclick="sendComment(\''+e.id+'\')">Enviar</button></div>'
          : '<span class="comment-login-hint" onclick="showLogin()">Inicia sesi\u00F3n para comentar</span>'
        )+
      '</div>'+
    '</div></div>';
  }).join('');
  setTimeout(function(){
    observeEntries();
    // Iniciar listeners de reacciones para entradas visibles
    if(window._fbReady){
      entries.forEach(function(e){ listenReactions(e.id); });
    }
  },100);
}

var _lastEntries=[];
document.addEventListener('firebase-ready',function(){
  if(_unsubDiario) _unsubDiario();
  _unsubDiario=window._fb.listenDiario(function(entries){
    _lastEntries=entries;
    renderDiario(entries);
    document.querySelectorAll('.df-btn').forEach(function(btn){
      btn.onclick=function(){filterDiario(btn.dataset.filter||'',btn);renderDiario(_lastEntries);};
    });
  });
});
document.addEventListener('DOMContentLoaded',function(){
  if(!window._fbReady){
    setTimeout(function(){if(!window._fbReady){try{renderDiario(JSON.parse(localStorage.getItem(DIARIO_KEY)||'[]'));}catch(e){}}},3000);
  }
});

// ── COMENTARIOS ──
var _commentUnsubs={};
var _commentObserver=new IntersectionObserver(function(entries){
  entries.forEach(function(entry){
    if(entry.isIntersecting){
      var id=entry.target.dataset.entryId;
      if(id) loadComments(id);
    }
  });
},{threshold:0.1});

function observeEntries(){
  document.querySelectorAll('.diario-entry[data-entry-id]').forEach(function(el){
    _commentObserver.observe(el);
  });
}
function loadComments(entryId){
  if(_commentUnsubs[entryId]) return;
  if(!window._fb||!window._fb.listenComments) return;
  _commentUnsubs[entryId]=window._fb.listenComments(entryId,function(comments){
    var list=document.getElementById('comments-'+entryId);
    if(!list) return;
    if(comments.length===0){list.innerHTML='<div class="no-comments">Sin comentarios a\u00FAn</div>';return;}
    list.innerHTML=comments.map(function(c){
      var initial=c.author?c.author.charAt(0).toUpperCase():'?';
      var canDel=window._currentUser&&(window._currentUser.uid===c.uid||_userRole==='editor');
      return '<div class="comment-item" data-entry="'+entryId+'" data-cid="'+c.id+'">'+
        '<div class="comment-avatar">'+initial+'</div>'+
        '<div class="comment-body">'+
          '<div class="comment-author">'+escHtml(c.author)+'</div>'+
          '<div class="comment-text">'+escHtml(c.text)+'</div>'+
        '</div>'+
        (canDel?'<button class="comment-del" onclick="delCmt(this)">\u2715</button>':'')+
      '</div>';
    }).join('');
  });
}
function sendComment(entryId){
  var input=document.getElementById('cinput-'+entryId);
  if(!input) return;
  var text=input.value.trim();
  if(!text) return;
  if(!window._currentUser){showLogin();return;}
  // Use @username or displayName if available, fallback to email prefix
  var uid = window._currentUser.uid;
  var getAuthorAndSend = function(author){
    input.value=''; input.disabled=true;
    window._fb.saveComment(entryId,{text:text,author:author,uid:uid}).then(function(){input.disabled=false;input.focus();});
  };
  if(window._fb && window._fb.getProfile){
    window._fb.getProfile(uid).then(function(profile){
      var author = '';
      if(profile && profile.username) author = '@'+profile.username;
      else if(profile && profile.displayName) author = profile.displayName;
      else { author = window._currentUser.email.split('@')[0]; author = author.charAt(0).toUpperCase()+author.slice(1); }
      getAuthorAndSend(author);
    });
  } else {
    var author=window._currentUser.email.split('@')[0];
    author=author.charAt(0).toUpperCase()+author.slice(1);
    getAuthorAndSend(author);
  }
}
function delCmt(btn){
  var item=btn.closest('.comment-item');
  if(!item) return;
  if(!confirm('\u00BFEliminar este comentario?')) return;
  window._fb.deleteComment(item.dataset.entry,item.dataset.cid);
}
function delEntry(btn){
  var wrap=btn.closest('.diario-entry-wrap');
  if(!wrap) return;
  var entry=wrap.querySelector('.diario-entry');
  if(!entry) return;
  deleteEntry(entry.dataset.entryId);
}
document.addEventListener('keydown',function(e){
  if(e.key==='Enter'&&e.target.classList.contains('comment-input')){
    sendComment(e.target.id.replace('cinput-',''));
  }
});

// ── AUTH ──
window._currentUser=null;
var _userRole='viewer';

function showLogin(){
  document.getElementById('login-overlay').classList.add('visible');
  setTimeout(function(){document.getElementById('login-email').focus();},300);
}
function hideLogin(){document.getElementById('login-overlay').classList.remove('visible');}

function switchTab(tab){
  document.getElementById('tab-login').classList.toggle('active',tab==='login');
  document.getElementById('tab-register').classList.toggle('active',tab==='register');
  document.getElementById('form-login').style.display=tab==='login'?'block':'none';
  document.getElementById('form-register').style.display=tab==='register'?'block':'none';
  document.getElementById('login-error').classList.remove('visible');
  document.getElementById('login-success').classList.remove('visible');
}

function doLogin(){
  var email=document.getElementById('login-email').value.trim();
  var pass=document.getElementById('login-pass').value;
  var btn=document.getElementById('login-submit');
  if(!email||!pass){showErr('Completa todos los campos');return;}
  btn.disabled=true; btn.textContent='Entrando...';
  document.getElementById('login-error').classList.remove('visible');
  if(window._fb&&window._fb.login){
    window._fb.login(email,pass).then(function(res){
      btn.disabled=false; btn.textContent='Entrar al viaje \u2192';
      if(res.ok){hideLogin();document.getElementById('login-email').value='';document.getElementById('login-pass').value='';}
      else showErr(res.msg);
    });
  } else {btn.disabled=false;btn.textContent='Entrar al viaje \u2192';showErr('Firebase no disponible.');}
}

function doRegister(){
  var username=(document.getElementById('reg-username').value||'').trim().toLowerCase();
  var email=document.getElementById('reg-email').value.trim();
  var pass=document.getElementById('reg-pass').value;
  var code=document.getElementById('reg-code').value.trim();
  var btn=document.getElementById('reg-submit');
  var ok=document.getElementById('login-success');
  if(!username){showErr('Elige un nombre de usuario (@usuario)');return;}
  if(username.length<3){showErr('El nombre de usuario debe tener al menos 3 caracteres');return;}
  if(!email||!pass){showErr('Completa correo y contraseña');return;}
  btn.disabled=true; btn.textContent='Creando cuenta...';
  document.getElementById('login-error').classList.remove('visible');
  ok.classList.remove('visible');
  if(window._fb&&window._fb.register){
    window._fb.register(email,pass,code,username).then(function(res){
      btn.disabled=false; btn.textContent='Crear cuenta →';
      if(res.ok){
        var msg=res.role==='editor'?'¡Cuenta creada! Eres parte del grupo viajero':'¡Cuenta creada! Ya puedes comentar las publicaciones';
        ok.textContent=msg; ok.classList.add('visible');
        document.getElementById('reg-username').value='';
        document.getElementById('reg-email').value=''; document.getElementById('reg-pass').value=''; document.getElementById('reg-code').value='';
        document.getElementById('username-check-msg').textContent='';
        if(window._currentUser&&window._fb.getUserRole){
          window._fb.getUserRole(window._currentUser.uid).then(function(role){_userRole=role;updateUIForRole(role);});
        }
        setTimeout(hideLogin,1800);
      } else showErr(res.msg);
    });
  } else {btn.disabled=false;btn.textContent='Crear cuenta →';showErr('Firebase no disponible.');}
}

function showErr(msg){
  var err=document.getElementById('login-error');
  err.textContent=msg; err.classList.add('visible');
}

function doLogout(){
  if(window._fb&&window._fb.logout) window._fb.logout().then(function(){updateNavUser(null);});
}
function handleNavUser(){
  if(window._currentUser) openProfile(); else showLogin();
}

var _navProfileListenUnsub = null;

function updateNavUser(user){
  var navUser    = document.getElementById('nav-user');
  var navText    = document.getElementById('nav-user-text');
  var navAvBtn   = document.getElementById('nav-av-btn');
  var navLogout  = document.getElementById('nav-logout-btn');
  var navUpgrade = document.getElementById('nav-upgrade-btn');
  var navMsg     = document.getElementById('nav-msg-btn');

  if(_navProfileListenUnsub){ _navProfileListenUnsub(); _navProfileListenUnsub=null; }

  if(user){
    // Show logged-in state immediately
    if(navUser)    navUser.classList.remove('logged-out');
    if(navAvBtn)   navAvBtn.style.display='flex';
    if(navLogout)  navLogout.style.display='inline-block';
    if(navMsg)     navMsg.style.display='block';

    // Fallback name from email
    var fallback = user.email.split('@')[0];
    fallback = fallback.charAt(0).toUpperCase() + fallback.slice(1);
    if(navText) navText.textContent = fallback;
    // Show avatar initial right away
    setAvatarUI(null, fallback);

    // Fetch role
    if(window._fb && window._fb.getUserRole){
      window._fb.getUserRole(user.uid).then(function(role){
        _userRole = role;
        updateUIForRole(role);
        if(navUpgrade) navUpgrade.style.display = (role==='editor') ? 'none' : 'inline-block';
        if(_lastEntries.length>0) renderDiario(_lastEntries);
      });
    }

    // Load profile for name + avatar (single listener)
    if(window._fb && window._fb.listenProfile){
      _navProfileListenUnsub = window._fb.listenProfile(user.uid, function(profile){
        var label = (profile&&profile.username)?('@'+profile.username):(profile&&profile.displayName)?profile.displayName:fallback;
        if(navText) navText.textContent = label.charAt(0).toUpperCase() + label.slice(1);
        setAvatarUI((profile&&profile.avatarUrl)||null, (profile&&profile.displayName)||fallback);
      });
    }

    // Message badge
    if(window._fb && window._fb.listenInbox) startNavMsgListener(user.uid);

  } else {
    _userRole = 'viewer';
    if(navUser)    navUser.classList.add('logged-out');
    if(navText)    navText.textContent = 'Iniciar sesión';
    if(navAvBtn)   navAvBtn.style.display='none';
    if(navLogout)  navLogout.style.display='none';
    if(navUpgrade) navUpgrade.style.display='none';
    if(navMsg)     navMsg.style.display='none';
    // Ocultar preparacion e Info
    var prepSection = document.getElementById('preparacion');
    var prepBtn     = document.getElementById('nav-prep-btn');
    if(prepSection) prepSection.style.display='none';
    if(prepBtn)     prepBtn.style.display='none';
    var loDatosSec = document.getElementById('datos'), loDatosBtn = document.getElementById('nav-datos-btn');
    if(loDatosSec) loDatosSec.style.display='none';
    if(loDatosBtn) loDatosBtn.style.display='none';
    var loForm=document.getElementById('diario-form'); if(loForm) loForm.style.display='none';
    // Reset avatar
    var inner = document.getElementById('nav-av-inner');
    if(inner) inner.textContent = '?';
    addLocks();
    if(_lastEntries.length>0) renderDiario(_lastEntries);
    if(_navMsgUnsub){ _navMsgUnsub(); _navMsgUnsub=null; }
    // Limpiar listeners de reacciones
    Object.keys(_reactionUnsubs).forEach(function(k){ if(_reactionUnsubs[k]) _reactionUnsubs[k](); });
    _reactionUnsubs = {};
    updateNavMsgBadge(0);
  }
}


function updateUIForRole(role){
  var prepSection = document.getElementById('preparacion');
  var prepBtn     = document.getElementById('nav-prep-btn');
  if(role==='editor'){
    removeLocks();
    var upBtn=document.getElementById('nav-upgrade-btn');
    if(upBtn) upBtn.style.display='none';
    // Mostrar sección y botón de preparacion
    if(prepSection) prepSection.style.display='block';
    if(prepBtn)     prepBtn.style.display='inline-block';
    // Mostrar seccion y boton de Info (apps y datos) — solo grupo viajero
    var edDatosSec=document.getElementById('datos'), edDatosBtn=document.getElementById('nav-datos-btn');
    if(edDatosSec) edDatosSec.style.display='block';
    if(edDatosBtn) edDatosBtn.style.display='inline-block';
    var edForm=document.getElementById('diario-form'); if(edForm) edForm.style.display='block';
    // Cargar tasas si aún no se han cargado
    setTimeout(loadExchangeRates, 300);
  } else {
    addLocks();
    if(window._currentUser){
      var upBtn=document.getElementById('nav-upgrade-btn');
      if(upBtn) upBtn.style.display='inline-block';
    }
    // Ocultar sección y botón de preparacion para viewers
    if(prepSection) prepSection.style.display='none';
    if(prepBtn)     prepBtn.style.display='none';
    var vwDatosSec=document.getElementById('datos'), vwDatosBtn=document.getElementById('nav-datos-btn');
    if(vwDatosSec) vwDatosSec.style.display='none';
    if(vwDatosBtn) vwDatosBtn.style.display='none';
    var vwForm=document.getElementById('diario-form'); if(vwForm) vwForm.style.display='none';
  }
}

function openUpgrade(){
  document.getElementById('upgrade-modal').style.display='flex';
  document.body.style.overflow='hidden';
  document.getElementById('upgrade-code').value='';
  document.getElementById('upgrade-error').style.display='none';
  document.getElementById('upgrade-success').style.display='none';
  setTimeout(function(){document.getElementById('upgrade-code').focus();},200);
}
function closeUpgrade(e){
  if(!e||e.target===document.getElementById('upgrade-modal')||e.type==='click'&&!e.target.id.includes('upgrade-btn')){
    document.getElementById('upgrade-modal').style.display='none';
    document.body.style.overflow='';
  }
}
function doUpgrade(){
  var code=document.getElementById('upgrade-code').value.trim();
  var errEl=document.getElementById('upgrade-error');
  var okEl=document.getElementById('upgrade-success');
  var btn=document.getElementById('upgrade-btn');
  errEl.style.display='none'; okEl.style.display='none';
  if(!code){errEl.textContent='Ingresa el código de invitación';errEl.style.display='block';return;}
  if(code!=='viaje26'){errEl.textContent='Código incorrecto. Pídele el código al grupo';errEl.style.display='block';return;}
  if(!window._currentUser){errEl.textContent='Debes iniciar sesión primero';errEl.style.display='block';return;}
  btn.disabled=true; btn.textContent='Actualizando...';
  var uid=window._currentUser.uid;
  // Update role in Firestore
  if(window._fb && window._fb.upgradeToEditor){
    window._fb.upgradeToEditor(uid).then(function(ok){
      btn.disabled=false; btn.textContent='Unirme →';
      if(ok){
        okEl.textContent='¡Bienvenido al grupo viajero!';
        okEl.style.display='block';
        _userRole='editor';
        removeLocks();
        var upBtn=document.getElementById('nav-upgrade-btn');
        if(upBtn) upBtn.style.display='none';
        // Update nav label
        var navText=document.getElementById('nav-user-text');
        if(navText) navText.textContent=navText.textContent.replace(' · Salir','')+' · Salir';
        setTimeout(function(){
          document.getElementById('upgrade-modal').style.display='none';
          document.body.style.overflow='';
        },2000);
      } else {
        errEl.textContent='Error al actualizar. Intenta de nuevo.';
        errEl.style.display='block';
      }
    });
  }
}

// ── MENSAJES PRIVADOS ──
var _msgUnsub=null;
var _currentConvId=null;

function getConvId(uid1,uid2){ return [uid1,uid2].sort().join('_'); }

function openMsgModal(otherUid,name,username){
  if(!window._currentUser){ showLogin(); return; }
  var modal=document.getElementById('msg-modal');
  document.getElementById('msg-modal-name').textContent=name;
  document.getElementById('msg-modal-username').textContent=username?'@'+username:'';
  document.getElementById('msg-input').value='';
  modal.style.display='flex';
  document.body.style.overflow='hidden';
  var convId=getConvId(window._currentUser.uid,otherUid);
  _currentConvId=convId;
  markConvRead(convId);
  if(_msgUnsub){ _msgUnsub(); _msgUnsub=null; }
  var list=document.getElementById('msg-list');
  list.innerHTML='<div style="text-align:center;color:rgba(0,0,0,.3);font-size:.8rem;padding:2rem 0;">Cargando...</div>';
  _msgUnsub=window._fb.listenMessages(convId,function(msgs){
    if(msgs.length===0){
      list.innerHTML='<div style="text-align:center;color:rgba(0,0,0,.3);font-size:.8rem;padding:2rem 0;">\u00C1un no hay mensajes. \u00A1Di hola!</div>';
      return;
    }
    var myUid=window._currentUser.uid;
    list.innerHTML=msgs.map(function(m){
      var sent=m.from===myUid;
      var ts='';
      if(m.ts&&m.ts.toDate){
        var d=m.ts.toDate();
        ts=d.toLocaleDateString('es-CL',{day:'numeric',month:'short'})+' '+d.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'});
      }
      return '<div class="msg-row"><div class="msg-bubble '+(sent?'sent':'recv')+'">'+escHtml(m.text)+'<div class="msg-time">'+ts+'</div></div></div>';
    }).join('');
    list.scrollTop=list.scrollHeight;
  });
  setTimeout(function(){document.getElementById('msg-input').focus();},200);
}

function closeMsgModal(e){
  if(e&&e.target!==document.getElementById('msg-modal')) return;
  document.getElementById('msg-modal').style.display='none';
  document.body.style.overflow='';
  if(_msgUnsub){ _msgUnsub(); _msgUnsub=null; }
  _currentConvId=null;
}

function sendPrivateMsg(){
  if(!window._currentUser||!_currentConvId) return;
  var input=document.getElementById('msg-input');
  var text=input.value.trim();
  if(!text) return;
  input.value='';
  window._fb.sendMessage(_currentConvId,{text:text,from:window._currentUser.uid});
}

var _inboxUnsub = null;
var _mcInboxUnsub = null;

function openMsgCenter(){
  if(!window._currentUser){ showLogin(); return; }
  var modal = document.getElementById('msgcenter-modal');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  loadMsgCenterMembers();
  loadMsgCenterConvs();
}

function closeMsgCenter(e){
  if(e && e.target !== document.getElementById('msgcenter-modal')) return;
  document.getElementById('msgcenter-modal').style.display = 'none';
  document.body.style.overflow = '';
  if(_mcInboxUnsub){ _mcInboxUnsub(); _mcInboxUnsub = null; }
}

function loadMsgCenterMembers(){
  var el = document.getElementById('msgcenter-members');
  var titleEl = document.querySelector('#msgcenter-modal [style*="Grupo viajero"]');
  if(!el) return;
  if(!window._fb){ el.innerHTML=''; return; }
  var myUid = window._currentUser ? window._currentUser.uid : '';
  var isEditor = _userRole === 'editor';

  if(isEditor){
    // Editors see ALL registered users
    window._fb.listenAllUsers(function(users){
      var others = users.filter(function(u){ return u.uid !== myUid; });
      if(others.length === 0){
        el.innerHTML = '<div style="font-size:.8rem;color:rgba(0,0,0,.3);">No hay otros usuarios aún</div>';
        return;
      }
      el.innerHTML = others.map(function(m){
        var name = m.displayName || m.username || (m.email ? m.email.split('@')[0] : 'Usuario');
        name = name.charAt(0).toUpperCase() + name.slice(1);
        var avHtml = m.avatarUrl
          ? '<img class="mc-member-av" src="'+imgTx(m.avatarUrl,128)+'" onerror="imgFallback(this)" alt="'+escHtml(name)+'">'
          : '<div class="mc-member-av">'+name.charAt(0)+'</div>';
        var uTag = m.username ? '<div class="mc-member-user">@'+escHtml(m.username)+'</div>' : '';
        var roleBadge = m.role === 'editor' ? '<span style="font-size:.6rem;background:rgba(212,168,83,.2);color:var(--gold);padding:.1rem .35rem;border-radius:6px;margin-left:.4rem;">Grupo</span>' : '';
        return '<div class="mc-member" onclick="closeMsgCenter();openMsgModal(\''+m.uid+'\',\''+escHtml(name)+'\',\''+escHtml(m.username||'')+'\')">'+
          avHtml+
          '<div class="mc-member-info"><div class="mc-member-name">'+escHtml(name)+roleBadge+'</div>'+uTag+'</div>'+
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>'+
        '</div>';
      }).join('');
    });
  } else {
    // Viewers only see editors
    var unsub = window._fb.listenMembers(function(members){
      unsub();
      var others = members.filter(function(m){ return m.uid !== myUid; });
      if(others.length === 0){
        el.innerHTML = '<div style="font-size:.8rem;color:rgba(0,0,0,.3);">No hay miembros aún</div>';
        return;
      }
      el.innerHTML = others.map(function(m){
        var name = m.displayName || m.username || (m.email ? m.email.split('@')[0] : 'Viajero');
        name = name.charAt(0).toUpperCase() + name.slice(1);
        var avHtml = m.avatarUrl
          ? '<img class="mc-member-av" src="'+imgTx(m.avatarUrl,128)+'" onerror="imgFallback(this)" alt="'+escHtml(name)+'">'
          : '<div class="mc-member-av">'+name.charAt(0)+'</div>';
        var uTag = m.username ? '<div class="mc-member-user">@'+escHtml(m.username)+'</div>' : '';
        return '<div class="mc-member" onclick="closeMsgCenter();openMsgModal(\''+m.uid+'\',\''+escHtml(name)+'\',\''+escHtml(m.username||'')+'\')">'+
          avHtml+
          '<div class="mc-member-info"><div class="mc-member-name">'+escHtml(name)+'</div>'+uTag+'</div>'+
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>'+
        '</div>';
      }).join('');
    });
  }
}

function loadMsgCenterConvs(){
  var el = document.getElementById('msgcenter-convs');
  if(!el || !window._fb || !window._fb.listenInbox) return;
  var myUid = window._currentUser.uid;
  if(_mcInboxUnsub){ _mcInboxUnsub(); _mcInboxUnsub = null; }
  _mcInboxUnsub = window._fb.listenInbox(myUid, function(convs){
    if(convs.length === 0){
      el.innerHTML = '<div style="font-size:.8rem;color:rgba(0,0,0,.3);">Sin conversaciones aún</div>';
      return;
    }
    Promise.all(convs.map(function(conv){
      var otherUid = conv.participants.find(function(p){ return p !== myUid; });
      if(!otherUid) return Promise.resolve(Object.assign({otherName:'?',otherUsername:'',otherUid:''},conv));
      return window._fb.getProfile(otherUid).then(function(profile){
        var name = '', username = '';
        if(profile && profile.username){ username = profile.username; name = '@'+username; }
        else if(profile && profile.displayName){ name = profile.displayName; }
        // Fallback: check users collection for username
        if(!name){
          return window._fb.getUserRole(otherUid).then(function(){
            return window._fb.getProfile(otherUid);
          }).catch(function(){ return null; }).then(function(){
            // Try usernames collection via users doc
            return window._fb.getProfile ? window._fb.getProfile(otherUid) : null;
          }).then(function(p2){
            var n = (p2&&p2.username)?('@'+p2.username):(p2&&p2.displayName)?p2.displayName:('Usuario');
            return Object.assign({otherName:n,otherUsername:(p2&&p2.username)||'',otherUid:otherUid},conv);
          });
        }
        name = name.charAt(0).toUpperCase()+name.slice(1);
        return Object.assign({otherName:name,otherUsername:username,otherUid:otherUid},conv);
      }).catch(function(){ return Object.assign({otherName:'Usuario',otherUsername:'',otherUid:otherUid},conv); });
    })).then(function(resolved){
      el.innerHTML = resolved.map(function(c){
        var ts='';
        if(c.lastTs&&c.lastTs.toDate){
          var d=c.lastTs.toDate();
          ts=d.toLocaleDateString('es-CL',{day:'numeric',month:'short'})+' '+d.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'});
        }
        var preview = c.lastMsg ? escHtml(c.lastMsg.slice(0,55))+(c.lastMsg.length>55?'…':'') : '';
        var uTag = c.otherUsername ? '<span style="font-size:.68rem;color:var(--ember);margin-left:.3rem;">@'+escHtml(c.otherUsername)+'</span>' : '';
        // Unread indicator
        var lastTs = c.lastTs ? (c.lastTs.toMillis?c.lastTs.toMillis():c.lastTs.seconds*1000) : 0;
        var lastRead = parseInt(localStorage.getItem('msgread_'+c.id)||'0');
        var unread = lastTs > lastRead && c.lastFrom !== myUid;
        var dot = unread ? '<span style="width:.5rem;height:.5rem;border-radius:50%;background:#e53e3e;display:inline-block;margin-left:.4rem;flex-shrink:0;"></span>' : '';
        return '<div class="inbox-item" onclick="closeMsgCenter();openMsgModal(\''+c.otherUid+'\',\''+escHtml(c.otherName)+'\',\''+escHtml(c.otherUsername||'')+'\')">'+
          '<div class="inbox-item-name" style="display:flex;align-items:center;">'+escHtml(c.otherName)+uTag+dot+'</div>'+
          '<div class="inbox-item-preview">'+preview+'</div>'+
          '<div class="inbox-item-time">'+ts+'</div>'+
        '</div>';
      }).join('');
    });
  });
}

var _navMsgUnsub = null;

function updateNavMsgBadge(count){
  var btn = document.getElementById('nav-msg-btn');
  var badge = document.getElementById('nav-msg-badge');
  if(!btn || !badge) return;
  if(count > 0){
    badge.textContent = count > 9 ? '9+' : count;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

function startNavMsgListener(uid){
  if(_navMsgUnsub){ _navMsgUnsub(); _navMsgUnsub = null; }
  var btn = document.getElementById('nav-msg-btn');
  if(btn) btn.style.display = 'block';

  // Listen to all conversations for this user
  _navMsgUnsub = window._fb.listenInbox(uid, function(convs){
    var unread = 0;
    var now = Date.now();
    convs.forEach(function(c){
      if(!c.lastTs) return;
      var lastTs = c.lastTs.toMillis ? c.lastTs.toMillis() : (c.lastTs.seconds * 1000);
      // Skip conversations where I sent the last message
      if(c.lastFrom === uid) return;
      // Compare with locally stored read time
      var readKey = 'msgread_' + c.id;
      var lastRead = parseInt(localStorage.getItem(readKey) || '0');
      if(lastTs > lastRead) unread++;
    });
    updateNavMsgBadge(unread);
  });
}

function markConvRead(convId){
  localStorage.setItem('msgread_' + convId, Date.now().toString());
  // Recount
  if(window._currentUser) startNavMsgListener(window._currentUser.uid);
}

function loadInbox(myUid){
  if(_inboxUnsub){ _inboxUnsub(); _inboxUnsub = null; }
  var listEl = document.getElementById('pf-inbox-list');
  if(!listEl) return;

  _inboxUnsub = window._fb.listenInbox(myUid, function(convs){
    if(convs.length === 0){
      listEl.innerHTML = '<div style="font-size:.8rem;color:rgba(0,0,0,.35);">Sin conversaciones aún</div>';
      document.getElementById('pf-inbox-badge').style.display = 'none';
      return;
    }
    var badge = document.getElementById('pf-inbox-badge');
    if(badge){ badge.textContent = convs.length; badge.style.display = 'inline'; }

    // Resolve the other person's name for each conversation
    Promise.all(convs.map(function(conv){
      var otherUid = conv.participants.find(function(p){ return p !== myUid; });
      if(!otherUid) return Promise.resolve(Object.assign({otherName:'?', otherUsername:'', otherUid:''}, conv));
      return window._fb.getProfile(otherUid).then(function(profile){
        var name = (profile && profile.displayName) ? profile.displayName : otherUid.slice(0,8);
        name = name.charAt(0).toUpperCase() + name.slice(1);
        var username = (profile && profile.username) ? profile.username : '';
        return Object.assign({otherName: name, otherUsername: username, otherUid: otherUid}, conv);
      }).catch(function(){ return Object.assign({otherName:'Usuario', otherUsername:'', otherUid: otherUid}, conv); });
    })).then(function(resolved){
      listEl.innerHTML = resolved.map(function(c){
        var ts = '';
        if(c.lastTs && c.lastTs.toDate){
          var d = c.lastTs.toDate();
          ts = d.toLocaleDateString('es-CL',{day:'numeric',month:'short'}) + ' ' + d.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'});
        }
        var preview = c.lastMsg ? escHtml(c.lastMsg.slice(0,60))+(c.lastMsg.length>60?'…':'') : '';
        var uTag = c.otherUsername ? '<span style="font-size:.68rem;color:var(--ember);margin-left:.3rem;">@'+escHtml(c.otherUsername)+'</span>' : '';
        return '<div class="inbox-item" onclick="openMsgModal(\''+c.otherUid+'\',\''+escHtml(c.otherName)+'\',\''+escHtml(c.otherUsername||'')+'\')">'+
          '<div class="inbox-item-name">'+escHtml(c.otherName)+uTag+'</div>'+
          '<div class="inbox-item-preview">'+preview+'</div>'+
          '<div class="inbox-item-time">'+ts+'</div>'+
        '</div>';
      }).join('');
    });
  });
}

function doLeaveGroup(){
  if(!window._currentUser) return;
  if(!confirm('¿Seguro que quieres abandonar el grupo viajero?\nPerderás acceso a puntuar y publicar entradas.')) return;
  var uid=window._currentUser.uid;
  var msgEl=document.getElementById('pf-leave-msg');
  if(msgEl){msgEl.textContent='Procesando...';msgEl.style.color='rgba(0,0,0,.4)';}
  window._fb.downgradeToViewer(uid).then(function(ok){
    if(ok){
      _userRole='viewer';
      addLocks();
      document.getElementById('pf-leave-section').style.display='none';
      var roleEl=document.getElementById('profile-role-display');
      if(roleEl) roleEl.innerHTML='<span class="profile-role-badge prole-viewer">Seguidor del viaje</span>';
      var upBtn=document.getElementById('nav-upgrade-btn');
      if(upBtn) upBtn.style.display='inline-block';
      var navText=document.getElementById('nav-user-text');
      if(navText) navText.textContent=navText.textContent;
      if(_lastEntries.length>0) renderDiario(_lastEntries);
      if(msgEl){msgEl.textContent='Has salido del grupo viajero.';msgEl.style.color='var(--ember)';}
      setTimeout(function(){
        document.getElementById('profile-modal').classList.remove('open');
        document.body.style.overflow='';
      },1600);
    } else {
      if(msgEl){msgEl.textContent='Error. Intenta de nuevo.';msgEl.style.color='var(--ember)';}
    }
  });
}

function addLocks(){
  // No-miembros: se ocultan las herramientas del grupo (puntuar / progreso / casillas) vía CSS.
  document.body.classList.remove('is-editor');
  document.querySelectorAll('.auth-lock').forEach(function(el){el.remove();});
}
function removeLocks(){
  document.body.classList.add('is-editor');
  document.querySelectorAll('.auth-lock').forEach(function(el){el.remove();});
  document.querySelectorAll('.requires-auth').forEach(function(el){el.classList.remove('requires-auth');});
}

document.addEventListener('auth-changed',function(e){
  window._currentUser=e.detail;
  if(_profileUnsub){ _profileUnsub(); _profileUnsub = null; }
  if(_inboxUnsub){ _inboxUnsub(); _inboxUnsub = null; }
  if(_navMsgUnsub){ _navMsgUnsub(); _navMsgUnsub = null; }
  if(typeof _navProfileListenUnsub !== 'undefined' && _navProfileListenUnsub){ _navProfileListenUnsub(); _navProfileListenUnsub=null; }
  if(e.detail){
    // User is logged in — update nav immediately
    updateNavUser(e.detail);
  } else {
    // No user — reset profile form and nav only after firebase-ready has confirmed no session
    ['pf-name','pf-bio','pf-username'].forEach(function(id){
      var el=document.getElementById(id); if(el) el.value='';
    });
    var dispEl=document.getElementById('profile-name-display');
    if(dispEl) dispEl.textContent='Tu perfil';
    var subEl=document.getElementById('profile-username-display');
    if(subEl) subEl.textContent='';
    setAvatarUI(null,'?');
    // Only update nav to logged-out state after firebase-ready fires
    // (firebase-ready fires from onAuthStateChanged, so by now it's confirmed)
    updateNavUser(null);
  }
});
document.addEventListener('firebase-ready',function(){
  if(!window._currentUser){ return; }  // publico navega libre; el login aparece al interactuar
  // Firebase ready and user is logged in — fetch role then update UI
  if(window._fb && window._fb.getUserRole){
    window._fb.getUserRole(window._currentUser.uid).then(function(role){
      _userRole = role;
      updateUIForRole(role);
      if(_lastEntries.length>0) renderDiario(_lastEntries);
    });
  }
});
document.addEventListener('DOMContentLoaded',function(){
  ['login-email','login-pass'].forEach(function(id){
    var el=document.getElementById(id);
    if(el) el.addEventListener('keydown',function(e){if(e.key==='Enter') doLogin();});
  });
  ['reg-username','reg-email','reg-pass','reg-code'].forEach(function(id){
    var el=document.getElementById(id);
    if(el) el.addEventListener('keydown',function(e){if(e.key==='Enter') doRegister();});
  });

  // Live username availability check in register form
  var _usernameTimer=null;
  var regUsernameEl=document.getElementById('reg-username');
  if(regUsernameEl){
    regUsernameEl.addEventListener('input',function(){
      clearTimeout(_usernameTimer);
      var val=this.value.trim();
      var msgEl=document.getElementById('username-check-msg');
      if(!val){msgEl.textContent='';msgEl.style.color='';return;}
      if(val.length<3){msgEl.textContent='Mínimo 3 caracteres';msgEl.style.color='var(--ember)';return;}
      msgEl.textContent='Comprobando...';msgEl.style.color='rgba(0,0,0,.4)';
      _usernameTimer=setTimeout(function(){
        if(!window._fb||!window._fb.checkUsername){msgEl.textContent='';return;}
        window._fb.checkUsername(val).then(function(r){
          if(r.available){
            msgEl.textContent='✓ @'+val+' disponible';
            msgEl.style.color='var(--moss)';
          } else {
            msgEl.textContent='✗ '+r.msg;
            msgEl.style.color='var(--ember)';
          }
        });
      },600);
    });
  }

  // Live username check in profile modal
  var _pfUsernameTimer=null;
  var pfUsernameEl=document.getElementById('pf-username');
  if(pfUsernameEl){
    pfUsernameEl.addEventListener('input',function(){
      clearTimeout(_pfUsernameTimer);
      var val=this.value.trim();
      var msgEl=document.getElementById('pf-username-msg');
      if(!val){msgEl.textContent='';msgEl.style.color='';return;}
      if(val.length<3){msgEl.textContent='Mínimo 3 caracteres';msgEl.style.color='var(--ember)';return;}
      msgEl.textContent='Comprobando...';msgEl.style.color='rgba(0,0,0,.4)';
      _pfUsernameTimer=setTimeout(function(){
        if(!window._fb||!window._fb.checkUsername){msgEl.textContent='';return;}
        window._fb.checkUsername(val).then(function(r){
          if(r.available){
            msgEl.textContent=r.own?'✓ Tu usuario actual':'✓ @'+val+' disponible';
            msgEl.style.color='var(--moss)';
          } else {
            msgEl.textContent='✗ '+r.msg;
            msgEl.style.color='var(--ember)';
          }
        });
      },600);
    });
  }
});

// ── PREPARACION: CHECKLIST ──
var _prepChecks = {};
var _prepUnsub = null;

var PREP_ITEMS = [
  'prep_pasaporte','prep_visa_bali','prep_visa_thai','prep_visa_japon',
  'prep_vuelos_internos','prep_grab','prep_suica',
  'prep_seguro','prep_vacunas','prep_medicamentos',
  'prep_wise','prep_efectivo','prep_sim','prep_banco',
  'prep_adaptador','prep_banco_energia','prep_ropa','prep_camara'
];

function togglePrep(el){
  var key = el.dataset.key;
  if(!key) return;
  var done = !el.classList.contains('done-item');
  // Optimistic UI
  el.classList.toggle('done-item', done);
  el.querySelector('.prep-check').textContent = done ? '✓' : '';
  updatePrepProgress();
  // Guardar en Firestore (coleccion checklist)
  if(window._fb && window._fb.saveChecklist){
    window._fb.saveChecklist(key, done);
  } else {
    // fallback localStorage
    try{
      var s = JSON.parse(localStorage.getItem('prep_checks')||'{}');
      s[key] = done;
      localStorage.setItem('prep_checks', JSON.stringify(s));
    }catch(e){}
  }
}

function updatePrepProgress(){
  var total = document.querySelectorAll('.prep-item[data-key]').length;
  var done  = document.querySelectorAll('.prep-item.done-item').length;
  var pct   = total ? Math.round((done/total)*100) : 0;
  var bar   = document.getElementById('prep-bar');
  var lbl   = document.getElementById('prep-counter');
  var pctTxt= document.getElementById('prep-pct-text');
  if(bar)   bar.style.width = pct + '%';
  if(lbl)   lbl.textContent = done + ' / ' + total + ' completados';
  if(pctTxt)pctTxt.textContent = pct + '% listo';
}

function applyPrepChecks(checks){
  _prepChecks = checks || {};
  document.querySelectorAll('.prep-item[data-key]').forEach(function(el){
    var done = !!_prepChecks[el.dataset.key];
    el.classList.toggle('done-item', done);
    var chk = el.querySelector('.prep-check');
    if(chk) chk.textContent = done ? '✓' : '';
  });
  updatePrepProgress();
}

// Cargar checks al entrar en la sección
document.addEventListener('firebase-ready', function(){
  if(window._fb && window._fb.listenChecklist && !_prepUnsub){
    _prepUnsub = window._fb.listenChecklist(function(checks){
      applyPrepChecks(checks);
    });
  } else {
    // fallback localStorage
    try{
      applyPrepChecks(JSON.parse(localStorage.getItem('prep_checks')||'{}'));
    }catch(e){}
  }
});

// ── PREPARACION: TASAS DE CAMBIO ──
var _rates = { USD:1, CLP:950, IDR:16200, THB:35, JPY:155 };
var _ratesLoaded = false;

function loadExchangeRates(){
  if(_ratesLoaded) return;
  // API gratuita sin key: exchangerate-api
  fetch('https://api.exchangerate-api.com/v4/latest/USD')
    .then(function(r){ return r.json(); })
    .then(function(data){
      if(!data.rates) return;
      _rates.IDR = Math.round(data.rates.IDR || 16200);
      _rates.THB = +(data.rates.THB || 35).toFixed(2);
      _rates.JPY = Math.round(data.rates.JPY || 155);
      _rates.CLP = Math.round(data.rates.CLP || 950);
      _ratesLoaded = true;
      // Mostrar en cards
      var idrEl = document.getElementById('rate-idr');
      var thbEl = document.getElementById('rate-thb');
      var jpyEl = document.getElementById('rate-jpy');
      var upd   = document.getElementById('rates-updated');
      if(idrEl) idrEl.textContent = _rates.IDR.toLocaleString('es-CL');
      if(thbEl) thbEl.textContent = _rates.THB.toFixed(2);
      if(jpyEl) jpyEl.textContent = _rates.JPY.toLocaleString('es-CL');
      if(upd)   upd.textContent = 'Actualizado: ' + new Date().toLocaleDateString('es-CL', {day:'2-digit',month:'short',year:'numeric'});
      updateConverter();
    })
    .catch(function(){
      // Fallback con tasas aproximadas
      var upd = document.getElementById('rates-updated');
      var idrEl = document.getElementById('rate-idr');
      var thbEl = document.getElementById('rate-thb');
      var jpyEl = document.getElementById('rate-jpy');
      if(idrEl) idrEl.textContent = '16.200';
      if(thbEl) thbEl.textContent = '35.00';
      if(jpyEl) jpyEl.textContent = '155';
      if(upd)   upd.textContent = 'Tasas aproximadas — sin conexion';
      updateConverter();
    });
}

function updateConverter(){
  var amountEl = document.getElementById('conv-amount');
  var fromEl   = document.getElementById('conv-from');
  var toEl     = document.getElementById('conv-to');
  var resultEl = document.getElementById('conv-result');
  var subEl    = document.getElementById('conv-result-sub');
  if(!amountEl||!fromEl||!toEl||!resultEl) return;
  var amount = parseFloat(amountEl.value) || 0;
  var from = fromEl.value;
  var to   = toEl.value;
  if(from === to){ resultEl.textContent = amount.toLocaleString('es-CL'); if(subEl) subEl.textContent = ''; return; }
  // Convertir a USD primero, luego a destino
  var inUSD   = amount / (_rates[from] || 1);
  var result  = inUSD * (_rates[to] || 1);
  // Formatear según moneda
  var fmtResult;
  if(to === 'JPY' || to === 'IDR' || to === 'CLP'){
    fmtResult = Math.round(result).toLocaleString('es-CL');
  } else {
    fmtResult = result.toFixed(2);
  }
  resultEl.textContent = fmtResult + ' ' + to;
  // Tasa unitaria
  var unit = (_rates[to]||1) / (_rates[from]||1);
  var unitFmt = (to==='JPY'||to==='IDR'||to==='CLP') ? Math.round(unit).toLocaleString('es-CL') : unit.toFixed(4);
  if(subEl) subEl.textContent = '1 ' + from + ' = ' + unitFmt + ' ' + to;
}

// Cargar tasas cuando el usuario navega a la sección
(function(){
  var origGoTo = window.goTo;
})();

// ── MAPA ──
var mapInitialized = false;
var _leafletMap = null;

var STOPS = [
  {name:'Bali',       label:'Bali',         country:'Indonesia',    dates:'28 Dic – 5 Ene',  lat:-8.40,  lng:115.19, color:'#d4783a', r:9,  num:1},
  {name:'Phuket',     label:'Phuket',        country:'Tailandia',    dates:'5 – 8 Ene',       lat:7.90,   lng:98.30,  color:'#8b1a3a', r:7,  num:2},
  {name:'Krabi',      label:'Krabi',         country:'Tailandia',    dates:'8 – 13 Ene',      lat:8.09,   lng:98.91,  color:'#8b1a3a', r:7,  num:3},
  {name:'Bangkok',    label:'Bangkok',       country:'Tailandia',    dates:'13 – 15 Ene',     lat:13.75,  lng:100.50, color:'#8b1a3a', r:7,  num:4},
  {name:'Chiang Mai', label:'Chiang Mai',    country:'Tailandia',    dates:'16 – 19 Ene',     lat:18.79,  lng:98.98,  color:'#8b1a3a', r:7,  num:5},
  {name:'Osaka',      label:'Osaka',         country:'Japón',        dates:'19 – 23 Ene',     lat:34.69,  lng:135.50, color:'#c8293a', r:7,  num:6},
  {name:'Kyoto',      label:'Kyoto',         country:'Japón',        dates:'23 – 26 Ene',     lat:35.01,  lng:135.77, color:'#c8293a', r:6,  num:7},
  {name:'Tokyo',      label:'Tokyo',         country:'Japón',        dates:'26 Ene – 1 Feb',  lat:35.68,  lng:139.69, color:'#c8293a', r:9,  num:8},
];

function initTravelMap(){
  if(mapInitialized) return;
  var el = document.getElementById('travel-map');
  if(!el) return;
  // Wait for Leaflet to be available, retry up to 20 times
  if(typeof L === 'undefined'){
    var attempts = 0;
    var tryInit = setInterval(function(){
      attempts++;
      if(typeof L !== 'undefined'){ clearInterval(tryInit); initTravelMap(); }
      else if(attempts > 20) clearInterval(tryInit);
    }, 200);
    return;
  }
  mapInitialized = true;

  // Tile layer oscuro (CartoDB Dark Matter) que combina con el diseño
  var map = L.map('travel-map', {
    center: [18, 118],
    zoom: 4,
    zoomControl: true,
    scrollWheelZoom: false,
    attributionControl: true
  });
  _leafletMap = map;

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://openstreetmap.org">OSM</a> &copy; <a href="https://carto.com">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 14,
    minZoom: 2
  }).addTo(map);

  // Ruta: solo paradas en Asia (sin Santiago para no deformar el zoom)
  var coords = STOPS.map(function(s){ return [s.lat, s.lng]; });

  // Línea de ruta — sombra gruesa semitransparente + línea dorada encima
  L.polyline(coords, {color:'#d4a853', weight:8, opacity:0.10}).addTo(map);
  L.polyline(coords, {color:'#d4a853', weight:2.5, opacity:0.9, dashArray:'10 7'}).addTo(map);

  // Marcadores con número de parada
  STOPS.forEach(function(s){
    var size = s.r * 2 + 10;
    var html =
      '<div style="'+
        'width:'+size+'px;height:'+size+'px;'+
        'background:'+s.color+';'+
        'border-radius:50%;'+
        'border:3px solid rgba(255,255,255,.95);'+
        'box-shadow:0 2px 10px rgba(0,0,0,.45), 0 0 0 '+(s.r+3)+'px '+s.color+'28;'+
        'display:flex;align-items:center;justify-content:center;'+
        'font-family:\'DM Sans\',sans-serif;font-size:11px;font-weight:700;color:#fff;'+
      '">'+s.num+'</div>';

    var icon = L.divIcon({
      className: '',
      html: html,
      iconSize: [size, size],
      iconAnchor: [size/2, size/2]
    });

    var marker = L.marker([s.lat, s.lng], {icon: icon}).addTo(map);

    marker.bindPopup(
      '<div style="font-family:\'DM Sans\',sans-serif;min-width:160px;">'+
        '<div style="font-weight:700;font-size:.97rem;color:#1a1410;margin-bottom:.15rem;">'+s.name+'</div>'+
        '<div style="font-size:.72rem;color:#888;margin-bottom:.3rem;">'+s.country+'</div>'+
        '<div style="display:inline-block;background:'+s.color+'1a;color:'+s.color+';border-radius:6px;padding:.18rem .55rem;font-size:.75rem;font-weight:600;">'+s.dates+'</div>'+
      '</div>',
      {maxWidth: 220, className: 'map-popup-custom'}
    );

    marker.bindTooltip(s.label, {
      permanent: true,
      direction: 'top',
      offset: [0, -(size/2 + 4)],
      className: 'map-tooltip-custom',
      opacity: 1
    });
  });

  // Ajustar vista solo a las paradas en Asia
  var bounds = L.latLngBounds(STOPS.map(function(s){ return [s.lat, s.lng]; }));
  map.fitBounds(bounds, {padding: [50, 50]});

  // Forzar redibujado (fix tamaño si estaba oculto al iniciar)
  setTimeout(function(){ map.invalidateSize(); }, 300);
}

// Observador de intersección — inicia el mapa cuando es visible
(function(){
  var mapDiv = document.getElementById('travel-map');
  if(!mapDiv) return;
  if('IntersectionObserver' in window){
    var obs = new IntersectionObserver(function(entries){
      if(entries[0].isIntersecting){ obs.disconnect(); setTimeout(initTravelMap, 150); }
    }, {threshold: 0.05});
    obs.observe(mapDiv);
  } else {
    // Fallback sin IntersectionObserver
    setTimeout(initTravelMap, 800);
  }
})();

// ── NAV ──
function goTo(id,btn){
  document.getElementById(id).scrollIntoView({behavior:'smooth',block:'start'});
  document.querySelectorAll('.nav-btn').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  if(id==='mapa'){
    setTimeout(function(){
      initTravelMap();
      if(_leafletMap) _leafletMap.invalidateSize();
    }, 350);
  }
  if(id==='preparacion'){
    setTimeout(loadExchangeRates, 200);
  }
}
var NAV_IDS=['resumen','destinos','diario','galeria','mapa','vuelos','alojamientos','datos'];
var navObs=new IntersectionObserver(function(entries){
  entries.forEach(function(e){
    if(e.isIntersecting){
      var idx=NAV_IDS.indexOf(e.target.id);
      document.querySelectorAll('.nav-btn').forEach(function(b,i){b.classList.toggle('active',i===idx);});
    }
  });
},{threshold:.2});
NAV_IDS.forEach(function(id){var el=document.getElementById(id);if(el) navObs.observe(el);});

// ── PERFIL ──
var _profileUnsub = null;
var _membersUnsub = null;
var _pendingAvatar = null;

function openProfile(){
  if(!window._currentUser){ showLogin(); return; }
  document.getElementById('profile-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
  loadMyProfile();
  loadMembers();
}

function closeProfile(e){
  if(!e || e.target === document.getElementById('profile-modal') || e.target.id === 'profile-close'){
    document.getElementById('profile-modal').classList.remove('open');
    document.body.style.overflow = '';
    _pendingAvatar = null;
  }
}

function loadMyProfile(){
  if(!window._currentUser || !window._fb.listenProfile) return;
  if(_profileUnsub) _profileUnsub();
  var uid = window._currentUser.uid;
  _profileUnsub = window._fb.listenProfile(uid, function(profile){
    var nameEl     = document.getElementById('pf-name');
    var bioEl      = document.getElementById('pf-bio');
    var usernameEl = document.getElementById('pf-username');
    var dispEl     = document.getElementById('profile-name-display');
    var roleEl     = document.getElementById('profile-role-display');
    if(profile){
      if(nameEl)     nameEl.value     = profile.displayName || '';
      if(bioEl)      bioEl.value      = profile.bio || '';
      if(usernameEl) usernameEl.value = profile.username || '';
      var dispName = profile.displayName || window._currentUser.email.split('@')[0];
      var dispUser = profile.username ? ' @'+profile.username : '';
      if(dispEl) dispEl.textContent = dispName;
      // Show username as subtitle in profile header
      var subEl = document.getElementById('profile-username-display');
      if(subEl) subEl.textContent = profile.username ? '@'+profile.username : '';
      setAvatarUI(profile.avatarUrl || null, profile.displayName || '?');
    } else {
      var defName = window._currentUser.email.split('@')[0];
      defName = defName.charAt(0).toUpperCase() + defName.slice(1);
      if(dispEl) dispEl.textContent = defName;
    }
    if(roleEl){
      // Always fetch role fresh to avoid stale state
      (window._fb.getUserRole ? window._fb.getUserRole(uid) : Promise.resolve(_userRole)).then(function(role){
        _userRole = role;
        var isEd = role === 'editor';
        roleEl.innerHTML = '<span class="profile-role-badge '+(isEd?'prole-editor':'prole-viewer')+'">'+(isEd?'Grupo viajero':'Seguidor del viaje')+'</span>';
        var leaveSec = document.getElementById('pf-leave-section');
        if(leaveSec) leaveSec.style.display = isEd ? 'block' : 'none';
        var leaveMsg = document.getElementById('pf-leave-msg');
        if(leaveMsg) leaveMsg.textContent = '';
        var inboxSec = document.getElementById('pf-inbox-section');
        if(inboxSec) inboxSec.style.display = isEd ? 'block' : 'none';
        if(isEd) loadInbox(uid);
        updateUIForRole(role);
      });
    }
  });
}

function setAvatarUI(url, name){
  var wrap = document.getElementById('avatar-display');
  if(!wrap) return;
  if(url){
    wrap.innerHTML = '<img class="avatar-img" src="'+url+'" alt="avatar">';
    // Update nav
    var inner = document.getElementById('nav-av-inner');
    if(inner) inner.innerHTML = '<img src="'+url+'" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">';
  } else {
    var initial = (name||'?').charAt(0).toUpperCase();
    wrap.innerHTML = '<div class="avatar-placeholder">' + initial + '</div>';
    var inner = document.getElementById('nav-av-inner');
    if(inner) inner.textContent = initial;
  }
}

// Avatar preview
document.addEventListener('DOMContentLoaded', function(){
  var inp = document.getElementById('avatar-input');
  if(!inp) return;
  inp.addEventListener('change', function(){
    if(!this.files[0]) return;
    var reader = new FileReader();
    reader.onload = function(e){
      var img = new Image();
      img.onload = function(){
        var canvas = document.createElement('canvas');
        var size = 512;
        canvas.width = size; canvas.height = size;
        var ctx = canvas.getContext('2d');
        // Crop to square
        var min = Math.min(img.width, img.height);
        var sx = (img.width - min)/2, sy = (img.height - min)/2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        _pendingAvatar = canvas.toDataURL('image/jpeg', 0.9);
        // Show preview
        var wrap = document.getElementById('avatar-display');
        if(wrap) wrap.innerHTML = '<img class="avatar-img" src="'+_pendingAvatar+'" alt="preview">';
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(this.files[0]);
  });
});

function saveProfile(){
  if(!window._currentUser || !window._fb.saveProfile) return;
  var uid = window._currentUser.uid;
  var name     = (document.getElementById('pf-name').value||'').trim();
  var bio      = (document.getElementById('pf-bio').value||'').trim();
  var username = (document.getElementById('pf-username').value||'').trim().toLowerCase();
  var btn  = document.querySelector('.profile-save');
  var msg  = document.getElementById('pf-saved');
  var msgEl = document.getElementById('pf-username-msg');

  if(username && username.length < 3){
    if(msgEl){msgEl.textContent='Mínimo 3 caracteres';msgEl.style.color='var(--ember)';}
    return;
  }

  btn.disabled = true; btn.textContent = 'Guardando...';
  msg.textContent = '';

  var doSave = function(avatarUrl){
    var data = { displayName: name, bio: bio, role: _userRole, email: window._currentUser.email, username: username };
    if(avatarUrl) data.avatarUrl = avatarUrl;
    window._fb.saveProfile(uid, data).then(function(ok){
      btn.disabled = false; btn.textContent = 'Guardar perfil';
      if(ok){
        msg.textContent = '¡Perfil guardado!';
        _pendingAvatar = null;
        // Update nav name — show @username if available
        var navText = document.getElementById('nav-user-text');
        if(navText){
          var displayLabel = username ? '@'+username : (name || window._currentUser.email.split('@')[0]);
          navText.textContent = displayLabel + ''+' · Salir';
        }
        // Update username subtitle in profile header
        var subEl = document.getElementById('profile-username-display');
        if(subEl) subEl.textContent = username ? '@'+username : '';
        setTimeout(function(){msg.textContent='';},2500);
      } else {
        msg.style.color = 'var(--ember)';
        msg.textContent = 'Error al guardar. Intenta de nuevo.';
      }
    });
  };

  // Fetch old username to handle rename correctly
  var saveAndMap = function(avatarUrl){
    if(window._fb.getProfile && window._fb.saveUsername){
      window._fb.getProfile(uid).then(function(existing){
        var oldUsername = (existing && existing.username) ? existing.username : '';
        window._fb.saveUsername(uid, username, oldUsername).then(function(){
          doSave(avatarUrl);
        });
      });
    } else {
      doSave(avatarUrl);
    }
  };

  if(_pendingAvatar && window._fb.uploadAvatar){
    window._fb.uploadAvatar(uid, _pendingAvatar).then(function(url){
      saveAndMap(url);
    });
  } else {
    saveAndMap(null);
  }
}

function loadMembers(){
  if(!window._fb.listenMembers) return;
  if(_membersUnsub) _membersUnsub();
  _membersUnsub = window._fb.listenMembers(function(members){
    var list = document.getElementById('members-list');
    if(!list) return;
    // Only show editors
    var editors = members.filter(function(m){ return m.role === 'editor'; });
    if(editors.length === 0){
      list.innerHTML = '<div style="font-size:.8rem;color:rgba(0,0,0,.35)">Aún no hay miembros registrados</div>';
      return;
    }
    list.innerHTML = editors.map(function(m){
      var name = m.displayName || (m.email ? m.email.split('@')[0] : 'Viajero');
      name = name.charAt(0).toUpperCase() + name.slice(1);
      var av = m.avatarUrl
        ? '<img class="member-av" src="'+imgTx(m.avatarUrl,128)+'" onerror="imgFallback(this)" alt="'+escHtml(name)+'">'
        : '<div class="member-av-ph">'+name.charAt(0)+'</div>';
      var usernameTag = m.username ? '<div style="font-size:.65rem;color:var(--ember);font-weight:600;letter-spacing:.04em;">@'+escHtml(m.username)+'</div>' : '';
      var bio = m.bio ? '<div style="font-size:.72rem;color:rgba(0,0,0,.4);margin-top:.1rem;max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+escHtml(m.bio)+'</div>' : '';
      // Show message button for all logged-in users (not self)
      var isSelf = window._currentUser && m.uid === window._currentUser.uid;
      var canMsg = window._currentUser && !isSelf;
      var msgBtn = canMsg ? '<button class="msg-btn" onclick="openMsgModal(\''+m.uid+'\',\''+escHtml(name)+'\',\''+escHtml(m.username||'')+'\')">Mensaje</button>' : '';
      return '<div class="member-chip">'+av+'<div class="member-info"><div class="member-name">'+escHtml(name)+'</div>'+usernameTag+bio+msgBtn+'</div></div>';
    }).join('');
  });
}

// ── LIGHTBOX ──
var _lbPhotos = [];
var _lbIdx = 0;
var _lbPhotoMap = {}; // stores photos by entry id

function openLightbox(entryId, idx){
  _lbPhotos = _lbPhotoMap[entryId] || [];
  if(!_lbPhotos.length) return;
  _lbIdx = idx;
  var lb = document.getElementById('lightbox');
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
  updateLightbox();
  document.addEventListener('keydown', lightboxKey);
}
function closeLightbox(){
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = '';
  document.removeEventListener('keydown', lightboxKey);
}
function updateLightbox(){
  var _img = document.getElementById('lightbox-img');
  _img.onerror = function(){ imgFallback(_img); };
  _img.src = imgTx(_lbPhotos[_lbIdx], 1600);
  document.getElementById('lightbox-counter').textContent = _lbPhotos.length > 1 ? (_lbIdx+1) + ' / ' + _lbPhotos.length : '';
  document.getElementById('lightbox-prev').style.display = _lbPhotos.length > 1 ? 'flex' : 'none';
  document.getElementById('lightbox-next').style.display = _lbPhotos.length > 1 ? 'flex' : 'none';
}
function lightboxNav(dir){
  _lbIdx = (_lbIdx + dir + _lbPhotos.length) % _lbPhotos.length;
  updateLightbox();
}
function lightboxKey(e){
  if(e.key==='ArrowRight') lightboxNav(1);
  else if(e.key==='ArrowLeft') lightboxNav(-1);
  else if(e.key==='Escape') closeLightbox();
}

// (nav-av listener merged into updateNavUser)

// ── PUESTA AL DÍA SI EL BACKEND YA ESTABA LISTO ──
// Este script se carga con defer, así que puede ejecutarse DESPUÉS de que backend.js
// (js/backend.js) ya haya disparado 'auth-changed' y 'firebase-ready'. En ese caso, los
// listeners de arriba se habrían registrado tarde y perdido esos eventos (el diario
// quedaba en "Cargando…", el estado de login sin actualizar, etc.). Si ya está listo,
// re-emitimos los eventos ahora para que todos los listeners se pongan al día.
if (window._fbReady) {
  document.dispatchEvent(new CustomEvent('auth-changed', { detail: window._currentUser || null }));
  document.dispatchEvent(new Event('firebase-ready'));
}

