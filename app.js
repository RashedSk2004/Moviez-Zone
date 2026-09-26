let token=localStorage.getItem("mz_token"), authMode="login", videos=[];
const $=s=>document.querySelector(s);
function toast(t){const x=$("#toast");x.textContent=t;x.style.display="block";clearTimeout(window.__t);window.__t=setTimeout(()=>x.style.display="none",1700)}
async function api(url,opt={}){opt.headers={...(opt.headers||{}),...(token?{Authorization:"Bearer "+token}:{})};const r=await fetch(url,opt);const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"Request failed");return d}
$("#menuBtn").onclick=()=>$("#nav").classList.toggle("open");
$("#searchBtn").onclick=()=>{$("#searchInput").focus();$("#home").scrollIntoView({behavior:"smooth"})};
$("#doSearch").onclick=load;$("#searchInput").addEventListener("keydown",e=>{if(e.key==="Enter")load()});
$("#loginBtn").onclick=()=>openAuth("login");$("#signupBtn").onclick=()=>openAuth("signup");
function openAuth(m){authMode=m;$("#authModal").hidden=false;$("#authTitle").textContent=m==="login"?"Sign In":"Create Your Account";$("#authForm [name=name]").hidden=m==="login";$("#switchAuth").textContent=m==="login"?"Create account":"Already have an account? Sign in"}
function closeAuth(){$("#authModal").hidden=true}
$("#switchAuth").onclick=()=>openAuth(authMode==="login"?"signup":"login");
$("#authForm").onsubmit=async e=>{e.preventDefault();const body=Object.fromEntries(new FormData(e.target));try{if(authMode==="signup"){await api("/api/signup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});toast("Account created — please sign in");openAuth("login");return}const d=await api("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});token=d.token;localStorage.setItem("mz_token",token);closeAuth();refreshMe()}catch(err){toast(err.message)}};
$("#logoutBtn").onclick=()=>{localStorage.removeItem("mz_token");token=null;location.reload()};
async function refreshMe(){if(!token)return;try{const u=await api("/api/me");$("#loginBtn").hidden=true;$("#signupBtn").hidden=true;$("#logoutBtn").hidden=false;if(u.role==="admin"||u.role==="uploader"){$("#adminNav").hidden=false;$("#admin").hidden=false}if(u.role==="admin"){$("#permissionPanel").hidden=false;loadUsers()}}catch{localStorage.removeItem("mz_token");token=null}}
async function loadUsers(){try{const us=await api("/api/users");$("#users").innerHTML=us.map(u=>`<div class="userRow"><span><b>${esc(u.name)}</b><br><small>${esc(u.email)} • ${u.role}</small></span><select onchange="changeRole(${u.id},this.value)"><option ${u.role==="user"?"selected":""}>user</option><option ${u.role==="uploader"?"selected":""}>uploader</option><option ${u.role==="admin"?"selected":""}>admin</option></select></div>`).join("")}catch{}}
window.changeRole=async(id,role)=>{try{await api("/api/users/"+id+"/role",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({role})});toast("Permission updated");loadUsers()}catch(e){toast(e.message)}};
function esc(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
$("#uploadForm").addEventListener("submit", e=>{
  e.preventDefault();

  const form = e.target;
  const status = document.createElement("div");
  status.id = "uploadProgress";
  status.style.cssText = "margin-top:12px;font-size:16px;font-weight:bold;text-align:center;";
  form.appendChild(status);

  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/api/videos");

  xhr.setRequestHeader("Authorization", "Bearer " + token);

  xhr.upload.onprogress = e => {
    if (e.lengthComputable) {
      const done = (e.loaded / 1024 / 1024 / 1024).toFixed(2);
      const total = (e.total / 1024 / 1024 / 1024).toFixed(2);
      const percent = Math.round((e.loaded / e.total) * 100);

      status.textContent = `Uploading… ${done} GB / ${total} GB (${percent}%)`;
    }
  };

  xhr.onload = () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      status.textContent = "Upload complete ✅";
      toast("Video uploaded successfully");
      form.reset();
      load();
    } else {
      status.textContent = "Upload failed ❌";
      toast("Upload failed");
    }
  }

  xhr.onerror = () => {
    status.textContent = "Upload failed ❌";
    toast("Upload failed");
  };

  xhr.send(new FormData(form));
});
function poster(v){return v.poster?`<img src="${v.poster}" alt="">`:"🎬"}
function topCard(v,i){return `<button class="topCard" onclick="playMovie(${v.id})"><span class="rank">${i+1}</span><div class="poster">${poster(v)}</div><b>${esc(v.title)}</b><small>◉ ${(v.views||0).toLocaleString()} views</small></button>`}
function movieCard(v){return `<button class="movieCard" onclick="playMovie(${v.id})"><div class="poster">${poster(v)}</div><div class="movieInfo"><b>${esc(v.title)}</b><small>${esc(v.year)} • ${esc(v.genre)}</small></div></button>`}
function trendCard(v){return movieCard(v)}
async function load(){try{const q=$("#searchInput").value.trim();videos=await api("/api/videos"+(q?"?q="+encodeURIComponent(q):""));$("#topRow").innerHTML=videos.slice(0,10).map(topCard).join("")||'<p class="muted">No movies found.</p>';$("#trendRow").innerHTML=videos.slice(0,6).map(trendCard).join("");$("#movieGrid").innerHTML=videos.map(movieCard).join("")||'<p class="muted">No movies found.</p>'}catch(e){toast(e.message)}}
window.playMovie=async id=>{
  const v=videos.find(x=>x.id==id);
  if(!v) return;

  const entries=Object.entries(v.qualities||{});
  if(!entries.length){
    toast("Video file not found");
    return;
  }

  $("#qualitySelect").innerHTML=entries.map(([q,o])=>
    `<option value="${q}">${q}p</option>`
  ).join("");

  const player=$("#player");
  $("#qualitySelect").value=entries[0][0];
  player.src=typeof entries[0][1]==="string"?entries[0][1]:(entries[0][1]?.url||entries[0][1]?.src||"");
  player.load();

  $("#playerTitle").textContent=v.title;
  $("#playerMeta").textContent=`${v.year||""} • ${v.genre||""} • ${v.tag||"HD"}`;

  $("#playerModal").hidden=false;

  $("#qualitySelect").onchange=()=>{
    const selected=v.qualities[$("#qualitySelect").value];
    if(selected?.url){
      player.src=typeof selected==="string"?selected:(selected?.url||selected?.src||"");
      player.load();
      player.play().catch(()=>{});
    }
  };

  player.play().catch(()=>{});

  try{
    await api("/api/videos/"+id+"/view",{method:"POST"});
    v.views=(v.views||0)+1;
  }catch(e){}
};
window.closePlayer=()=>{$("#player").pause();$("#playerModal").hidden=true};
document.querySelectorAll(".genreBar button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".genreBar button").forEach(x=>x.classList.remove("active"));b.classList.add("active");const g=b.textContent.trim();if(g==="All"){load();return}$("#searchInput").value=g;load()});
load();refreshMe();
