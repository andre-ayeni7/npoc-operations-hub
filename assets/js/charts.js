const NPOC_CHARTS = (() => {
  function makeCanvas(parent, id){
    parent.innerHTML = `<canvas id="${id}" aria-label="Chart"></canvas>`;
    const canvas = document.getElementById(id);
    const dpr = window.devicePixelRatio || 1;
    const rect = parent.getBoundingClientRect();
    canvas.width = Math.max(300, rect.width) * dpr;
    canvas.height = Math.max(180, rect.height) * dpr;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return {canvas, ctx, w: Math.max(300, rect.width), h: Math.max(180, rect.height)};
  }
  function clear(ctx,w,h){ ctx.clearRect(0,0,w,h); }
  function text(ctx, str, x, y, opts={}){ ctx.save(); ctx.fillStyle=opts.color||'#475467'; ctx.font=`${opts.weight||600} ${opts.size||12}px Inter, system-ui, sans-serif`; ctx.textAlign=opts.align||'left'; ctx.fillText(str,x,y); ctx.restore(); }
  function lineChart(el, data, opts={}){
    const parent = typeof el === 'string' ? document.querySelector(el) : el; if(!parent) return;
    const {ctx,w,h}=makeCanvas(parent, `chart-${Math.random().toString(16).slice(2)}`);
    const pad={l:42,r:20,t:18,b:38}; const x0=pad.l, y0=h-pad.b, cw=w-pad.l-pad.r, ch=h-pad.t-pad.b;
    const keys=opts.series||[{key:'expected',label:'Expected',color:'#4472C4'},{key:'actual',label:'Actual',color:'#ED7D31'}];
    const max=Math.max(5,...data.flatMap(d=>keys.map(k=>Number(d[k.key]||0))))*1.18;
    clear(ctx,w,h); ctx.strokeStyle='#e6eee0'; ctx.lineWidth=1;
    for(let i=0;i<4;i++){ const y=pad.t+(ch/3)*i; ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x0+cw,y); ctx.stroke(); }
    data.forEach((d,i)=>{ const x=x0+(cw/(Math.max(1,data.length-1)))*i; text(ctx,d.week||d.month||d.label,x,y0+24,{size:11,align:'center'}); });
    keys.forEach((s,si)=>{
      ctx.strokeStyle=s.color; ctx.lineWidth=3; ctx.lineJoin='round'; ctx.lineCap='round'; ctx.beginPath();
      data.forEach((d,i)=>{ const x=x0+(cw/(Math.max(1,data.length-1)))*i; const y=y0-(Number(d[s.key]||0)/max)*ch; i?ctx.lineTo(x,y):ctx.moveTo(x,y); }); ctx.stroke();
      data.forEach((d,i)=>{ const x=x0+(cw/(Math.max(1,data.length-1)))*i; const y=y0-(Number(d[s.key]||0)/max)*ch; ctx.fillStyle=s.color; ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2); ctx.fill(); text(ctx,String(d[s.key]||0),x,y-10,{size:11,align:'center',color:'#1f2937'}); });
      ctx.fillStyle=s.color; ctx.fillRect(x0+si*110,8,14,4); text(ctx,s.label,x0+20+si*110,13,{size:11,color:'#475467'});
    });
  }
  function barChart(el, data, opts={}){
    const parent = typeof el === 'string' ? document.querySelector(el) : el; if(!parent) return;
    const {ctx,w,h}=makeCanvas(parent, `chart-${Math.random().toString(16).slice(2)}`);
    const pad={l:42,r:18,t:24,b:44}; const x0=pad.l, y0=h-pad.b, cw=w-pad.l-pad.r, ch=h-pad.t-pad.b;
    const key=opts.key||'value'; const max=Math.max(5,...data.map(d=>Number(d[key]||0)))*1.15;
    clear(ctx,w,h); ctx.strokeStyle='#e6eee0'; ctx.lineWidth=1;
    for(let i=0;i<4;i++){ const y=pad.t+(ch/3)*i; ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x0+cw,y); ctx.stroke(); }
    const bw=Math.min(54,cw/data.length*.55);
    data.forEach((d,i)=>{ const x=x0+(cw/data.length)*i+(cw/data.length-bw)/2; const val=Number(d[key]||0); const bh=(val/max)*ch; const grad=ctx.createLinearGradient(0,y0-bh,0,y0); grad.addColorStop(0,'#6fba3f'); grad.addColorStop(1,'#f4c542'); ctx.fillStyle=grad; roundRect(ctx,x,y0-bh,bw,bh,10); ctx.fill(); text(ctx,String(val),x+bw/2,y0-bh-8,{align:'center',size:12,color:'#102012'}); text(ctx,d.label,x+bw/2,y0+24,{align:'center',size:11}); });
  }
  function doughnut(el, data){
    const parent = typeof el === 'string' ? document.querySelector(el) : el; if(!parent) return;
    const {ctx,w,h}=makeCanvas(parent, `chart-${Math.random().toString(16).slice(2)}`); clear(ctx,w,h);
    const total=data.reduce((a,b)=>a+Number(b.value||0),0)||1; const cx=w/2, cy=h/2, r=Math.min(w,h)*.32; let start=-Math.PI/2; const colors=['#6fba3f','#f4c542','#4472C4','#ED7D31'];
    data.forEach((d,i)=>{ const ang=(Number(d.value||0)/total)*Math.PI*2; ctx.beginPath(); ctx.arc(cx,cy,r,start,start+ang); ctx.lineWidth=28; ctx.strokeStyle=colors[i%colors.length]; ctx.stroke(); start+=ang; });
    text(ctx,String(total),cx,cy+4,{align:'center',size:32,weight:900,color:'#102012'}); text(ctx,'Total',cx,cy+26,{align:'center',size:12});
    data.forEach((d,i)=>{ ctx.fillStyle=colors[i%colors.length]; ctx.fillRect(16,20+i*22,12,12); text(ctx,`${d.label}: ${d.value}`,34,31+i*22,{size:12}); });
  }
  function roundRect(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
  return {lineChart, barChart, doughnut};
})();
