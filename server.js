import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || "CHANGE_THIS_IN_PRODUCTION";

const dataDir = path.join(__dirname, "data");
const uploadDir = path.join(__dirname, "uploads");
fs.mkdirSync(dataDir, {recursive:true});
fs.mkdirSync(uploadDir, {recursive:true});
const dbFile = path.join(dataDir, "db.json");

if (!fs.existsSync(dbFile)) {
  fs.writeFileSync(dbFile, JSON.stringify({
    users: [{
      id: 1, name:"Admin", email:"admin@moviezzone.local",
      passwordHash:bcrypt.hashSync("Admin@12345",10), role:"admin"
    }],
    videos:[]
  }, null, 2));
}
const readDB=()=>JSON.parse(fs.readFileSync(dbFile));
const writeDB=x=>fs.writeFileSync(dbFile, JSON.stringify(x,null,2));

const storage=multer.diskStorage({
  destination:uploadDir,
  filename:(req,file,cb)=>cb(null, Date.now()+"-"+file.originalname.replace(/[^a-z0-9._-]/gi,"_"))
});
const upload=multer({storage,limits:{fileSize:8*1024*1024*1024}});

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(__dirname));
app.use("/uploads", express.static(uploadDir));

function auth(req,res,next){
  try {
    const token=(req.headers.authorization||"").replace("Bearer ","");
    req.user=jwt.verify(token,SECRET);
    next();
  } catch { res.status(401).json({error:"Login required"}); }
}
function roles(...allowed){
  return (req,res,next)=>allowed.includes(req.user?.role)
    ? next() : res.status(403).json({error:"Permission denied"});
}

app.post("/api/signup", async (req,res)=>{
  const {name,email,password}=req.body;
  if(!name||!email||!password||password.length<6)
    return res.status(400).json({error:"Name, email and 6+ character password required"});
  const db=readDB();
  if(db.users.some(u=>u.email.toLowerCase()===email.toLowerCase()))
    return res.status(409).json({error:"Email already registered"});
  db.users.push({id:Date.now(),name,email,passwordHash:await bcrypt.hash(password,10),role:"user"});
  writeDB(db); res.json({ok:true});
});

app.post("/api/login", async (req,res)=>{
  const db=readDB();
  const u=db.users.find(x=>x.email.toLowerCase()===String(req.body.email||"").toLowerCase());
  if(!u || !(await bcrypt.compare(req.body.password||"",u.passwordHash)))
    return res.status(401).json({error:"Invalid email or password"});
  res.json({token:jwt.sign({id:u.id,name:u.name,email:u.email,role:u.role},SECRET,{expiresIn:"7d"})});
});

app.get("/api/me",auth,(req,res)=>res.json(req.user));

app.get("/api/videos",(req,res)=>{
  const q=String(req.query.q||"").toLowerCase();
  let videos=readDB().videos;
  if(q) videos=videos.filter(v=>(v.title+" "+v.genre+" "+v.year).toLowerCase().includes(q));
  res.json(videos.sort((a,b)=>b.views-a.views));
});

app.post("/api/videos/:id/view",(req,res)=>{
  const db=readDB(), v=db.videos.find(x=>x.id==req.params.id);
  if(!v) return res.status(404).json({error:"Video not found"});
  v.views=(v.views||0)+1; writeDB(db); res.json({views:v.views});
});

app.get("/api/users",auth,roles("admin"),(req,res)=>{
  res.json(readDB().users.map(({passwordHash,...u})=>u));
});

app.patch("/api/users/:id/role",auth,roles("admin"),(req,res)=>{
  if(!["user","uploader","admin"].includes(req.body.role))
    return res.status(400).json({error:"Invalid role"});
  const db=readDB(), u=db.users.find(x=>x.id==req.params.id);
  if(!u) return res.status(404).json({error:"User not found"});
  u.role=req.body.role; writeDB(db); res.json({ok:true});
});

app.post("/api/videos",auth,roles("admin","uploader"),
  upload.fields([
    {name:"video480",maxCount:1},
    {name:"video720",maxCount:1},
    {name:"video1080",maxCount:1},
    {name:"video4k",maxCount:1},
    {name:"poster",maxCount:1}
  ]),
  (req,res)=>{
    const files=req.files||{};
    const qualities={};
    for(const key of ["video480","video720","video1080","video4k"]){
      if(files[key]?.[0]) qualities[key.replace("video","")]={
        url:"/uploads/"+files[key][0].filename,
        size:files[key][0].size
      };
    }
    if(!Object.keys(qualities).length)
      return res.status(400).json({error:"Upload at least one video quality"});
    const poster=files.poster?.[0] ? "/uploads/"+files.poster[0].filename : "";
    const db=readDB();
    const v={
      id:Date.now(), title:req.body.title||"Untitled",
      year:req.body.year||"", genre:req.body.genre||"Movie",
      description:req.body.description||"", tag:req.body.tag||"HD",
      poster, qualities, views:0, uploadedBy:req.user.name
    };
    db.videos.push(v); writeDB(db); res.json(v);
  }
);

app.delete("/api/videos/:id",auth,roles("admin","uploader"),(req,res)=>{
  const db=readDB(), i=db.videos.findIndex(v=>v.id==req.params.id);
  if(i<0) return res.status(404).json({error:"Video not found"});
  const v=db.videos[i];
  if(req.user.role!=="admin" && v.uploadedBy!==req.user.name)
    return res.status(403).json({error:"You can only delete your own uploads"});
  db.videos.splice(i,1); writeDB(db); res.json({ok:true});
});

app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"index.html")));
app.listen(PORT,()=>console.log(`Moviez Zone: http://localhost:${PORT}`));
