const state={me:null,admin:false,autoVoice:false,voiceType:"female"};
const qs=(s,r=document)=>r.querySelector(s);
const qsa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const categoryLabels={at_home:"At home",college:"At college",phone_call:"Phone call",interview:"Interview",shop:"Shop",travel:"Travel",friends:"Friends",office:"Office",family:"Family",meeting:"Meeting",restaurant:"Restaurant",social:"Social",confidence:"Confidence",hospital:"Hospital",bank:"Bank",daily_routine:"Daily routine",asking_help:"Asking help",polite_requests:"Polite requests",opinions:"Opinions",emotions:"Emotions",directions:"Directions",emergency:"Emergency"};
async function api(url,opt={}){const r=await fetch(url,{credentials:"same-origin",headers:{"Content-Type":"application/json",...(opt.headers||{})},...opt});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Request failed");return d}
function msg(id,t,type="success"){const e=qs(id);if(e){e.className=`message show ${type}`;e.textContent=t}}
function toast(text,type="success"){let box=qs("#toastBox");if(!box){box=document.createElement("div");box.id="toastBox";box.className="toast-box";document.body.appendChild(box)}const item=document.createElement("div");item.className=`toast ${type}`;item.textContent=text;box.appendChild(item);setTimeout(()=>item.classList.add("show"),20);setTimeout(()=>{item.classList.remove("show");setTimeout(()=>item.remove(),250)},2400)}
function showLineModal(text){let modal=qs("#lineModal");if(!modal){modal=document.createElement("div");modal.id="lineModal";modal.className="line-modal hidden";modal.innerHTML=`<div class="line-modal-card"><button class="modal-close" type="button">×</button><h3>Random line</h3><p id="lineModalText"></p><div class="reader-actions"><button class="btn btn-secondary" id="modalListenBtn" type="button">Listen</button></div></div>`;document.body.appendChild(modal);modal.addEventListener("click",e=>{if(e.target===modal||e.target.classList.contains("modal-close"))modal.classList.add("hidden")})}qs("#lineModalText").textContent=text;qs("#modalListenBtn").onclick=()=>speak(text);modal.classList.remove("hidden")}
async function session(){
  const d=await api("/api/auth/me").catch(()=>({user:null,admin:false}));
  state.me=d.user; state.admin=!!d.admin;
  qsa("[data-auth='user']").forEach(e=>{const show=!!state.me;e.classList.toggle("hidden",!show);e.style.display=show?"flex":"none";});
  qsa("[data-auth='guest']").forEach(e=>{const show=!state.me;e.classList.toggle("hidden",!show);e.style.display=show?"flex":"none";});
}
async function loadCategoryOptions(){const select=qs("#categoryFilter");if(!select)return;const chosen=new URLSearchParams(location.search).get("category")||select.value;const data=await api("/api/categories").catch(()=>({categories:[]}));qsa("option[data-dynamic='true']",select).forEach(o=>o.remove());data.categories.sort((a,b)=>a.value.localeCompare(b.value)).forEach(c=>{const opt=document.createElement("option");opt.value=c.value;opt.dataset.dynamic="true";opt.textContent=categoryLabels[c.value]||c.value.replaceAll("_"," ");select.appendChild(opt)});if(chosen)select.value=chosen}

function initTheme(){ document.documentElement.removeAttribute("data-theme"); localStorage.removeItem("ef_theme"); }
function nav(){const menu=qs("#menuToggle"),navBox=qs("#navLinks");if(menu&&navBox)menu.addEventListener("click",()=>navBox.classList.toggle("open"));let current=(location.pathname||"/").replace(/\/+$/,"")||"/";qsa(".nav-links a").forEach(a=>{a.classList.remove("active");const href=a.getAttribute("href");if(!href||href.startsWith("javascript"))return;let linkPath=href.replace(/\/+$/,"")||"/";if(linkPath===current)a.classList.add("active")})}
function auth(){qs("#signupForm")?.addEventListener("submit",async e=>{e.preventDefault();try{const d=await api("/api/auth/signup",{method:"POST",body:JSON.stringify(Object.fromEntries(new FormData(e.currentTarget).entries()))});msg("#signupMessage",d.message);setTimeout(()=>location.href="/profile",700)}catch(x){msg("#signupMessage",x.message,"error")}});qs("#loginForm")?.addEventListener("submit",async e=>{e.preventDefault();try{const d=await api("/api/auth/login",{method:"POST",body:JSON.stringify(Object.fromEntries(new FormData(e.currentTarget).entries()))});msg("#loginMessage",d.message);setTimeout(()=>location.href="/profile",700)}catch(x){msg("#loginMessage",x.message,"error")}});qs("#logoutBtn")?.addEventListener("click",async()=>{await api("/api/auth/logout",{method:"POST"});location.href="/"})}
function chooseVoice(){const voices=speechSynthesis.getVoices();const f=voices.find(v=>/female|zira|susan|samantha|victoria|google uk english female/i.test(v.name));const m=voices.find(v=>/male|david|mark|daniel|alex|google uk english male/i.test(v.name));return state.voiceType==="male"?(m||voices.find(v=>/en/i.test(v.lang))||voices[0]):(f||voices.find(v=>/en/i.test(v.lang))||voices[0])}
function speak(text,onend){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.rate=.86;u.pitch=state.voiceType==="male"?.92:1.05;const v=chooseVoice();if(v)u.voice=v;u.onend=onend||null;u.onerror=onend||null;speechSynthesis.speak(u)}
function bindVoiceChips(){qsa(".voice-chip").forEach(btn=>btn.addEventListener("click",()=>{state.voiceType=btn.dataset.voice;qsa(".voice-chip").forEach(x=>x.classList.remove("active"));btn.classList.add("active")}))}
function preview(){const tr=qs("#previewTrack");if(!tr)return;const arr=["Please give me time to finish this properly,","I speak more confidently when I stay calm,","Let me check the details before I answer,","Could you repeat that slowly one more time,"];let lines=[];function add(t,y){const e=document.createElement("div");e.className="preview-line";e.textContent=t;e.style.transform=`translateY(${y}px)`;tr.appendChild(e);lines.push({e,y})}let y=tr.parentElement.clientHeight+20;for(let i=0;i<12;i++){add(arr[i%arr.length],y);y+=64}function loop(){lines.forEach(o=>{o.y-=.34;o.e.style.transform=`translateY(${o.y}px)`;o.e.classList.remove("active")});while(lines.length&&lines[0].y<-50){lines[0].e.remove();lines.shift();add(arr[Math.floor(Math.random()*arr.length)],lines[lines.length-1].y+64)}let c=tr.parentElement.clientHeight*.5,b=null;lines.forEach(o=>{const d=Math.abs(o.y-c);if(!b||d<b.d)b={o,d}});b?.o.e.classList.add("active");requestAnimationFrame(loop)}loop()}
async function categories(){const list=qs("#categoryList");if(!list)return;const data=await api("/api/categories").catch(()=>({categories:[]}));list.innerHTML="";data.categories.sort((a,b)=>a.value.localeCompare(b.value)).forEach(c=>{const label=categoryLabels[c.value]||c.value.replaceAll("_"," ");const a=document.createElement("a");a.className="info-card";a.href="/practice?category="+c.value;a.innerHTML=`<h3>${label}</h3><p>${c.count} clean practice lines.</p>`;list.appendChild(a)})}
function card(item,save=false,saved=false){const el=document.createElement("div");el.className="sentence-card";el.innerHTML=`<div style="font-size:1.14rem;line-height:1.8;color:white">${item.text}</div><div class="meta"><span>${categoryLabels[item.category]||item.category}</span> <span>${item.level}</span> <span>${item.tag}</span></div>`;if(save){const row=document.createElement("div");row.className="reader-actions";const b=document.createElement("button");b.className="btn "+(saved?"btn-danger":"btn-secondary");b.textContent=saved?"Remove Saved":"Save";b.onclick=async()=>{if(!state.me){toast("Please login first.","error");return}if(saved){await api("/api/saved/"+item.id,{method:"DELETE"});el.remove();toast("Removed from saved.")}else{await api("/api/saved/"+item.id,{method:"POST"});b.textContent="Remove Saved";b.className="btn btn-danger";saved=true;toast("Saved successfully.")}};const l=document.createElement("button");l.className="btn btn-secondary";l.textContent="Listen";l.onclick=()=>speak(item.text);row.append(b,l);el.appendChild(row)}return el}
async function saved(){const list=qs("#savedList");if(!list)return;if(!state.me){list.innerHTML=`<div class="saved-empty-card"><h3>Login required</h3><p>Login or create an account to save useful English sentences for revision.</p><div class="reader-actions"><a class="btn btn-primary" href="/login">Login</a><a class="btn btn-secondary" href="/signup">Create account</a><a class="btn btn-secondary" href="/practice">Start practice</a></div></div>`;return}const d=await api("/api/saved");list.innerHTML="";if(!d.items.length){list.innerHTML=`<div class="saved-empty-card"><h3>No saved sentences yet</h3><p>Go to Practice and click Save line to keep useful sentences here.</p><a class="btn btn-secondary" href="/practice">Start practice</a></div>`;return}d.items.forEach(i=>list.appendChild(card(i,true,true)))}
async function profile(){const box=qs("#profileBox"),sv=qs("#profileSaved");if(!box)return;if(!state.me){box.innerHTML=`<div class="login-required-card"><h3>Login required</h3><p>Login to track your practice, streak, and saved sentences.</p><div class="reader-actions"><a class="btn btn-primary" href="/login">Login</a><a class="btn btn-secondary" href="/signup">Create account</a></div></div>`;if(sv)sv.innerHTML=`<div class="saved-empty-card"><h3>No saved lines yet</h3><p>Saved sentences will appear here after you login.</p><a class="btn btn-secondary" href="/practice">Start practice</a></div>`;return}const d=await api("/api/profile"),p=d.profile;box.innerHTML=`<h2 style="margin-top:0;">${p.name}</h2><p class="helper">${p.email}</p><div class="list-grid"><div class="sentence-card"><b style="font-size:2rem;color:white">${p.practicedCount}</b><div class="helper">practice actions</div></div><div class="sentence-card"><b style="font-size:2rem;color:white">${p.streak}</b><div class="helper">day streak</div></div><div class="sentence-card"><b style="font-size:2rem;color:white">${p.savedCount}</b><div class="helper">saved lines</div></div></div>`;if(sv){sv.innerHTML="";if(!p.saved.length)sv.innerHTML=`<div class="saved-empty-card"><h3>No saved lines yet</h3><p>Go to Practice and click Save line.</p><a class="btn btn-secondary" href="/practice">Start practice</a></div>`;else p.saved.forEach(i=>sv.appendChild(card(i,false,true)))}}
async function practice(){
  const tr=qs("#readerTrack");
  if(!tr) return;

  const cat=qs("#categoryFilter"), lev=qs("#levelFilter"), search=qs("#searchInput"), sp=qs("#speedInput"), voiceSp=qs("#voiceSpeedInput");
  const readerWindow=qs(".reader-window");

  let lib=[];
  let queue=[];
  let queuePos=0;
  let lines=[];
  let running=false;
  let paused=false;
  let voiceStopped=false;
  let rafId=null;
  let lastTs=0;
  let lastSpawnTs=0;
  let searchTimer=null;
  let currentSpeech=null;
  let speechQueue=[];
  let currentLine=null;
  let lastSpokenItem=null;
  let voiceRate=1.05;
  let textSpeedFactor=.45;

  // Final sync tuning: text movement is slower and voice starts only after full line visibility.
  // The goal is: active text and voice move together instead of text running away.
  let lineGap=36;
  let pxSpeed=10;

  function readerHeight(){ return readerWindow?.clientHeight || 520; }
  function shuffle(items){
    const arr=[...items];
    for(let i=arr.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [arr[i],arr[j]]=[arr[j],arr[i]];
    }
    return arr;
  }
  function rebuildQueue(){ queue=shuffle(lib); queuePos=0; }
  function nextItem(){
    if(!lib.length) return null;
    if(!queue.length || queuePos>=queue.length) rebuildQueue();
    return queue[queuePos++] || null;
  }
  function setEmptyMessage(message){
    lines=[];
    tr.innerHTML = '<div class="reader-empty">'+message+'</div>';
  }
  function clearSpeech(){
    currentSpeech=null;
    speechQueue=[];
    try{ speechSynthesis.cancel(); }catch(e){}
    qsa(".reader-line.speaking",tr).forEach(x=>x.classList.remove("speaking"));
  }
  function speakNext(){
    if(voiceStopped || currentSpeech || !speechQueue.length) return;
    const obj=speechQueue.shift();
    if(!obj?.item?.text) return speakNext();
    const u=new SpeechSynthesisUtterance(obj.item.text);
    currentSpeech=u;
    u.rate=voiceRate;
    u.pitch=state.voiceType==="male"?.92:1.05;
    const v=chooseVoice();
    if(v) u.voice=v;
    lastSpokenItem=obj.item;
    currentLine=obj;
    obj.e?.classList.add("speaking");
    const done=()=>{
      if(currentSpeech===u) currentSpeech=null;
      obj.e?.classList.remove("speaking");
      speakNext();
    };
    u.onend=done;
    u.onerror=done;
    try{ speechSynthesis.speak(u); }catch(e){ done(); }
  }
  function queueSpeech(obj){
    if(voiceStopped || !obj?.item?.text) return;
    speechQueue.push(obj);
    speakNext();
  }
  function spawnLine(yOverride){
    const item=nextItem();
    if(!item) return null;
    const e=document.createElement("div");
    e.className="reader-line active continuous-line";
    e.dataset.id=item.id;
    e.dataset.text=item.text;
    e.textContent=item.text;
    tr.appendChild(e);
    const obj={e,item,y:(typeof yOverride=="number"?yOverride:readerHeight()+8),spoken:false};
    e.style.opacity="1";
    e.style.transform="translateY("+obj.y+"px)";
    lines.push(obj);
    return obj;
  }
  function removeOldLines(){
    while(lines.length && lines[0].y < -18){
      lines[0].e.remove();
      lines.shift();
    }
  }
  function estimateSpeechMs(text){
    const words=String(text||"").trim().split(/\s+/).filter(Boolean).length||3;
    return Math.max(1600, Math.min(4200, ((words/(2.45*voiceRate))*1000)+450));
  }
  function spawnIntervalMs(){
    // Give the voice enough time, but keep visual flow continuous.
    const last=lines[lines.length-1];
    const estimate=last?.item?.text ? estimateSpeechMs(last.item.text) : 1900;
    return Math.max(1500, Math.min(2600, estimate*.68));
  }
  function loop(ts){
    if(!lastTs) lastTs=ts;
    const dt=Math.min(45,ts-lastTs);
    lastTs=ts;
    if(running && !paused && lib.length){
      // Keep text spacing uniform: spawn by pixel distance, not by time.
      // This removes the large blank gap after a few lines.
      if(!lines.length){
        spawnLine(readerHeight()+8);
      }
      while(lines.length && lines[lines.length-1].y <= readerHeight()-lineGap){
        spawnLine(lines[lines.length-1].y + lineGap);
      }
      const triggerY=readerHeight()-72;
      for(const line of lines){
        const move=(pxSpeed*dt)/1000;
        line.y-=move;
        line.e.style.transform="translateY("+line.y+"px)";
        if(line.y < 42){ line.e.style.opacity = Math.max(0, line.y / 42).toFixed(2); }
        else{ line.e.style.opacity = "1"; }
        // Speak only after the line is fully visible above the bottom fade area.
        if(!line.spoken && line.y<=triggerY){
          line.spoken=true;
          queueSpeech(line);
        }
      }
      removeOldLines();
    }
    rafId=requestAnimationFrame(loop);
  }
  function resetReader(){
    lines=[];
    tr.innerHTML="";
    clearSpeech();
    rebuildQueue();
    lastTs=0;
    lastSpawnTs=0;
    paused=false;
    qs("#pauseBtn") && (qs("#pauseBtn").textContent="Pause");
    if(!lib.length){
      setEmptyMessage("No sentences found. Change category, level, or search.");
      running=false;
      return;
    }
    running=true;
    voiceStopped=false;
    spawnLine(readerHeight()+8);
    lastSpawnTs=performance.now();
  }
  async function load(){
    try{
      const url="/api/sentences?"+new URLSearchParams({
        category:cat?.value||"all",
        level:lev?.value||"all",
        q:search?.value||""
      });
      const d=await api(url);
      lib=Array.isArray(d.items)?d.items:[];
      resetReader();
    }catch(e){
      lib=[];
      setEmptyMessage("Server error. Please restart the server and try again.");
      running=false;
      clearSpeech();
    }
  }
  function scheduleReload(){
    clearTimeout(searchTimer);
    searchTimer=setTimeout(load,250);
  }

  await loadCategoryOptions();
  const params=new URLSearchParams(location.search);
  if(params.get("category") && cat) cat.value=params.get("category");

  [cat,lev].forEach(x=>x?.addEventListener("change",load));
  search?.addEventListener("input",scheduleReload);
  sp?.addEventListener("input",()=>{
    textSpeedFactor=Number(sp.value)||.22;
    pxSpeed=10+(textSpeedFactor*18);
  });
  if(sp){ textSpeedFactor=Number(sp.value)||.22; pxSpeed=10+(textSpeedFactor*18); }
  voiceSp?.addEventListener("input",()=>{ voiceRate=Number(voiceSp.value)||1.05; });
  if(voiceSp) voiceRate=Number(voiceSp.value)||1.05;

  qs("#startBtn")?.addEventListener("click",()=>{
    if(!lib.length){ load(); return; }
    running=true;
    paused=false;
    voiceStopped=false;
    qs("#pauseBtn") && (qs("#pauseBtn").textContent="Pause");
    if(!lines.length) spawnLine();
    speakNext();
    toast("Reader started.");
  });
  qs("#pauseBtn")?.addEventListener("click",()=>{
    paused=!paused;
    qs("#pauseBtn").textContent=paused?"Resume":"Pause";
    toast(paused?"Text paused.":"Text resumed.");
  });
  qs("#stopVoiceBtn")?.addEventListener("click",()=>{
    voiceStopped=true;
    clearSpeech();
    toast("Voice stopped. Text will continue.");
  });
  qs("#repeatBtn")?.addEventListener("click",()=>{
    const item=(currentLine&&currentLine.item)||lastSpokenItem||lines.find(x=>x.y>0&&x.y<readerHeight())?.item;
    if(!item?.text){ toast("No line to repeat yet.","error"); return; }
    clearSpeech();
    voiceStopped=false;
    speechQueue.unshift({item,e:currentLine?.e||null});
    speakNext();
  });
  qs("#maleBtn")?.addEventListener("click",()=>{ state.voiceType="male"; qs("#maleBtn").classList.add("active"); qs("#femaleBtn")?.classList.remove("active"); });
  qs("#femaleBtn")?.addEventListener("click",()=>{ state.voiceType="female"; qs("#femaleBtn").classList.add("active"); qs("#maleBtn")?.classList.remove("active"); });
  qs("#randomBtn")?.addEventListener("click",()=>{ const item=nextItem(); if(item) showLineModal(item.text); else toast("No sentences found.","error"); });
  (qs("#saveActiveBtn")||qs("#saveBtn"))?.addEventListener("click",async()=>{
    const current=lines.find(x=>x.e.classList.contains("speaking")) || lines[0];
    if(!current?.item?.id){ toast("No line selected.","error"); return; }
    if(!state.me){ toast("Please login first.","error"); return; }
    await api("/api/saved/"+current.item.id,{method:"POST"});
    toast("Saved successfully.");
  });
  qs("#trackBtn")?.addEventListener("click",async()=>{
    if(!state.me){ toast("Please login first.","error"); return; }
    await api("/api/practice/track",{method:"POST"}).catch(()=>null);
    toast("Practice tracked.");
  });

  await load();
  rafId=requestAnimationFrame(loop);
}

async function admin(){
  const loginForm = qs("#adminLoginForm");
  const loginMsg = qs("#adminLoginMessage");
  const panel = qs("#adminPanelWrap");

  async function loadDashboard(){
    const st = await api("/api/admin/stats");
    qs("#adminStats").innerHTML = `<div class="stat-card"><div class="value">${st.sentenceCount}</div><div class="label">sentences</div></div><div class="stat-card"><div class="value">${st.userCount}</div><div class="label">users</div></div><div class="stat-card"><div class="value">${st.categoryCount}</div><div class="label">categories</div></div><div class="stat-card"><div class="value">Safe</div><div class="label">admin control</div></div>`;

    const d = await api("/api/admin/sentences");
    const tb = qs("#adminTableBody");
    tb.innerHTML = "";
    d.items.forEach(i => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${i.id}</td><td><textarea class="input" data-t="${i.id}" rows="2"></textarea></td><td><input class="input" data-c="${i.id}"></td><td><input class="input" data-l="${i.id}"></td><td><input class="input" data-g="${i.id}"></td><td><button class="btn btn-secondary" data-save="${i.id}">Save</button> <button class="btn btn-danger" data-del="${i.id}">Delete</button></td>`;
      tb.appendChild(tr);
      qs(`[data-t="${i.id}"]`).value = i.text;
      qs(`[data-c="${i.id}"]`).value = i.category;
      qs(`[data-l="${i.id}"]`).value = i.level;
      qs(`[data-g="${i.id}"]`).value = i.tag;
    });

    qsa("[data-save]").forEach(b => b.onclick = async () => {
      const id = b.dataset.save;
      await api("/api/admin/sentences/" + id, {
        method: "PUT",
        body: JSON.stringify({
          text: qs(`[data-t="${id}"]`).value,
          category: qs(`[data-c="${id}"]`).value,
          level: qs(`[data-l="${id}"]`).value,
          tag: qs(`[data-g="${id}"]`).value
        })
      });
      msg("#adminMessage", "Updated successfully.");
      toast("Sentence updated.");
    });

    qsa("[data-del]").forEach(b => b.onclick = async () => {
      if (!confirm("Delete this sentence permanently?")) return;
      await api("/api/admin/sentences/" + b.dataset.del, { method: "DELETE" });
      toast("Sentence deleted.");
      loadDashboard();
    });
  }

  if (loginForm) {
    loginForm.onsubmit = async e => {
      e.preventDefault();
      try {
        await api("/api/admin/login", {
          method: "POST",
          body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget).entries()))
        });
        toast("Admin login successful.");
        location.href = "/admin";
      } catch (x) {
        msg("#adminLoginMessage", x.message, "error");
      }
    };
  }

  if (panel) {
    api("/api/auth/me").then(me => {
      if (!me.admin) {
        location.href = "/admin-login";
        return;
      }
      loadDashboard();
    }).catch(() => location.href = "/admin-login");

    qs("#adminAddForm")?.addEventListener("submit", async e => {
      e.preventDefault();
      await api("/api/admin/sentences", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget).entries()))
      });
      e.currentTarget.reset();
      toast("Sentence added.");
      loadDashboard();
    });

    qs("#adminLogoutBtn")?.addEventListener("click", async () => {
      await api("/api/admin/logout", { method: "POST" });
      toast("Admin logged out.");
      location.href = "/admin-login";
    });
  }
}
document.addEventListener("DOMContentLoaded",async()=>{initTheme();nav();auth();bindVoiceChips();await session().catch(()=>{});await loadCategoryOptions();preview();categories();saved();profile();practice();admin();if(speechSynthesis.onvoiceschanged!==undefined){speechSynthesis.onvoiceschanged=()=>speechSynthesis.getVoices()}});
