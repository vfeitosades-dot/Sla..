export const LEVEL_NAMES = [
  'Floresta do silêncio', 'Aqueduto das lanternas', 'O Vigia da Lanterna',
  'Arquivo das marés', 'Jardim dos mecanismos', 'A Tecelã do Véu',
  'Catedral dos espelhos', 'Escadaria do eclipse', 'O Rei do Alvorecer'
];
const ground=(segments)=>segments.map(([x,w])=>({x,y:306,w,h:100}));
const ledges=(rows)=>rows.map(([x,y,w=104])=>({x,y,w,h:14}));
const lamp=(x,y,r,sway=20,phase=0)=>({x,y,r,sway,phase,speed:.7});
const layouts={
  0:{floor:[[0,700],[775,825],[1680,680],[2440,680]],steps:[[245,264,130],[425,222,120],[585,182,110],[930,264,110],[1060,222,135],[1260,260,110],[1375,220,105],[1500,180,100],[1720,258,100],[1900,260,110],[2025,220,100],[2150,178,120],[2500,264,110],[2640,224,100],[2780,264,110]],gems:[[310,248],[640,166],[1128,206],[1550,164],[2210,162],[2840,248]],lights:[lamp(455,115,95,17),lamp(1030,105,115,25,1),lamp(1460,75,108,20,2),lamp(1980,105,112,32,3),lamp(2635,100,105,20,4)]},
  1:{floor:[[0,580],[650,530],[1270,510],[1860,510],[2450,670]],steps:[[210,264,120],[340,222,120],[470,180,100],[670,264,105],[810,222,130],[990,264,130],[1290,264,120],[1430,222,120],[1560,180,115],[1870,264,100],[2000,222,110],[2150,264,110],[2490,264,120],[2625,222,110],[2770,180,115]],gems:[[270,248],[520,164],[875,206],[1620,164],[2055,206],[2830,164]],lights:[lamp(450,75,110,45),lamp(900,95,100,45,1),lamp(1250,85,125,30,2),lamp(1690,80,115,50,3),lamp(2250,95,130,40,4),lamp(2800,85,120,25,2)]},
  3:{floor:[[0,840],[910,740],[1730,580],[2390,730]],steps:[[190,264,115],[325,222,120],[465,180,115],[630,222,120],[770,264,115],[920,264,110],[1420,264,130],[1570,222,110],[1740,264,110],[1880,222,110],[2025,180,120],[2160,222,100],[2440,264,110],[2580,222,110],[2710,180,130]],gems:[[250,248],[520,164],[975,248],[1625,206],[2085,164],[2780,164]],lights:[lamp(430,100,105,45),lamp(760,95,110,50,1),lamp(1570,75,105,40,2),lamp(1940,80,125,35,3),lamp(2410,90,100,45,4),lamp(2790,75,120,40,2)]},
  4:{floor:[[0,720],[800,410],[1290,630],[2010,390],[2480,640]],steps:[[180,264,110],[320,222,100],[450,180,110],[610,222,110],[800,264,105],[950,222,110],[1090,180,110],[1300,264,105],[1450,222,100],[1600,180,100],[1760,222,110],[2025,264,110],[2160,222,105],[2290,180,110],[2490,264,110],[2630,222,110],[2780,180,110]],gems:[[235,248],[505,164],[1145,164],[1650,164],[2340,164],[2830,164]],lights:[lamp(380,80,115,35),lamp(900,65,110,70,1),lamp(1335,95,110,40,2),lamp(1710,65,120,60,3),lamp(2210,70,120,50,4),lamp(2750,65,105,50,1)]},
  6:{floor:[[0,530],[610,540],[1230,580],[1890,500],[2470,650]],steps:[[170,264,105],[305,222,105],[440,180,100],[620,264,110],[750,222,110],[900,180,110],[1040,222,110],[1240,264,105],[1380,222,110],[1520,180,110],[1660,222,110],[1900,264,105],[2040,222,110],[2190,180,110],[2500,264,100],[2640,222,110],[2780,180,120]],gems:[[220,248],[490,164],[955,164],[1570,164],[2245,164],[2840,164]],lights:[lamp(320,65,120,55),lamp(780,65,130,65,1),lamp(1270,80,120,45,2),lamp(1780,65,125,55,3),lamp(2250,65,120,65,4),lamp(2810,65,130,55,1)]},
  7:{floor:[[0,690],[780,640],[1510,410],[2010,400],[2490,630]],steps:[[190,264,110],[325,222,105],[460,180,110],[600,222,100],[790,264,110],[930,222,105],[1070,180,110],[1210,138,110],[1350,180,100],[1530,264,110],[1670,222,110],[1810,180,105],[2020,264,105],[2160,222,110],[2300,180,110],[2500,264,105],[2640,222,110],[2780,180,115]],gems:[[245,248],[515,164],[1260,122],[1865,164],[2350,164],[2835,164]],lights:[lamp(430,75,115,55),lamp(810,60,125,60,1),lamp(1240,50,120,45,2),lamp(1720,65,135,65,3),lamp(2210,60,135,65,4),lamp(2820,60,125,55,1)]}
};
function makePuzzle(index){
  const lever=(id,x,kind='lever',symbol='◇')=>({id,x,y:306,kind,symbol,active:false});
  const gate=(id,x)=>({id,x,y:86,w:18,h:220,open:false});
  if(index===0)return {hint:'Acione a alavanca com E / K para abrir o selo. Reúna os 6 fragmentos.',puzzle:{kind:'lever',solved:false,progress:0,sequence:[],timer:0,duration:0},switches:[lever('lantern',970)],gates:[gate('seal',1180)]};
  if(index===1)return {hint:'Acione o relógio e atravesse o portão antes que o tempo acabe. Use o impulso.',puzzle:{kind:'timed',solved:false,progress:0,sequence:[],timer:0,duration:4.5},switches:[lever('clock',1090,'timed')],gates:[gate('clock-gate',1360)]};
  if(index===3)return {hint:'Leia as runas: II → I → III. Um erro reinicia a sequência.',puzzle:{kind:'runes',solved:false,progress:0,sequence:['II','I','III'],timer:0,duration:0},switches:[lever('r1',1090,'rune','I'),lever('r2',1180,'rune','II'),lever('r3',1270,'rune','III')],gates:[gate('archive',1370)]};
  if(index===4)return {hint:'Pise nas duas placas em sequência. Cada circuito permanece aberto.',puzzle:{kind:'plates',solved:false,progress:0,sequence:[],timer:0,duration:0},switches:[lever('plate1',1120,'plate'),lever('plate2',2130,'plate')],gates:[gate('garden1',1410),gate('garden2',2430)]};
  if(index===6)return {hint:'Desligue os dois espelhos com E / K. Eles alimentam o selo central.',puzzle:{kind:'circuits',solved:false,progress:0,sequence:[],timer:0,duration:0},switches:[lever('mirror1',1080),lever('mirror2',1660)],gates:[gate('cathedral',1840)]};
  return {hint:'Memorize: III → I → II. Depois, atravesse o selo em 4 segundos.',puzzle:{kind:'sequence-timed',solved:false,progress:0,sequence:['III','I','II'],timer:0,duration:4},switches:[lever('e1',1560,'rune','I'),lever('e2',1660,'rune','II'),lever('e3',1760,'rune','III')],gates:[gate('eclipse',1950)]};
}
function bossLevel(index){
  const rank=(index-2)/3, names=['Vigia da Lanterna','Tecelã do Véu','Rei do Alvorecer'], kinds=['warden','weaver','sovereign'];
  const heights=[48,40,54],widths=[32,40,36];
  const boss={kind:kinds[rank],name:names[rank],x:960,y:306-heights[rank],w:widths[rank],h:heights[rank],health:160+rank*64,maxHealth:160+rank*64,state:'idle',attackType:'charge',timer:0,phase:1,facing:-1,targetX:650,active:false,cycle:0,rank,lastHits:[-1,-1]};
  return {index,width:1320,height:360,theme:rank,description:['Um guardião que aprisiona a noite em sua lanterna.','A tecelã transforma fios de luz em uma armadilha.','O último soberano se recusa a deixar o sol morrer.'][rank],hint:'J / Z: atacar. Desvie dos sinais de ataque e aproveite a recuperação do chefe.',platforms:[...ground([[0,1320]]),...ledges([[160,272,95],[315,272,100],[680,252,100],[1030,252,95]])],gems:[{x:110,y:290},{x:205,y:256},{x:365,y:256},{x:455,y:290},{x:1195,y:290},{x:1260,y:290}],lights:[],spikes:[],checkpoints:[{x:280,y:306},{x:480,y:306},{x:1210,y:306}],portal:{x:1280,y:306},spawn:{x:65,y:284},puzzle:{kind:'boss',solved:false,progress:0,sequence:[],timer:0,duration:0},switches:[],gates:[{id:'arena-left',x:510,y:76,w:18,h:230,open:true,entryOnly:true},{id:'arena-right',x:1160,y:76,w:18,h:230,open:false}],boss,hazards:[]};
}
export function createCampaignLevel(index=0){
  const n=Number.isFinite(index)?Math.max(0,Math.min(8,Math.trunc(index))):0;
  if(n%3===2)return bossLevel(n);
  const layout=layouts[n], platforms=[...ground(layout.floor),...ledges(layout.steps)];
  const puzzles=makePuzzle(n), theme=Math.floor(n/3);
  // Each refuge is selected on solid ground and outside puzzle gates.
  const checkpoints=[layout.floor[1][0]+50,layout.floor[2][0]+60,layout.floor[3][0]+50].map(x=>({x,y:306}));
  const spikes=n===0?[{x:1165,y:299,w:62,h:7},{x:1860,y:299,w:50,h:7},{x:2715,y:299,w:55,h:7}]:[...layout.floor.slice(1)].map(([x,w],i)=>({x:x+Math.min(w-100,230),y:299,w:38+(n>4?12:0),h:7}));
  // No spikes at mechanisms or gates: puzzle failures should be readable, not cheap.
  const safeSpikes=spikes.filter(s=>![...puzzles.switches,...puzzles.gates].some(o=>Math.abs(o.x-s.x)<90));
  return {index:n,width:3120,height:360,theme,description:['Siga os fragmentos através das raízes adormecidas.','A água guarda o brilho das antigas lanternas.','','Escute a ordem gravada nas ruínas.','Desperte os circuitos esquecidos do jardim.','','Quebre a alimentação dos espelhos solares.','A última passagem exige memória e precisão.'][n],platforms,gems:layout.gems.map(([x,y])=>({x,y})),lights:layout.lights.map(l=>({...l,speed:.62+n*.055})),spikes:safeSpikes,checkpoints,portal:{x:3038,y:306},spawn:{x:72,y:284},...puzzles,boss:null,hazards:[]};
}
