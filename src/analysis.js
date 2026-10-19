const DAY=86400000;
export function regression(samples){
  const start=Date.parse(samples[0].date), xs=samples.map(o=>(Date.parse(o.date)-start)/DAY);
  const mx=xs.reduce((a,b)=>a+b,0)/xs.length,my=samples.reduce((a,b)=>a+b.los_mm,0)/samples.length;
  const variance=xs.reduce((a,x)=>a+(x-mx)**2,0);
  const slope=variance?xs.reduce((a,x,i)=>a+(x-mx)*(samples[i].los_mm-my),0)/variance:0;
  return {slope,intercept:my-slope*mx,start};
}
export function analyzePoint(point,cutoff,{minCoherence=.65,sensitivity=4}={}){
  const available=point.observations.filter(o=>o.date<=cutoff).sort((a,b)=>a.date.localeCompare(b.date));
  const samples=available.filter(o=>o.coherence>=minCoherence);
  const base={id:point.id,lat:point.lat,lon:point.lon,label:point.label,context:point.context,samples,available:available.length,coherence:samples.length?samples.reduce((a,o)=>a+o.coherence,0)/samples.length:null,velocity:null,cusum:0,changeDate:null,score:null,status:'insufficient'};
  if(samples.length<8)return base;
  const n=Math.max(4,Math.floor(samples.length/2)),baseline=regression(samples.slice(0,n));
  const predict=o=>baseline.intercept+baseline.slope*(Date.parse(o.date)-baseline.start)/DAY;
  const sigma=Math.max(1.5,Math.sqrt(samples.slice(0,n).reduce((a,o)=>a+(o.los_mm-predict(o))**2,0)/n));
  let running=0,peak=0,changeDate=null;
  for(const o of samples.slice(n)){running=Math.max(0,running+(predict(o)-o.los_mm)/sigma-.5);peak=Math.max(peak,running);if(running>=sensitivity&&!changeDate)changeDate=o.date;}
  const status=changeDate?'anomaly':'watch';
  const strength=Math.min(1,peak/(sensitivity*3));
  const contextWeight={hospital:1,road:.65,building:.4,other:.2}[point.context]??.2;
  const score=status==='anomaly'?Math.round(100*(.7*strength+.3*contextWeight)):null;
  return {...base,status,velocity:regression(samples).slope*365.25,cusum:peak,changeDate,score};
}
export function distanceMeters(a,b){const rad=Math.PI/180;const dlat=(b.lat-a.lat)*rad,dlon=(b.lon-a.lon)*rad;const h=Math.sin(dlat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlon/2)**2;return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));}
export function clusterPoints(rows,radiusMeters=180){
  const remaining=new Set(rows.filter(p=>p.status==='anomaly'));const components=[];
  while(remaining.size){const seed=remaining.values().next().value;remaining.delete(seed);const component=[seed];for(let i=0;i<component.length;i++)for(const p of remaining)if(distanceMeters(component[i],p)<=radiusMeters){remaining.delete(p);component.push(p);}components.push(component);}
  return components;
}
