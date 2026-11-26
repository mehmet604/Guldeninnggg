import { teachers } from './teachers.js?v=14';
'use strict';
const screen=document.querySelector('#screen');
const tasks={review:['Eserimi incele','Fotoğrafını seç ve hocanla birlikte incele.','Eserimin fotoğrafını göndereceğim. Üretim aşamasını sor, formu ve işçiliği değerlendir.'],design:['Yeni eser tasarla','Birlikte özgün bir eser yaratalım.','Elle şekillendirmeye uygun üç tasarım öner. Seçtiğim eserin görselini oluştur ve ölçüleriyle yapım aşamalarını açıkla.'],color:['Renk stüdyosu','Formu koruyarak renklerle oynayalım.','Fotoğrafını göndereceğim eser için dört görsel sır alternatifi hazırla. Gerçek pişirim sonucu değişebilir.'],inspire:['İlham ver','Bugün sıradan bir şey yapmayalım.','Ruh halimi sor ve üç özgün seramik fikri öner.'],learn:['Seramik öğren','Adım adım, acele etmeden.','Bana elle şekillendirme öğret. Her adımın ardından uygulamamı bekle.'],tech:['Teknik yardım','Önce sorunu ve malzemeleri anlayalım.','Teknik seramik sorunumu analiz et. Fırın veya sır konusunda üretici bilgilerini doğrulamadan kesin program önerme.'],decor:['Evimde nasıl durur?','Eserini yaşam alanında hayal et.','Eser ve ev fotoğraflarımı iste, ardından eseri evimde görselleştir.'],gallery:['Profesyonel fotoğraf','Eserine galeri görünümü kazandır.','Eser fotoğrafımı iste ve formunu koruyan profesyonel sunum oluştur.']};
let settings={teacher:0,mizah:80,elestiri:80,samimiyet:90};try{Object.assign(settings,JSON.parse(localStorage.getItem('gulden-settings')||'{}'))}catch{}; if(!Number.isInteger(settings.teacher)||!teachers[settings.teacher])settings.teacher=0;
for (const [key, fallback] of Object.entries({ mizah:80, elestiri:80, samimiyet:90 })) {
  if (!Number.isInteger(settings[key]) || settings[key] < 0 || settings[key] > 100) settings[key]=fallback;
}
delete settings.url;
function save(){try{localStorage.setItem('gulden-settings',JSON.stringify(settings))}catch{}}
function el(tag,txt,cls){const e=document.createElement(tag);if(txt)e.textContent=txt;if(cls)e.className=cls;return e}function btn(txt,fn,cls='choice'){const e=el('button',txt,cls);e.type='button';e.onclick=fn;return e}function panel(title){window.scrollTo(0,0);screen.replaceChildren();const p=el('div','','panel');p.append(btn('‹ Ana sayfa',()=>go('home'),'back'),el('h2',title));screen.append(p);return p}
function go(page){window.scrollTo(0,0);screen.replaceChildren();if(page==='home'){const hero=el('div','','hero');hero.append(el('h2','Bugün ne yaratıyoruz?'));screen.append(hero,btn('Kiminle çalışsam bilemiyorum…',()=>go('teachers'),'primary'));const grid=el('div','','tiles');[['review','Eserimi incele','', 'photo'],['design','Yeni eser tasarla','✎'],['color','Renk stüdyosu','◒'],['studio','Atölyem','♧'],['inspire','İlham ver','✧','wide']].forEach(([id,t,icon,c])=>{const b=btn('',()=>go(id),'tile '+(c||''));b.append(el('h3',t),el('span',icon));grid.append(b)});screen.append(grid)}else if(page==='teachers'){const p=panel('Kiminle çalışsam bilemiyorum…');p.append(el('p','Bugün kimin enerjisi sana uyuyor?'));teachers.forEach((t,i)=>{const b=btn('',()=>choose(i));b.append(el('strong',t[0]),el('small',t[1]),el('small',t[2]));p.append(b)});p.append(btn('Sürpriz yap, sen seç!',()=>choose(Math.floor(Math.random()*teachers.length)),'primary'))}else if(page==='studio'){const p=panel('Atölyem');['learn','tech','decor','gallery'].forEach(k=>p.append(btn(tasks[k][0],()=>go(k))));p.append(btn('Kil ve sır danışmanlığı',()=>prepare('Kil ve sır etiketlerimin fotoğraflarını incele.')),btn('Fotoğraflarım',()=>go('photos')))}else if(page==='photos'){
  const p=panel('Fotoğraflarım');
  p.append(el('p','Eserinin fotoğrafını seç ve hocanla birlikte incele.'));
  const picker=photoPicker(false);
  p.append(picker.element,btn('Eserimi incele',()=>prepare(tasks.review[2],'review',picker.files()),'primary'));
}else if(page==='settings'){const p=panel('Ayarlar');const sel=el('select');teachers.forEach((t,i)=>{const o=el('option',t[0]);o.value=i;sel.append(o)});sel.value=settings.teacher;sel.onchange=()=>{settings.teacher=Number(sel.value);save()};p.append(sel);[['mizah','Mizah'],['elestiri','Eleştiri'],['samimiyet','Samimiyet']].forEach(([k,t])=>{const label=el('label',t+' %'+settings[k]);const r=el('input');r.type='range';r.min=0;r.max=100;r.value=settings[k];r.setAttribute('aria-label',t);r.oninput=()=>{settings[k]=Number(r.value);label.textContent=t+' %'+r.value;save()};p.append(el('p'),label,r)});p.append(el('p','iPhone: Safari → Paylaş → Ana Ekrana Ekle. Hoca ayarları bu cihazda saklanır.','muted'),
  btn('Yapay zekâ oturumunu kapat',async(event)=>{
    try {
      await api('/api/logout',{});
      event.target.textContent='Oturum kapatıldı';
    } catch {
      event.target.textContent='Tekrar dene';
    }
  },'secondary'));}else if(tasks[page]){const [title,desc,prompt]=tasks[page],p=panel(title);p.append(el('p',desc));const extra=el('textarea');extra.rows=3;extra.maxLength=1200;extra.placeholder='İstersen bir şey ekle…';p.append(extra,btn('Hocamla devam et',()=>prepare(prompt+' '+extra.value,page),'primary'))}}
