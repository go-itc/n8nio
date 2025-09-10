import express from "express";
import { spawn } from "child_process";
import fs from "fs";

const app = express();
app.use(express.json());
const TOKEN = process.env.API_TOKEN || "";

app.post("/render-reel", (req, res) => {
  if (TOKEN && req.headers.authorization !== `Bearer ${TOKEN}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { images=[], audio, width=1080, height=1920, fps=50, still=5, transition=1, outputName=`Reel_${Date.now()}.mp4` } = req.body;
  if (!audio || images.length < 2) return res.status(400).json({ error: "Need audio and at least 2 images" });

  const imgAbs = images.map(p => `/data${p}`);
  const audioAbs = `/data${audio}`;
  const outAbs = `/data/reel_audio/${outputName}`;
  if (!fs.existsSync(audioAbs)) return res.status(404).json({ error: "Audio not found" });
  for (const p of imgAbs) if (!fs.existsSync(p)) return res.status(404).json({ error: `Image not found: ${p}` });
  fs.mkdirSync("/data/reel_audio", { recursive: true });

  const D=+still, T=+transition;
  const offs = images.map((_,i)=>Math.max((i+1)*D - (i+1)*T,0));
  const labels = images.map((_,i)=>`v${i}`);

  const args = ["-y"];
  imgAbs.forEach(p=>args.push("-loop","1","-t",String(D),"-i",p));
  args.push("-i", audioAbs);

  const scalePad = imgAbs.map((_,i)=>
    `[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,`+
    `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p,setsar=1[${labels[i]}];`
  ).join(" ");

  let chain = `[${labels[0]}][${labels[1]}]xfade=transition=slideleft:duration=${T}:offset=${offs[0]}[x1];`;
  for (let i=2;i<imgAbs.length;i++) chain += `[x${i-1}][${labels[i]}]xfade=transition=slideleft:duration=${T}:offset=${offs[i-1]}[x${i}];`;
  const last = `x${Math.max(1, imgAbs.length-1)}`;

  const filter = `${scalePad} ${chain} [${last}]tpad=stop_mode=clone:stop_duration=3600,format=yuv420p[video]; [${imgAbs.length}:a]aresample=async=1[a]`;

  args.push("-filter_complex", filter, "-map","[video]","-map","[a]","-r",String(fps),"-shortest", outAbs);

  const proc = spawn("ffmpeg", args, { stdio:["ignore","pipe","pipe"] });
  let stderr="";
  proc.stderr.on("data", d=> stderr+=d.toString());
  proc.on("close", code => code===0 ? res.json({ ok:true, output:`/reel_audio/${outputName}` }) : res.status(500).json({ ok:false, code, stderr }));
});

app.get("/healthz", (_req,res)=>res.send("ok"));
app.listen(process.env.PORT||3000, ()=>console.log("ffmpeg-wrapper up"));