function choose(i){settings.teacher=i;save();const t=teachers[i],p=panel(t[0]);p.append(el('p',t[2]),el('h3',t[3]));t[4].forEach(a=>p.append(btn(a,()=>followup(i,a))));p.append(btn('Serbest sohbet',()=>prepare('Benimle kendi tarzında seramik sohbeti başlat.'),'primary'))}
function followup(i,a){const t=teachers[i],p=panel(t[0]);const lines=['Pekâlâ! Çamur hazırsa bahanemiz kalmadı. 😏 Bugün neye girişiyoruz?','Güzel. Kendine uygun bir tempoda ilerleyelim. Ne yapmak istersin?','Harika! Şimdi bu fikri alışılmışın dışına taşıyalım. Hangi formu seçelim?','Hedef belli. Şimdi çalışacağımız formu seçelim.','Bu yaklaşımı bir esere dönüştürelim. Hangi form anlatımına uygun?'];p.append(el('p',lines[i]));const options=[['Sıra dışı bir vazo','Modern bir heykel','Dekoratif obje','Beni şaşırt'],['Küçük bir kase','Basit bir vazo','Mevcut eserim','Sen öner'],['Organik heykel','Asimetrik vazo','Dokulu obje','Deneysel form'],['Vazo','Kase','Teknik alıştırma','Mevcut eserim'],['Heykelsi vazo','Soyut obje','Mevcut eserim','Sen öner']];options[i].forEach(x=>p.append(btn(x,()=>prepare(t[3]+' Cevabım: '+a+'. Çalışma tercihim: '+x+'. Kendi üslubunla devam et.'))));p.append(btn('Hocamla şimdi konuş',()=>prepare(t[3]+' Cevabım: '+a+'. Bana kendi üslubunla bir sonraki soruyu sor.'),'primary'),btn('‹ Hoca seçimine dön',()=>go('teachers'),'secondary'))}
async function api(path, payload) {
  let response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(105000)
    });
  } catch {
    throw new Error('Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Yapay zekâ sunucusuna ulaşılamadı.');
    error.status = response.status;
    throw error;
  }
  return data;
}

function photoPicker(multiple, initial = []) {
  let selected = initial;
  const element = el('div', '', 'photo-picker');
  const label = el('label', multiple ? 'Fotoğraf ekle (en fazla 2)' : 'Fotoğraf seç');
  const input = el('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = multiple;
  label.append(input);
  const status = el('p', '', 'muted');
  status.setAttribute('role', 'status');
  const previews = el('div', '', 'photo-previews');
  const clear = btn('Fotoğrafları kaldır', () => {
    selected = [];
    input.value = '';
    status.textContent = '';
    draw();
  }, 'secondary');
  function draw() {
    previews.replaceChildren(...selected.map((file, index) => {
      const img = el('img', '', 'preview');
      img.alt = 'Seçilen fotoğraf ' + (index + 1);
      const url = URL.createObjectURL(file);
      img.onload = img.onerror = () => URL.revokeObjectURL(url);
      img.src = url;
      return img;
    }));
    clear.hidden = !selected.length;
  }
  input.onchange = () => {
    const files = Array.from(input.files);
    if (files.length > 2 || files.some(file => file.size > 25 * 1024 * 1024)) {
      status.textContent = 'En fazla iki, her biri 25 MB veya daha küçük fotoğraf seç.';
      input.value = '';
      return;
    }
    selected = files;
    status.textContent = '';
    draw();
  };
  element.append(label, status, previews, clear);
  draw();
  return { element, files: () => selected.slice() };
}

async function resizePhoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('Fotoğraf açılamadı. JPEG veya PNG seç.'));
      image.src = url;
    });
    const scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const imageDirections = {
  design: 'Elle şekillendirilebilen özgün bir seramik eser tasarla.',
  color: 'Referans eserin formunu koru ve dört farklı sır rengini tek bir karşılaştırma görselinde göster.',
  decor: 'İlk fotoğraftaki eseri ikinci fotoğraftaki yaşam alanına, ölçeğini ve formunu koruyarak yerleştir.',
  gallery: 'Referans eserin formunu koruyarak profesyonel bir galeri fotoğrafı oluştur.'
};
const requiredPhotos = { color: 1, decor: 2, gallery: 1 };

function prepare(prompt, task, initialPhotos) {
  const teacher = settings.teacher;
  const p = panel(teachers[teacher][0]);
  const history = [];
  const log = el('div', '', 'chat-log');
  log.setAttribute('role', 'log');
  const picker = photoPicker(true, initialPhotos);
  const label = el('label', 'Mesajın');
  const message = el('textarea');
  message.rows = 3;
  message.maxLength = 1800;
  message.value = prompt.trim();
  label.append(message);
  let busy = false;
  const status = el('p', '', 'muted');
  status.setAttribute('role', 'status');

  const login = el('form', '', 'login');
  login.hidden = true;
  const passwordLabel = el('label', 'Atölye parolası');
  const password = el('input');
  password.type = 'password';
  password.required = true;
  password.maxLength = 200;
  password.autocomplete = 'current-password';
  passwordLabel.append(password);
  const loginButton = el('button', 'Oturum aç', 'secondary');
  login.append(passwordLabel, loginButton);
  login.onsubmit = async event => {
    event.preventDefault();
    loginButton.disabled = true;
    try {
      await api('/api/login', { password: password.value });
      password.value = '';
      login.hidden = true;
      status.textContent = 'Oturum açık. Mesajını gönderebilirsin.';
      message.focus();
    } catch (error) {
      status.textContent = error.message;
    } finally {
      loginButton.disabled = false;
    }
  };

  const send = btn('Hocama gönder', () => submit('chat'), 'primary');
  const generate = btn('Görsel üret', () => submit('image'), 'secondary');
  function turn(name, text) {
    const item = el('article', '', 'chat-turn');
    item.append(el('strong', name), el('p', text));
    log.append(item);
    return item;
  }
  async function submit(mode) {
    if (busy) return;
    const text = message.value.trim();
    const files = picker.files();
    const direction = imageDirections[task] || 'Seramik odaklı bir görsel oluştur.';
    const minimum = mode === 'image' ? (requiredPhotos[task] || 0) : (task === 'review' && !history.length ? 1 : 0);
    if (files.length < minimum) {
      status.textContent = minimum === 2
        ? 'Önce eser fotoğrafını, ardından yaşam alanı fotoğrafını ekle.'
        : 'Devam etmek için eser fotoğrafını ekle.';
      return;
    }
    if (!text && (mode === 'chat' || !imageDirections[task])) {
      status.textContent = mode === 'chat' ? 'Bir mesaj yaz.' : 'Oluşturmak istediğin görseli tarif et.';
      return;
    }
    busy = send.disabled = generate.disabled = true;
    message.readOnly = true;
    status.textContent = mode === 'chat' ? 'Hocan yanıt hazırlıyor…' : 'Görsel hazırlanıyor…';
    try {
      const photos = await Promise.all(files.map(resizePhoto));
      const recent = history.map(item => item.content).join('\n').slice(-900);
      const prompt = mode === 'chat' ? text :
        [direction, text, recent && 'Sohbetten bağlam: ' + recent].filter(Boolean).join('\n').slice(0, 1800);
      const result = await api('/api/ai', {
        mode, teacher, message: prompt, history: mode === 'chat' ? history.slice(-6) : [], photos,
        tone: { mizah: settings.mizah, elestiri: settings.elestiri, samimiyet: settings.samimiyet }
      });
      if (mode === 'chat') {
        turn('Sen', text);
        turn(teachers[teacher][0], result.text);
        history.push({ role: 'user', content: text }, { role: 'assistant', content: result.text.slice(0, 1800) });
        if (history.length > 6) history.splice(0, history.length - 6);
      } else {
        const item = turn('Görsel', text || direction);
        const img = el('img', '', 'preview');
        img.alt = 'Yapay zekâyla oluşturulan seramik görseli';
        img.src = result.image;
        const download = el('a', 'Görseli indir', 'action');
        download.href = result.image;
        download.download = 'guldeninnggg.jpg';
        item.append(img, download);
      }
      message.value = '';
      status.textContent = '';
    } catch (error) {
      status.textContent = error.message;
      if (error.status === 401) {
        login.hidden = false;
        password.focus();
      }
    } finally {
      busy = send.disabled = generate.disabled = false;
      message.readOnly = false;
    }
  }
  p.append(log, label, picker.element);
  if (task === 'decor') p.append(el('p', 'İlk fotoğraf eser, ikinci fotoğraf yaşam alanı olsun.', 'muted'));
  if (task === 'color') p.append(el('p', 'Görseldeki sır renkleri pişirim sonucundan farklı olabilir.', 'muted'));
  p.append(el('p', 'Gönderdiğin mesaj ve seçili fotoğraflar işlenmek üzere OpenAI’ye iletilir.', 'muted'),
    send, generate, status, login);
}
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));go('home');if('serviceWorker'in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
