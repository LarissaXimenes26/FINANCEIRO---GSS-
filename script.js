// ═══════════════════════════════════════════════
// PERÍODO
// ═══════════════════════════════════════════════
let dtIni='', dtFim='';
const today = () => new Date().toISOString().slice(0,10);
const addD = (iso,n) => { const d=new Date(iso); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
const iso2br = iso => iso ? iso.split('-').reverse().join('/') : '';
const br2iso = br => br ? br.split('/').reverse().join('-') : '';

function setP(p, btn) {
  document.querySelectorAll('.pb').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  const t=today(), y=t.slice(0,4), m=t.slice(5,7);
  if(p==='hoje'){ dtIni=t; dtFim=t; }
  else if(p==='semana'){ dtIni=addD(t,-6); dtFim=t; }
  else if(p==='mes'){ dtIni=`${y}-${m}-01`; dtFim=`${y}-${m}-${String(new Date(+y,+m,0).getDate()).padStart(2,'0')}`; }
  else if(p==='trim'){ const qm=Math.floor((+m-1)/3)*3; dtIni=`${y}-${String(qm+1).padStart(2,'0')}-01`; dtFim=t; }
  else if(p==='ano'){ dtIni=`${y}-01-01`; dtFim=`${y}-12-31`; }
  document.getElementById('dt-ini').value=dtIni;
  document.getElementById('dt-fim').value=dtFim;
  document.getElementById('pinfo').textContent=iso2br(dtIni)+' → '+iso2br(dtFim);
  renderAll();
}
function setCustom(){
  const a=document.getElementById('dt-ini').value, b=document.getElementById('dt-fim').value;
  if(!a||!b) return;
  dtIni=a; dtFim=b;
  document.querySelectorAll('.pb').forEach(b=>b.classList.remove('active'));
  document.getElementById('pinfo').textContent=iso2br(dtIni)+' → '+iso2br(dtFim);
  renderAll();
}

// ═══════════════════════════════════════════════
// DADOS GLOBAIS
// ═══════════════════════════════════════════════
let D = { rec:{mat:[],fil:[]}, pag:{mat:[],fil:[]}, nfe:{mat:[],fil:[]}, ped:{mat:[],fil:[]}, dev:{mat:[],fil:[]} };
function isDev(nf){ const op=((nf.cabecalho&&nf.cabecalho.cOperacao)||nf._tipo||'').toLowerCase(); return op.includes('devol')||op.includes('retorno'); }
let pages = { rec:1, pag:1, fat:1 };
const PER = 20;
const CR = {};

// ═══════════════════════════════════════════════
// ESTADO DA UNIDADE
// ═══════════════════════════════════════════════
let uniFilter='';

function setUni(u, btn){
  uniFilter=u;
  document.querySelectorAll('#uf-all,#uf-mat,#uf-fil').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderAll();
}

// ─────────────────────────────────────
// CONVERSÃO DE DATA E FILTRO DE PERÍODO
// ─────────────────────────────────────
function toISO(d){
  if(d===null||d===undefined||d==='') return '';
  if(d instanceof Date){
    if(isNaN(d.getTime())) return '';
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  const s=String(d).trim(); if(!s) return '';
  const m1=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if(m1){const y=m1[3].length===2?'20'+m1[3]:m1[3];return y+'-'+m1[2].padStart(2,'0')+'-'+m1[1].padStart(2,'0');}
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m2=s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if(m2) return m2[3]+'-'+m2[2]+'-'+m2[1];
  return '';
}

function inPeriod(item){
  if(!dtIni||!dtFim) return true;
  const raw=item._date||item.data_vencimento||item.data||item.dDtEmissao||
            (item.cabecalho&&(item.cabecalho.dDtEmissao||item.cabecalho.dDtPedido))||'';
  if(!raw) return true;
  const iso=toISO(raw);
  if(!iso) return true;
  return iso>=dtIni && iso<=dtFim;
}

function filtered(key){
  if(uniFilter==='mat') return {mat:D[key].mat, fil:[]};
  if(uniFilter==='fil') return {mat:[], fil:D[key].fil};
  return D[key];
}

// ═══════════════════════════════════════════════
// HELPERS DE CAMPO (campos reais do Omie)
// ═══════════════════════════════════════════════
const vDoc   = i => parseFloat(i.valor_documento||0);
const dtVen  = i => i.data_vencimento||'';
const stTit  = i => (i.status_titulo||'ABERTO').toUpperCase();
const catCod = i => i.codigo_categoria||'';
const catNome= i => i.nome_categoria||i.descricao_categoria||i.codigo_categoria||'Outros';
const nomeCli  = i => i.nome_cliente||i.razao_social_cliente||'—';
const nomeForn = i => i.nome_fornecedor||i.razao_social_fornecedor||'—';
const nfVal    = nf => parseFloat(nf.total_nf||nf.compleNF?.nTotalNF||nf.infAdic?.nValorNF||0);
const nfCli    = nf => nf.cabecalho?.cNomeDest||nf.infAdic?.cDadosAdic||'—';
const nfNum    = nf => nf.cabecalho?.nNF||nf.nNF||'—';
const nfDt     = nf => nf.cabecalho?.dDtEmissao||nf.dDtEmissao||'';
const pedVal   = p => parseFloat(p.cabecalho?.nValorTotal||p.total?.nValorTotal||0);
const pedCli   = p => p.infAdic?.cNomeCliente||p.cabecalho?.cNomeDest||'—';
const pedNum   = p => String(p.cabecalho?.nNumPedido||'—');
const pedDt    = p => p.cabecalho?.dDtPedido||'';

const bSt = s => {
  if(s==='PAGO')    return '<span class="badge b-pago">Recebido/Pago</span>';
  if(s==='VENCIDO') return '<span class="badge b-vencido">Vencido</span>';
  if(s==='CANCELADO') return '<span class="badge" style="background:rgba(255,255,255,.08);color:rgba(255,255,255,.4)">Cancelado</span>';
  return '<span class="badge b-aberto">Em Aberto</span>';
};
const bUni = u => u==='Matriz' ? '<span class="badge b-mat">Matriz</span>' : '<span class="badge b-fil">Filial</span>';

// ═══════════════════════════════════════════════
// FORMATAÇÃO
// ═══════════════════════════════════════════════
const BRL = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const fmt  = v => BRL.format(parseFloat(v)||0);
const fmtS = v => { v=parseFloat(v)||0; if(Math.abs(v)>=1e6) return 'R$'+(v/1e6).toFixed(2)+'M'; if(Math.abs(v)>=1e3) return 'R$'+Math.round(v/1e3)+'k'; return BRL.format(v); };
const g    = id => document.getElementById(id);
const set  = (id,v) => { const e=g(id); if(e) e.textContent=v; };
const dc   = id => { if(CR[id]){ try{CR[id].destroy();}catch(e){} delete CR[id]; } };
const CO   = { tks:{ color:'rgba(255,255,255,.3)', font:{size:8} }, grid:'rgba(255,255,255,.05)' };

// ═══════════════════════════════════════════════
// RENDER GERAL
// ═══════════════════════════════════════════════
function renderAll(){
  const pg = document.querySelector('.page.active')?.id?.replace('page-','');
  renderDash();
  if(pg==='receber')          renderRec();
  else if(pg==='pagar')       renderPag();
  else if(pg==='faturamento') renderFat();
  else if(pg==='fluxo')       renderFluxo();
}

// ═══════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════
function renderDash(){
  const {mat:recMat,fil:recFil}=filtered('rec'); const allRec=[...recMat,...recFil].filter(inPeriod);
  const {mat:pagMat,fil:pagFil}=filtered('pag'); const allPag=[...pagMat,...pagFil].filter(inPeriod);
  const {mat:nfeMat_,fil:nfeFil_}=filtered('nfe'); const allNfe=[...nfeMat_,...nfeFil_].filter(n=>!isDev(n)).filter(inPeriod);
  const {mat:devMat_,fil:devFil_}=filtered('dev'); const allDev=[...devMat_,...devFil_].filter(inPeriod);
  const {mat:pedMat_,fil:pedFil_}=filtered('ped'); const allPed=[...pedMat_,...pedFil_].filter(inPeriod);

  const recPago   = allRec.filter(i=>stTit(i)==='PAGO').reduce((a,b)=>a+vDoc(b),0);
  const recAberto = allRec.filter(i=>['ABERTO','VENCIDO'].includes(stTit(i))).reduce((a,b)=>a+vDoc(b),0);
  const pagPago   = allPag.filter(i=>stTit(i)==='PAGO').reduce((a,b)=>a+vDoc(b),0);
  const pagAberto = allPag.filter(i=>['ABERTO','VENCIDO'].includes(stTit(i))).reduce((a,b)=>a+vDoc(b),0);
  const fatTotal  = allNfe.reduce((a,b)=>a+nfVal(b),0);
  const devTotal  = allDev.reduce((a,b)=>a+nfVal(b),0);
  const pedTotal  = allPed.reduce((a,b)=>a+pedVal(b),0);

  set('k-rec-pago', fmt(recPago)); set('k-rec-pago-s', `${allRec.filter(i=>stTit(i)==='PAGO').length} títulos`);
  set('k-rec-aberto', fmt(recAberto)); set('k-rec-aberto-s', `${allRec.filter(i=>stTit(i)!=='PAGO').length} títulos`);
  set('k-pag-pago', fmt(pagPago)); set('k-pag-pago-s', `${allPag.filter(i=>stTit(i)==='PAGO').length} títulos`);
  set('k-pag-aberto', fmt(pagAberto)); set('k-pag-aberto-s', `${allPag.filter(i=>stTit(i)!=='PAGO').length} títulos`);
  set('k-fat', fmt(fatTotal)); set('k-fat-s', `${allNfe.length} NF-e`);
  set('k-ped', fmt(pedTotal)); set('k-ped-s', `${allPed.length} pedidos`);
  set('k-dev', fmt(devTotal)); set('k-dev-s', `${allDev.length} devoluções`);

  ['mat','fil'].forEach(id=>{ const card=document.querySelector(`.ucard-hdr .dot[style*='${id==='mat'?'4da':'FAC'}']`)?.closest('.ucard'); if(card){ card.style.display=(uniFilter&&uniFilter!==id)?'none':''; } });
  for(const [u,id] of [['mat','mat'],['fil','fil']]){
    const rec=D.rec[u].filter(inPeriod), pag=D.pag[u].filter(inPeriod);
    const nfe=D.nfe[u].filter(n=>!isDev(n)).filter(inPeriod);
    set(`d-${id}-recpago`,   fmt(rec.filter(i=>stTit(i)==='PAGO').reduce((a,b)=>a+vDoc(b),0)));
    set(`d-${id}-recaberto`, fmt(rec.filter(i=>stTit(i)!=='PAGO').reduce((a,b)=>a+vDoc(b),0)));
    set(`d-${id}-pagpago`,   fmt(pag.filter(i=>stTit(i)==='PAGO').reduce((a,b)=>a+vDoc(b),0)));
    set(`d-${id}-pagaberto`, fmt(pag.filter(i=>stTit(i)!=='PAGO').reduce((a,b)=>a+vDoc(b),0)));
    set(`d-${id}-fat`,       fmt(nfe.reduce((a,b)=>a+nfVal(b),0)));
  }

  dc('dash-bar');
  const cB=g('c-dash-bar');
  if(cB){
    CR['dash-bar']=new Chart(cB,{type:'bar',data:{
      labels:['Recebido','A Receber','Pago','A Pagar'],
      datasets:[
        {label:'Matriz',data:[
          D.rec.mat.filter(inPeriod).filter(i=>stTit(i)==='PAGO').reduce((a,b)=>a+vDoc(b),0),
          D.rec.mat.filter(inPeriod).filter(i=>stTit(i)!=='PAGO').reduce((a,b)=>a+vDoc(b),0),
          D.pag.mat.filter(inPeriod).filter(i=>stTit(i)==='PAGO').reduce((a,b)=>a+vDoc(b),0),
          D.pag.mat.filter(inPeriod).filter(i=>stTit(i)!=='PAGO').reduce((a,b)=>a+vDoc(b),0)
        ],backgroundColor:'rgba(77,166,232,.8)',borderRadius:4,barPercentage:.45},
        {label:'Filial',data:[
          D.rec.fil.filter(inPeriod).filter(i=>stTit(i)==='PAGO').reduce((a,b)=>a+vDoc(b),0),
          D.rec.fil.filter(inPeriod).filter(i=>stTit(i)!=='PAGO').reduce((a,b)=>a+vDoc(b),0),
          D.pag.fil.filter(inPeriod).filter(i=>stTit(i)==='PAGO').reduce((a,b)=>a+vDoc(b),0),
          D.pag.fil.filter(inPeriod).filter(i=>stTit(i)!=='PAGO').reduce((a,b)=>a+vDoc(b),0)
        ],backgroundColor:'rgba(250,199,117,.8)',borderRadius:4,barPercentage:.45}
      ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'rgba(255,255,255,.45)',font:{size:9},boxWidth:9}}},scales:{x:{ticks:{color:'rgba(255,255,255,.35)',font:{size:8}},grid:{display:false}},y:{ticks:{...CO.tks,callback:v=>fmtS(v)},grid:{color:CO.grid}}}}
    });
  }

  dc('dash-pie');
  const cP=g('c-dash-pie');
  if(cP){
    const catMap={};
    allPag.forEach(i=>{const c=catNome(i);catMap[c]=(catMap[c]||0)+vDoc(i);});
    const top=Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,6);
    const pal=['rgba(241,113,113,.85)','rgba(77,166,232,.85)','rgba(250,199,117,.85)','rgba(78,203,141,.8)','rgba(175,169,236,.8)','rgba(91,196,240,.75)'];
    CR['dash-pie']=new Chart(cP,{type:'doughnut',data:{labels:top.map(x=>x[0].slice(0,20)),datasets:[{data:top.map(x=>x[1]),backgroundColor:pal,borderColor:'#0d2d47',borderWidth:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'rgba(255,255,255,.4)',font:{size:9},boxWidth:8}}}}});
  }

  const last=[
    ...D.rec.mat.filter(inPeriod).map(i=>({...i,_u:'Matriz',_t:'rec'})),
    ...D.rec.fil.filter(inPeriod).map(i=>({...i,_u:'Filial',_t:'rec'})),
    ...D.pag.mat.filter(inPeriod).map(i=>({...i,_u:'Matriz',_t:'pag'})),
    ...D.pag.fil.filter(inPeriod).map(i=>({...i,_u:'Filial',_t:'pag'}))
  ].sort((a,b)=>(b.data_vencimento||'').localeCompare(a.data_vencimento||'')).slice(0,12);

  g('dash-last').innerHTML = last.length
    ? `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Vencimento</th><th>Tipo</th><th>Unidade</th><th>Nome</th><th>Status</th><th class="right">Valor</th></tr></thead><tbody>${
        last.map(i=>`<tr>
          <td>${dtVen(i)}</td>
          <td>${i._t==='rec'?'<span class="badge b-aberto">Receber</span>':'<span class="badge b-vencido">Pagar</span>'}</td>
          <td>${bUni(i._u)}</td>
          <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${i._t==='rec'?nomeCli(i):nomeForn(i)}</td>
          <td>${bSt(stTit(i))}</td>
          <td class="right ${i._t==='pag'?'v-neg':'v-pos'}">${i._t==='pag'?'− ':'+ '}${fmt(vDoc(i))}</td>
        </tr>`).join('')
      }</tbody></table></div>`
    : '<div class="empty"><i class="ti ti-inbox"></i>Sem dados. Clique em Sincronizar.</div>';
}

// ═══════════════════════════════════════════════
// CONTAS A RECEBER
// ═══════════════════════════════════════════════
function renderRec(){
  const srch=(g('r-srch')?.value||'').toLowerCase();
  const uni=g('r-uni')?.value||'';
  const stF=g('r-st')?.value||'';

  const {mat:rMat,fil:rFil}=filtered('rec');
  let list=[...rMat.filter(inPeriod).map(i=>({...i,_u:'Matriz'})),...rFil.filter(inPeriod).map(i=>({...i,_u:'Filial'}))];
  if(uni) list=list.filter(i=>i._u===uni);
  if(stF) list=list.filter(i=>stTit(i)===stF);
  if(srch) list=list.filter(i=>(nomeCli(i)+dtVen(i)).toLowerCase().includes(srch));
  list.sort((a,b)=>(b.data_vencimento||'').localeCompare(a.data_vencimento||''));

  const sum=(st)=>list.filter(i=>stTit(i)===st).reduce((a,b)=>a+vDoc(b),0);
  const cnt=(st)=>list.filter(i=>stTit(i)===st).length;
  set('r-pago',fmt(sum('PAGO'))); set('r-pago-s',cnt('PAGO')+' títulos recebidos');
  set('r-aberto',fmt(sum('ABERTO'))); set('r-aberto-s',cnt('ABERTO')+' títulos em aberto');
  set('r-vencido',fmt(sum('VENCIDO'))); set('r-vencido-s',cnt('VENCIDO')+' títulos vencidos');

  for(const [u,id] of [['mat','mat'],['fil','fil']]){
    const sub=filtered('rec')[u].filter(inPeriod);
    set(`r-${id}-pago`,   fmt(sub.filter(i=>stTit(i)==='PAGO').reduce((a,b)=>a+vDoc(b),0)));
    set(`r-${id}-aberto`, fmt(sub.filter(i=>stTit(i)==='ABERTO').reduce((a,b)=>a+vDoc(b),0)));
    set(`r-${id}-vencido`,fmt(sub.filter(i=>stTit(i)==='VENCIDO').reduce((a,b)=>a+vDoc(b),0)));
    set(`r-${id}-total`,  fmt(sub.reduce((a,b)=>a+vDoc(b),0)));
  }

  const p=pages.rec, tot=list.length;
  set('r-cnt', tot+' títulos');
  g('r-tbody').innerHTML = list.slice((p-1)*PER,p*PER).map(i=>`<tr>
    <td>${dtVen(i)}</td><td>${bUni(i._u)}</td>
    <td style="max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${nomeCli(i)}</td>
    <td style="color:rgba(255,255,255,.38);font-size:10px">${catNome(i)}</td>
    <td style="color:rgba(255,255,255,.35)">${i.numero_documento_fiscal||'—'}</td>
    <td>${bSt(stTit(i))}</td>
    <td class="right v-pos">+${fmt(vDoc(i))}</td>
  </tr>`).join('') || nodata(7);
  pagCtrl('r',tot,p,'rec');
  set('r-pinfo',pgInfo(p,tot));
}

// ═══════════════════════════════════════════════
// CONTAS A PAGAR
// ═══════════════════════════════════════════════
function renderPag(){
  const srch=(g('p-srch')?.value||'').toLowerCase();
  const uni=g('p-uni')?.value||'';
  const stF=g('p-st')?.value||'';

  const {mat:pMat,fil:pFil}=filtered('pag');
  let list=[...pMat.filter(inPeriod).map(i=>({...i,_u:'Matriz'})),...pFil.filter(inPeriod).map(i=>({...i,_u:'Filial'}))];
  if(uni) list=list.filter(i=>i._u===uni);
  if(stF) list=list.filter(i=>stTit(i)===stF);
  if(srch) list=list.filter(i=>nomeForn(i).toLowerCase().includes(srch));
  list.sort((a,b)=>vDoc(b)-vDoc(a));

  const sum=(st)=>list.filter(i=>stTit(i)===st).reduce((a,b)=>a+vDoc(b),0);
  const cnt=(st)=>list.filter(i=>stTit(i)===st).length;
  set('p-pago',fmt(sum('PAGO'))); set('p-pago-s',cnt('PAGO')+' títulos quitados');
  set('p-aberto',fmt(sum('ABERTO'))); set('p-aberto-s',cnt('ABERTO')+' títulos em aberto');
  set('p-vencido',fmt(sum('VENCIDO'))); set('p-vencido-s',cnt('VENCIDO')+' títulos vencidos');

  for(const [u,id] of [['mat','mat'],['fil','fil']]){
    const sub=filtered('pag')[u].filter(inPeriod);
    set(`p-${id}-pago`,   fmt(sub.filter(i=>stTit(i)==='PAGO').reduce((a,b)=>a+vDoc(b),0)));
    set(`p-${id}-aberto`, fmt(sub.filter(i=>stTit(i)==='ABERTO').reduce((a,b)=>a+vDoc(b),0)));
    set(`p-${id}-vencido`,fmt(sub.filter(i=>stTit(i)==='VENCIDO').reduce((a,b)=>a+vDoc(b),0)));
    set(`p-${id}-total`,  fmt(sub.reduce((a,b)=>a+vDoc(b),0)));
  }

  dc('pag-pizza');
  const {mat:pMat2,fil:pFil2}=filtered('pag'); const allPag=[...pMat2,...pFil2].filter(inPeriod);
  const catTotal=(kw)=>allPag.filter(i=>(catNome(i)||'').toLowerCase().includes(kw)).reduce((a,b)=>a+vDoc(b),0);
  const frete=catTotal('frete'), gelo=catTotal('gelo'), merc=catTotal('mercadori')||catTotal('revenda');
  const outrosPag=allPag.filter(i=>!['frete','gelo','mercadori','revenda'].some(kw=>(catNome(i)||'').toLowerCase().includes(kw))).reduce((a,b)=>a+vDoc(b),0);
  const cPz=g('c-pag-pizza');
  if(cPz){ CR['pag-pizza']=new Chart(cPz,{type:'doughnut',data:{labels:['Frete','Gelo Seco','Mercadoria p/ Revenda','Outros'],datasets:[{data:[frete,gelo,merc,outrosPag],backgroundColor:['rgba(77,166,232,.85)','rgba(78,203,141,.85)','rgba(250,199,117,.85)','rgba(241,113,113,.75)'],borderColor:'#0d2d47',borderWidth:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'rgba(255,255,255,.42)',font:{size:9},boxWidth:9}}}}}); }

  dc('pag-bar');
  const catMap={};
  allPag.forEach(i=>{const c=catNome(i);catMap[c]=(catMap[c]||0)+vDoc(i);});
  const topC=Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const cPB=g('c-pag-bar');
  if(cPB&&topC.length){
    const pal=['rgba(77,166,232,.85)','rgba(78,203,141,.8)','rgba(250,199,117,.8)','rgba(241,113,113,.75)','rgba(175,169,236,.75)','rgba(91,196,240,.7)','rgba(250,199,117,.6)','rgba(77,166,232,.5)'];
    CR['pag-bar']=new Chart(cPB,{type:'bar',data:{labels:topC.map(x=>x[0].length>18?x[0].slice(0,16)+'…':x[0]),datasets:[{data:topC.map(x=>x[1]),backgroundColor:pal,borderRadius:4,barPercentage:.7}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>fmt(c.parsed.x)}}},scales:{x:{ticks:{...CO.tks,callback:v=>fmtS(v)},grid:{color:CO.grid}},y:{ticks:{color:'rgba(255,255,255,.4)',font:{size:9}},grid:{display:false}}}}});
  }

  const p=pages.pag, tot=list.length;
  set('p-cnt',tot+' títulos');
  g('p-tbody').innerHTML=list.slice((p-1)*PER,p*PER).map(i=>`<tr>
    <td>${dtVen(i)}</td><td>${bUni(i._u)}</td>
    <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${nomeForn(i)}</td>
    <td style="color:rgba(255,255,255,.38);font-size:10px">${catNome(i)}</td>
    <td>${bSt(stTit(i))}</td>
    <td class="right v-neg">−${fmt(vDoc(i))}</td>
  </tr>`).join('')||nodata(6);
  pagCtrl('p',tot,p,'pag');
  set('p-pinfo',pgInfo(p,tot));
}

// ═══════════════════════════════════════════════
// FATURAMENTO / PEDIDOS
// ═══════════════════════════════════════════════
function renderFat(){
  const srch=(g('fat-srch')?.value||'').toLowerCase();
  const uni=g('fat-uni')?.value||'';
  const tipoF=g('fat-tipo')?.value||'';

  const {mat:nfFM,fil:nfFF}=filtered('nfe'); const nfeMat=nfFM.filter(n=>!isDev(n)).filter(inPeriod), nfeFil=nfFF.filter(n=>!isDev(n)).filter(inPeriod);
  const {mat:devMatR,fil:devFilR}=filtered('dev'); const devMat=devMatR.filter(inPeriod), devFil=devFilR.filter(inPeriod);
  const {mat:pedMatR,fil:pedFilR}=filtered('ped'); const pedMat=pedMatR.filter(inPeriod), pedFil=pedFilR.filter(inPeriod);

  const matV=nfeMat.reduce((a,b)=>a+nfVal(b),0);
  const filV=nfeFil.reduce((a,b)=>a+nfVal(b),0);
  const tot=matV+filV;
  const devMatV=devMat.reduce((a,b)=>a+nfVal(b),0);
  const devFilV=devFil.reduce((a,b)=>a+nfVal(b),0);
  const devTot=devMatV+devFilV;
  const pedTot=[...pedMat,...pedFil].reduce((a,b)=>a+pedVal(b),0);

  set('fat-total',fmt(tot)); set('fat-total-s',(nfeMat.length+nfeFil.length)+' NF-e emitidas');
  set('fat-ped',fmt(pedTot)); set('fat-ped-s',(pedMat.length+pedFil.length)+' pedidos');
  set('fat-dev',fmt(devTot)); set('fat-dev-s',(devMat.length+devFil.length)+' NF-e devolução');
  set('fat-liq',fmt(tot-devTot));

  for(const [u,id] of [['mat','mat'],['fil','fil']]){
    const nfe=u==='mat'?nfeMat:nfeFil, dev=u==='mat'?devMat:devFil;
    const v=nfe.reduce((a,b)=>a+nfVal(b),0), dv=dev.reduce((a,b)=>a+nfVal(b),0);
    const pct=tot>0?(v/tot*100).toFixed(1)+'%':'—';
    set(`fat-${id}-val`,fmt(v)); set(`fat-${id}-dev`,fmt(dv));
    set(`fat-${id}-liq`,fmt(v-dv)); set(`fat-${id}-pct`,pct);
  }

  dc('fat-pie');
  const cFP=g('c-fat-pie');
  if(cFP){ CR['fat-pie']=new Chart(cFP,{type:'doughnut',data:{labels:['Matriz','Filial'],datasets:[{data:[matV,filV],backgroundColor:['rgba(77,166,232,.85)','rgba(250,199,117,.85)'],borderColor:'#0d2d47',borderWidth:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'rgba(255,255,255,.42)',font:{size:10},boxWidth:9}}}}}); }

  const cliMap={};
  [...nfeMat,...nfeFil].forEach(n=>{const c=nfCli(n);cliMap[c]=(cliMap[c]||0)+nfVal(n);});
  [...pedMat,...pedFil].forEach(p=>{const c=pedCli(p);cliMap[c]=(cliMap[c]||0)+pedVal(p);});
  const topCli=Object.entries(cliMap).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const maxC=topCli[0]?topCli[0][1]:1;
  const pal10=['#4da6e8','#FAC775','#4ecb8d','#AFA9EC','#f17171','#5bc4f0','#d4b896','#4da6e8','#FAC775','#4ecb8d'];
  g('fat-topwrap').innerHTML=topCli.length?topCli.map((x,i)=>`<div class="prog-row">
    <span class="prog-rank">${i+1}</span>
    <div class="prog-label" title="${x[0]}">${x[0]}</div>
    <div class="prog-track"><div class="prog-bar" style="width:${(x[1]/maxC*100).toFixed(0)}%;background:${pal10[i%10]}"></div></div>
    <div class="prog-val">${fmtS(x[1])}</div>
  </div>`).join(''):'<div class="empty"><i class="ti ti-users"></i>Sem dados</div>';

  let lista=[
    ...nfeMat.map(n=>({_u:'Matriz',_t:'NF',_dt:nfDt(n),_cli:nfCli(n),_num:nfNum(n),_v:nfVal(n)})),
    ...nfeFil.map(n=>({_u:'Filial',_t:'NF',_dt:nfDt(n),_cli:nfCli(n),_num:nfNum(n),_v:nfVal(n)})),
    ...pedMat.map(p=>({_u:'Matriz',_t:'PED',_dt:pedDt(p),_cli:pedCli(p),_num:pedNum(p),_v:pedVal(p)})),
    ...pedFil.map(p=>({_u:'Filial',_t:'PED',_dt:pedDt(p),_cli:pedCli(p),_num:pedNum(p),_v:pedVal(p)})),
    ...devMat.map(n=>({_u:'Matriz',_t:'DEV',_dt:nfDt(n),_cli:nfCli(n),_num:nfNum(n),_v:nfVal(n)})),
    ...devFil.map(n=>({_u:'Filial',_t:'DEV',_dt:nfDt(n),_cli:nfCli(n),_num:nfNum(n),_v:nfVal(n)}))
  ];
  if(uni) lista=lista.filter(l=>l._u===uni);
  if(tipoF) lista=lista.filter(l=>l._t===tipoF);
  if(srch) lista=lista.filter(l=>(l._cli+l._num).toLowerCase().includes(srch));
  lista.sort((a,b)=>(b._dt||'').localeCompare(a._dt||''));

  const p=pages.fat, totL=lista.length;
  set('fat-cnt',totL+' registros');
  const typeBadge={'NF':'<span class="badge b-aberto">NF-e</span>','PED':'<span class="badge" style="background:rgba(175,169,236,.13);color:#AFA9EC">Pedido</span>','DEV':'<span class="badge b-vencido">Devolução</span>'};
  g('fat-tbody').innerHTML=lista.slice((p-1)*PER,p*PER).map(l=>`<tr>
    <td>${l._dt}</td><td>${bUni(l._u)}</td>
    <td style="max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l._cli}</td>
    <td>${l._num}</td><td>${typeBadge[l._t]||l._t}</td>
    <td class="right ${l._t==='DEV'?'v-neg':'v-pos'}">${l._t==='DEV'?'−':'+'}${fmt(l._v)}</td>
  </tr>`).join('')||nodata(6);
  pagCtrl('fat',totL,p,'fat');
  set('fat-pinfo',pgInfo(p,totL));
}

// ═══════════════════════════════════════════════
// FLUXO DE CAIXA
// ═══════════════════════════════════════════════
function renderFluxo(){
  const {mat:fxRecMat,fil:fxRecFil}=filtered('rec'); const allRec=[...fxRecMat,...fxRecFil].filter(inPeriod);
  const {mat:fxPagMat,fil:fxPagFil}=filtered('pag'); const allPag=[...fxPagMat,...fxPagFil].filter(inPeriod);
  const inV =allRec.filter(i=>stTit(i)==='PAGO').reduce((a,b)=>a+vDoc(b),0);
  const outV=allPag.filter(i=>stTit(i)==='PAGO').reduce((a,b)=>a+vDoc(b),0);
  const saldo=inV-outV;
  const margem=inV>0?(saldo/inV*100).toFixed(1)+'%':'—';

  set('fx-in',fmt(inV)); set('fx-out',fmt(outV));
  const fxEl=g('fx-saldo'); fxEl.textContent=fmt(saldo); fxEl.className='kpi-val '+(saldo>=0?'bl':'re');
  set('fx-margem',margem);

  const catMap={};
  allPag.forEach(i=>{ const c=catNome(i); catMap[c]=(catMap[c]||0)+vDoc(i); });
  const top10=Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const maxV=top10[0]?top10[0][1]:1;
  const clrs=['#f17171','rgba(241,113,113,.82)','rgba(241,113,113,.7)','rgba(241,113,113,.6)','rgba(250,199,117,.72)','rgba(250,199,117,.6)','rgba(250,199,117,.5)','rgba(77,166,232,.55)','rgba(77,166,232,.44)','rgba(77,166,232,.34)'];
  g('fx-top10').innerHTML=top10.length?top10.map((x,i)=>`<div class="prog-row">
    <span class="prog-rank">${i+1}</span>
    <div class="prog-label" title="${x[0]}">${x[0]}</div>
    <div class="prog-track"><div class="prog-bar" style="width:${(x[1]/maxV*100).toFixed(0)}%;background:${clrs[i]}"></div></div>
    <div class="prog-val">${fmtS(x[1])}</div>
  </div>`).join(''):'<div class="empty"><i class="ti ti-inbox"></i>Sem dados de custo</div>';

  const bIn={}, bOut={};
  const isFlx = i => i._tab === 'flx';
  allRec.filter(isFlx).forEach(i=>{ const b=i.nome_conta_corrente||i.descricao_conta; if(b){ bIn[b]=(bIn[b]||0)+vDoc(i); } });
  allPag.filter(isFlx).forEach(i=>{ const b=i.nome_conta_corrente||i.descricao_conta; if(b){ bOut[b]=(bOut[b]||0)+vDoc(i); } });
  const bancos=[...new Set([...Object.keys(bIn),...Object.keys(bOut)])];
  const bCorEl=g('fx-bancos');
  if(bancos.length){
    bCorEl.innerHTML='<div class="banco-grid">'+bancos.map(b=>{
      const inp=bIn[b]||0, out=bOut[b]||0, net=inp-out;
      return `<div class="bcard">
        <div class="bcard-name" title="${b}">${b}</div>
        <div class="bcard-val ${net>=0?'pos':'neg'}">${fmtS(Math.abs(net))}</div>
        <div class="bcard-sub">Ent: ${fmtS(inp)} · Saí: ${fmtS(out)}</div>
      </div>`;
    }).join('')+'</div>';
  } else {
    bCorEl.innerHTML='<div class="empty" style="padding:16px"><i class="ti ti-building-bank"></i>Sem dados bancários</div>';
  }

  dc('fx-bar');
  const cFxB=g('c-fx-bar');
  if(cFxB){ CR['fx-bar']=new Chart(cFxB,{type:'bar',data:{labels:['Entradas (recebido)','Saídas (pago)'],datasets:[
    {label:'Matriz',data:[fxRecMat.filter(i=>stTit(i)==='PAGO').reduce((a,b)=>a+vDoc(b),0),fxPagMat.filter(i=>stTit(i)==='PAGO').reduce((a,b)=>a+vDoc(b),0)],backgroundColor:'rgba(77,166,232,.8)',borderRadius:4,barPercentage:.45},
    {label:'Filial', data:[fxRecFil.filter(i=>stTit(i)==='PAGO').reduce((a,b)=>a+vDoc(b),0),fxPagFil.filter(i=>stTit(i)==='PAGO').reduce((a,b)=>a+vDoc(b),0)],backgroundColor:'rgba(250,199,117,.8)',borderRadius:4,barPercentage:.45}
  ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'rgba(255,255,255,.42)',font:{size:9},boxWidth:9}}},scales:{x:{ticks:{color:'rgba(255,255,255,.35)',font:{size:8}},grid:{display:false}},y:{ticks:{...CO.tks,callback:v=>fmtS(v)},grid:{color:CO.grid}}}}}); }

  dc('fx-pie');
  const cFxP=g('c-fx-pie');
  if(cFxP&&top10.length){
    const p7=top10.slice(0,7);
    const pal=['rgba(241,113,113,.85)','rgba(77,166,232,.85)','rgba(250,199,117,.85)','rgba(78,203,141,.8)','rgba(175,169,236,.8)','rgba(91,196,240,.75)','rgba(212,184,150,.75)'];
    CR['fx-pie']=new Chart(cFxP,{type:'doughnut',data:{labels:p7.map(x=>x[0].length>16?x[0].slice(0,14)+'…':x[0]),datasets:[{data:p7.map(x=>x[1]),backgroundColor:pal,borderColor:'#0d2d47',borderWidth:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'rgba(255,255,255,.38)',font:{size:9},boxWidth:8}}}}});
  }
}

// ═══════════════════════════════════════════════
// PAGINAÇÃO
// ═══════════════════════════════════════════════
function pagCtrl(pfx,tot,cur,key){
  const np=Math.ceil(tot/PER)||1;
  const el=g(pfx+'-pbtns'); if(!el||np<=1){if(el)el.innerHTML='';return;}
  let h=`<button class="pag-btn" ${cur===1?'disabled':''} onclick="goPag('${key}',${cur-1})">‹</button>`;
  for(let i=Math.max(1,cur-2);i<=Math.min(np,cur+2);i++) h+=`<button class="pag-btn${i===cur?' on':''}" onclick="goPag('${key}',${i})">${i}</button>`;
  h+=`<button class="pag-btn" ${cur===np?'disabled':''} onclick="goPag('${key}',${cur+1})">›</button>`;
  el.innerHTML=h;
}
function goPag(key,p){ pages[key]=p; const r={rec:renderRec,pag:renderPag,fat:renderFat}; if(r[key]) r[key](); }
const pgInfo=(p,tot)=>tot?`${Math.min((p-1)*PER+1,tot)}–${Math.min(p*PER,tot)} de ${tot}`:'0';
const nodata=(cols)=>`<tr><td colspan="${cols}"><div class="empty"><i class="ti ti-inbox"></i>Nenhum registro encontrado.</div></td></tr>`;

// ═══════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════
function go(id, el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  g('page-'+id).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  if(el) el.classList.add('active');
  const T={dashboard:['Dashboard','Visão geral financeira · Omie ERP'],importar:['Importar Planilha','Carregue manualmente cada relatório do Omie'],receber:['Contas a Receber','Títulos a receber · status do Omie'],pagar:['Contas a Pagar','Títulos a pagar · status do Omie'],faturamento:['Faturamento / Pedidos','NF-e emitidas, pedidos e devoluções'],fluxo:['Fluxo de Caixa','Entradas e saídas confirmadas']};
  const t=T[id]||[id,id]; set('ptitle',t[0]); set('psub',t[1]);
  const R={dashboard:renderDash,receber:renderRec,pagar:renderPag,faturamento:renderFat,fluxo:renderFluxo,importar:updateImpSummary};
  if(R[id]) R[id]();
}

function toast(msg,err=false){
  const t=g('toast'); t.textContent=msg; t.className='toast on'+(err?' err':'');
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('on'),3500);
}
function showLoading(){
  document.querySelectorAll('[id$="-last"],[id$="-tbody"],[id$="-topwrap"],[id$="-top10"],[id$="-bancos"]').forEach(el=>{if(el)el.innerHTML='<div class="loading-wrap"><div class="spinner"></div>Carregando…</div>';});
}

function exportCSV(){
  const all=[
    ...D.rec.mat.map(i=>({...i,_u:'Matriz',_t:'Receber'})),...D.rec.fil.map(i=>({...i,_u:'Filial',_t:'Receber'})),
    ...D.pag.mat.map(i=>({...i,_u:'Matriz',_t:'Pagar'})),...D.pag.fil.map(i=>({...i,_u:'Filial',_t:'Pagar'}))
  ];
  if(!all.length){toast('Sem dados para exportar.',true);return;}
  const h='Tipo,Unidade,Vencimento,Nome,Categoria,Status,Valor';
  const rows=all.map(i=>[i._t,i._u,dtVen(i),'"'+(i._t==='Receber'?nomeCli(i):nomeForn(i)).replace(/"/g,'""')+'"','"'+catNome(i)+'"',stTit(i),(vDoc(i)).toFixed(2)].join(','));
  const blob=new Blob(['﻿'+h+'\n'+rows.join('\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='gss_financeiro.csv'; a.click(); URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════
// IMPORTAÇÃO DE PLANILHA
// ═══════════════════════════════════════════════
const IMP = {};

const IMP_FIELDS = {
  rec: ['rc-data','rc-cli','rc-val','rc-st','rc-cat','rc-nf','rc-conta','rc-obs','rc-uni-col'],
  pag: ['pg-data','pg-forn','pg-val','pg-st','pg-cat','pg-nf','pg-conta','pg-obs','pg-uni-col'],
  fat: ['ft-data','ft-cli','ft-val','ft-num','ft-tipo','ft-st','ft-dev','ft-obs','ft-uni-col'],
  flx: ['fx-data','fx-desc','fx-val','fx-tipo','fx-cat','fx-conta','fx-st','fx-obs','fx-uni-col']
};

const IMP_KEYWORDS = {
  rec: { 'rc-data':['data','venc','date','previsao','recebimento','prev','competencia'],'rc-cli':['cliente','client','razao','nome','fornec'],'rc-val':['valor','value','vlr','amount','r$','total'],'rc-st':['status','situacao','situação','st'],'rc-cat':['categoria','cat','class'],'rc-nf':['nf','nota','doc','numero','num'],'rc-conta':['conta','bank','banco','cc'],'rc-obs':['obs','observ'] },
  pag: { 'pg-data':['data','venc','date','previsao','pagamento','prev','competencia'],'pg-forn':['fornec','supplier','nome','razao','cliente'],'pg-val':['valor','value','vlr','amount','r$','total'],'pg-st':['status','situacao','situação'],'pg-cat':['categoria','cat','class'],'pg-nf':['nf','nota','doc','numero','num'],'pg-conta':['conta','bank','banco','cc'],'pg-obs':['obs','observ'] },
  fat: { 'ft-data':['data','emiss','date','faturado','emissao','emitido','competencia'],'ft-cli':['cliente','client','nome','razao','dest'],'ft-val':['valor','total','value','vlr','amount','r$'],'ft-num':['nf','nota','pedido','numero','num','doc'],'ft-tipo':['tipo','type','operacao','oper','natureza','devol'],'ft-st':['status','situac'],'ft-dev':['devol_val','retorno_val'],'ft-obs':['obs','observ'] },
  flx: { 'fx-data':['data','date','lancam','credito','debito','cred','deb','moviment','competencia'],'fx-desc':['desc','historico','nome','fornec','cliente','favorec'],'fx-val':['valor','value','vlr','amount','r$','total'],'fx-tipo':['tipo','type','entrada','saida','natureza'],'fx-cat':['categoria','cat','class'],'fx-conta':['conta','bank','banco','cc'],'fx-st':['status','situacao'],'fx-obs':['obs','observ'] }
};

function showImpTab(tab){
  document.querySelectorAll('.imp-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.imp-panel').forEach(p=>p.classList.remove('active'));
  g('itab-'+tab).classList.add('active');
  g('ipanel-'+tab).classList.add('active');
}

function loadFile(tab, inp){
  const file = inp.files[0]; if(!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();
  if(ext === 'csv'){
    reader.onload = e => parseCSV(tab, e.target.result);
    reader.readAsText(file, 'UTF-8');
  } else {
    reader.onload = e => parseXLSX(tab, e.target.result);
    reader.readAsArrayBuffer(file);
  }
  inp.value = '';
}

function parseCSV(tab, text){
  const lines = text.split(/\r?\n/).filter(l=>l.trim());
  if(lines.length < 2){ showImpStatus(tab,'Arquivo vazio ou sem dados.','err'); return; }
  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map(h=>h.trim().replace(/^"|"$/g,''));
  const rows = lines.slice(1).map(l=>l.split(sep).map(c=>c.trim().replace(/^"|"$/g,'')));
  setupImp(tab, headers, rows);
}

function sheetToKey(name){
  const n = (name||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
  if(n.includes('filial')) return 'fil';
  if(n.includes('matriz') || n.includes('matrix')) return 'mat';
  return null;
}

function extractSheetRows(ws){
  const data = XLSX.utils.sheet_to_json(ws, {header:1, defval:'', raw:true, cellDates:true});
  if(!data || data.length < 2) return null;
  let hRow = 0;
  for(let i = 0; i < Math.min(8, data.length); i++){
    if(data[i].filter(c => c !== null && c !== undefined && String(c).trim() !== '').length >= 3){
      hRow = i; break;
    }
  }
  const headers = data[hRow].map(h => String(h||'').trim());
  const rows = data.slice(hRow + 1)
    .filter(r => r.some(c => c !== null && c !== undefined && String(c).trim() !== ''))
    .map(r => r.map((c, i) => {
      if(c === null || c === undefined) return '';
      if(typeof c === 'number') return c;
      if(c instanceof Date) return c;
      return String(c).trim();
    }));
  return { headers, rows };
}

function parseXLSX(tab, buf){
  try{
    const wb = XLSX.read(buf, {type:'array', cellDates:true});
    const sheetKeys = wb.SheetNames.map(n => ({ name:n, key:sheetToKey(n) }));
    const identified = sheetKeys.filter(s => s.key !== null);

    if(identified.length >= 2 ||
      (identified.length === 1 && wb.SheetNames.length >= 2)){
      let combinedHeaders = null;
      let combinedRows = [];
      let uniColIndex = -1;
      let sheetsSummary = [];

      for(const sheet of sheetKeys){
        const ws = wb.Sheets[sheet.name];
        const extracted = extractSheetRows(ws);
        if(!extracted || extracted.rows.length === 0) continue;

        const key = sheet.key || 'mat';

        if(!combinedHeaders){
          combinedHeaders = [...extracted.headers, '__unidade__'];
          uniColIndex = combinedHeaders.length - 1;
        }

        for(const row of extracted.rows){
          const normalizedRow = combinedHeaders.slice(0,-1).map((_,i) => row[i] !== undefined ? row[i] : '');
          normalizedRow.push(key === 'fil' ? 'Filial' : 'Matriz');
          combinedRows.push(normalizedRow);
        }
        sheetsSummary.push(`${sheet.name}: ${extracted.rows.length} linhas`);
      }

      if(!combinedHeaders || combinedRows.length === 0){
        showImpStatus(tab,'Nenhum dado encontrado nas abas.','err'); return;
      }

      IMP[tab] = { headers: combinedHeaders, rows: combinedRows, uniColIdx: uniColIndex };
      setupImpMultiSheet(tab, combinedHeaders, combinedRows, uniColIndex);
      showImpStatus(tab,
        '✓ Lidas ' + wb.SheetNames.length + ' abas: ' + sheetsSummary.join(' | ') +
        ' — Total: ' + combinedRows.length + ' linhas', 'info');
      return;
    }

    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const extracted = extractSheetRows(ws);
    if(!extracted || extracted.rows.length === 0){
      showImpStatus(tab,'Planilha sem dados.','err'); return;
    }
    setupImp(tab, extracted.headers, extracted.rows);

  }catch(e){
    showImpStatus(tab,'Erro ao ler planilha: '+e.message,'err');
    console.error(e);
  }
}

function setupImpMultiSheet(tab, headers, rows, uniColIndex){
  IMP[tab] = { headers, rows };
  const opts = '<option value="">— ignorar —</option>' +
    headers.map((h,i) => `<option value="${i}">${h === '__unidade__' ? '★ Unidade (auto)' : h}</option>`).join('');

  const allFields = {
    rec:['rc-data','rc-cli','rc-val','rc-st','rc-cat','rc-nf','rc-conta','rc-obs','rc-uni-col'],
    pag:['pg-data','pg-forn','pg-val','pg-st','pg-cat','pg-nf','pg-conta','pg-obs','pg-uni-col'],
    fat:['ft-data','ft-cli','ft-val','ft-num','ft-tipo','ft-st','ft-dev','ft-obs','ft-uni-col'],
    flx:['fx-data','fx-desc','fx-val','fx-tipo','fx-cat','fx-conta','fx-st','fx-obs','fx-uni-col']
  };
  allFields[tab].forEach(fid=>{ const s=g(fid); if(s){ s.innerHTML=opts; } });

  const normH = h => h.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  const kw = IMP_KEYWORDS[tab] || {};
  Object.entries(kw).forEach(([fid,keys])=>{
    const s = g(fid); if(!s) return;
    const idx = headers.findIndex(h => h !== '__unidade__' && keys.some(k=>normH(h).includes(k)));
    if(idx >= 0) s.value = idx;
  });

  const pfx2 = {rec:'rc',pag:'pg',fat:'ft',flx:'fx'}[tab];
  const uniSel = g(pfx2+'-uni');
  const uniColSel = g(pfx2+'-uni-col');
  if(uniSel && uniColSel){
    uniColSel.innerHTML = opts;
    uniSel.value = 'col';
    uniColSel.value = uniColIndex;
    uniColSel.style.display = '';
    uniSel.onchange = () => { uniColSel.style.display = uniSel.value==='col'?'':'none'; };
  }

  buildPreview(tab, headers, rows.slice(0, 8));
  g('map-'+tab).classList.add('show');
}

function setupImp(tab, headers, rows){
  IMP[tab] = { headers, rows };
  const opts = '<option value="">— ignorar —</option>' + headers.map((h,i)=>`<option value="${i}">${h}</option>`).join('');
  IMP_FIELDS[tab].forEach(fid=>{ const s=g(fid); if(s){ s.innerHTML=opts; } });
  const normH = h => h.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  const kw = IMP_KEYWORDS[tab]||{};
  Object.entries(kw).forEach(([fid,keys])=>{
    const s=g(fid); if(!s) return;
    const idx=headers.findIndex(h=>keys.some(k=>normH(h).includes(k)));
    if(idx>=0) s.value=idx;
  });
  const pfx2 = {rec:'rc',pag:'pg',fat:'ft',flx:'fx'}[tab];
  const uniSel = g(pfx2+'-uni');
  const uniColSel = g(pfx2+'-uni-col');
  if(uniSel && uniColSel){
    uniColSel.innerHTML = opts;
    uniSel.onchange = () => { uniColSel.style.display = uniSel.value==='col'?'':'none'; };
    const uniKwds = ['unidade','empresa','unit'];
    const uniIdx = headers.findIndex(h=>uniKwds.some(k=>normH(h).includes(k)));
    if(uniIdx >= 0){
      uniSel.value = 'col';
      uniColSel.value = uniIdx;
      uniColSel.style.display = '';
    }
  }
  buildPreview(tab, headers, rows.slice(0,8));
  g('map-'+tab).classList.add('show');
  showImpStatus(tab, `✓ ${rows.length} linhas encontradas — mapeie as colunas e importe`, 'info');
}

function buildPreview(tab, headers, rows){
  const box = g('prev-'+tab); if(!box) return;
  box.innerHTML =
    '<div class="prev-row head">' + headers.map(h=>`<div class="prev-cell">${h}</div>`).join('') + '</div>' +
    rows.map(r=>'<div class="prev-row">'+r.map(c=>`<div class="prev-cell">${c}</div>`).join('')+'</div>').join('');
}

function getColVal(row, selectId){
  const s = g(selectId); if(!s||s.value==='') return '';
  const v = row[parseInt(s.value)];
  if(v === null || v === undefined) return '';
  if(typeof v === 'number') return v;
  if(v instanceof Date) {
    const d = String(v.getDate()).padStart(2,'0');
    const m = String(v.getMonth()+1).padStart(2,'0');
    const y = v.getFullYear();
    return d+'/'+m+'/'+y;
  }
  return String(v);
}

function omieStatusToKey(raw) {
  const r = (raw||'').toString().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g,'')
    .toUpperCase();
  if(r==='RECEBIDO' || r==='PAGO' || r.includes('LIQUID') || r.includes('QUIT')) return 'PAGO';
  if(r.includes('VENCER') || r==='A RECEBER' || r==='A PAGAR' || r==='ABERTO') return 'ABERTO';
  if(r==='ATRASADO' || r==='VENCIDO') return 'VENCIDO';
  return 'ABERTO';
}

function toKey(raw, fallbackKey) {
  const s = (raw||'').toString().toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g,'');
  if(s.startsWith('fil') || s === 'f') return 'fil';
  if(s.startsWith('mat') || s === 'm') return 'mat';
  return fallbackKey || 'mat';
}

function resolveUni(raw, fallback) {
  return toKey(raw) === 'fil' ? 'Filial' : 'Matriz';
}

function parseBRVal(raw) {
  if(raw === null || raw === undefined || raw === '') return NaN;
  if(typeof raw === 'number') return raw;
  let s = raw.toString().trim();
  const negative = s.startsWith('-') || s.startsWith('(');
  s = s.replace(/[R$\s()]/g, '').replace(/^-/, '');
  if(!s) return NaN;
  const hasComma = s.includes(',');
  const hasDot   = s.includes('.');
  let result;
  if(hasComma && hasDot) {
    const lastComma = s.lastIndexOf(',');
    const lastDot   = s.lastIndexOf('.');
    if(lastDot > lastComma) {
      result = parseFloat(s.replace(/,/g, ''));
    } else {
      result = parseFloat(s.replace(/\./g, '').replace(',', '.'));
    }
  } else if(hasComma) {
    const afterComma = s.split(',')[1] || '';
    if(afterComma.length <= 2) {
      result = parseFloat(s.replace(',', '.'));
    } else {
      result = parseFloat(s.replace(',', ''));
    }
  } else {
    result = parseFloat(s);
  }
  return negative ? -result : result;
}

function doImport(tab){
  const imp = IMP[tab];
  if(!imp||!imp.rows.length){ showImpStatus(tab,'Nenhuma planilha carregada.','err'); return; }

  const prefix = {rec:'rc', pag:'pg', fat:'ft', flx:'fx'}[tab];
  const uniSel  = g(prefix+'-uni');
  const uniColSel = g(prefix+'-uni-col');
  const defUni = (uniSel && uniSel.value !== 'col') ? uniSel.value : 'Matriz';
  const uniFromCol = uniSel && uniSel.value === 'col';

  let count=0, skipped=0;

  if(tab==='rec'){
    imp.rows.forEach(row=>{
      const val = parseBRVal(getColVal(row,'rc-val'));
      if(isNaN(val)||val===0){ skipped++; return; }
      const key = uniFromCol ? toKey(getColVal(row,'rc-uni-col'), defUni==='Filial'?'fil':'mat') : (defUni==='Filial'?'fil':'mat');
      const stRaw = (getColVal(row,'rc-st')||'').toString();
      const st = omieStatusToKey(stRaw);
      const entry = {
        _date: getColVal(row,'rc-data'),
        data_vencimento: getColVal(row,'rc-data'),
        nome_cliente: getColVal(row,'rc-cli'),
        valor_documento: Math.abs(val),
        status_titulo: st,
        codigo_categoria: getColVal(row,'rc-cat'),
        nome_categoria: getColVal(row,'rc-cat'),
        numero_documento_fiscal: getColVal(row,'rc-nf'),
        nome_conta_corrente: getColVal(row,'rc-conta'),
        _u: key==='fil'?'Filial':'Matriz', _imp: true, _obs: getColVal(row,'rc-obs')
      };
      D.rec[key].push(entry);
      count++;
    });
  }
  else if(tab==='pag'){
    imp.rows.forEach(row=>{
      const val = parseBRVal(getColVal(row,'pg-val'));
      if(isNaN(val)||val===0){ skipped++; return; }
      const key = uniFromCol ? toKey(getColVal(row,'pg-uni-col'), defUni==='Filial'?'fil':'mat') : (defUni==='Filial'?'fil':'mat');
      const stRaw = (getColVal(row,'pg-st')||'').toString();
      const st = omieStatusToKey(stRaw);
      const cat = getColVal(row,'pg-cat')||'Outros';
      const entry = {
        _date: getColVal(row,'pg-data'),
        data_vencimento: getColVal(row,'pg-data'),
        nome_fornecedor: getColVal(row,'pg-forn'),
        valor_documento: Math.abs(val),
        status_titulo: st,
        codigo_categoria: cat,
        nome_categoria: cat,
        numero_documento_fiscal: getColVal(row,'pg-nf'),
        nome_conta_corrente: getColVal(row,'pg-conta'),
        descricao_conta: getColVal(row,'pg-conta'),
        _u: key==='fil'?'Filial':'Matriz', _imp: true, _obs: getColVal(row,'pg-obs')
      };
      D.pag[key].push(entry);
      count++;
    });
  }
  else if(tab==='fat'){
    imp.rows.forEach(row=>{
      const val = parseBRVal(getColVal(row,'ft-val'));
      if(isNaN(val)||val===0){ skipped++; return; }
      const key = uniFromCol ? toKey(getColVal(row,'ft-uni-col'), defUni==='Filial'?'fil':'mat') : (defUni==='Filial'?'fil':'mat');
      const tipoRaw = (getColVal(row,'ft-tipo')||'').toString().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
      const stRaw   = (getColVal(row,'ft-st')||'').toString();
      const stNorm  = stRaw.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
      const isDevolucao = tipoRaw.includes('DEV') || tipoRaw.includes('RETORNO') ||
                          stNorm.includes('DEV')  || stNorm.includes('RETORNO');
      const isPedido    = tipoRaw.includes('PED') || tipoRaw.includes('PEDIDO');
      const tipo = isDevolucao ? 'DEV' : isPedido ? 'PED' : 'NF';
      const st = omieStatusToKey(stRaw);
      const ftData = getColVal(row,'ft-data');
      const entry = {
        _date: ftData, _tipo: tipo, _u: key==='fil'?'Filial':'Matriz',
        dDtEmissao: ftData,
        cabecalho:{ cNomeDest: getColVal(row,'ft-cli'), nNF: getColVal(row,'ft-num'), dDtEmissao: ftData },
        total_nf: Math.abs(val),
        status_titulo: st,
        _imp: true
      };
      if(tipo==='DEV'){ D.dev[key].push(entry); }
      else { D.nfe[key].push(entry); }
      if(tipo==='PED'){
        D.ped[key].push({
          _date: ftData,
          cabecalho:{ nValorTotal: Math.abs(val), cNomeDest: getColVal(row,'ft-cli'), nNumPedido: getColVal(row,'ft-num'), dDtPedido: ftData },
          _imp:true, status_titulo:st
        });
      }
      count++;
    });
  }
  else if(tab==='flx'){
    imp.rows.forEach(row=>{
      const val = parseBRVal(getColVal(row,'fx-val'));
      if(isNaN(val)||val===0){ skipped++; return; }
      const key = uniFromCol ? toKey(getColVal(row,'fx-uni-col'), defUni==='Filial'?'fil':'mat') : (defUni==='Filial'?'fil':'mat');
      const tipoRaw = (getColVal(row,'fx-tipo')||'').toLowerCase();
      const isEntrada = tipoRaw.includes('entr')||tipoRaw.includes('rec')||tipoRaw.includes('créd')||tipoRaw.includes('cred')||val>0;
      const cat = getColVal(row,'fx-cat')||'Outros';
      const stRaw = (getColVal(row,'fx-st')||'').toString();
      const st = omieStatusToKey(stRaw) || 'PAGO';
      const entry = {
        _date: getColVal(row,'fx-data'),
        data_vencimento: getColVal(row,'fx-data'),
        nome_cliente: isEntrada ? getColVal(row,'fx-desc') : '',
        nome_fornecedor: !isEntrada ? getColVal(row,'fx-desc') : '',
        valor_documento: Math.abs(val),
        status_titulo: st,
        codigo_categoria: cat,
        nome_categoria: cat,
        nome_conta_corrente: getColVal(row,'fx-conta'),
        descricao_conta: getColVal(row,'fx-conta'),
        _u: key==='fil'?'Filial':'Matriz', _imp: true, _tab: 'flx'
      };
      if(isEntrada) D.rec[key].push(entry);
      else D.pag[key].push(entry);
      count++;
    });
  }

  try{ localStorage.setItem('gss_cache_v2', JSON.stringify({D,dtIni,dtFim,ts:Date.now()})); }catch(e){}
  renderAll();
  updateImpSummary();
  showImpStatus(tab, `✓ ${count} lançamentos importados${skipped?' ('+skipped+' linhas ignoradas)':''}!`, 'ok');
  toast(`✓ ${count} lançamentos de ${{rec:'Contas a Receber',pag:'Contas a Pagar',fat:'Faturamento',flx:'Fluxo de Caixa'}[tab]} importados!`);
}

function resetImp(tab){
  delete IMP[tab];
  g('map-'+tab).classList.remove('show');
  const s=g('ist-'+tab); if(s){s.style.display='none';}
}

function showImpStatus(tab, msg, type){
  const el=g('ist-'+tab); if(!el) return;
  el.textContent=msg; el.className='imp-status '+type; el.style.display='flex';
}

function clearAllImported(){
  if(!confirm('Limpar TODOS os dados importados manualmente?')) return;
  Object.keys(D).forEach(k=>{ D[k]={mat:[],fil:[]}; });
  try{ localStorage.removeItem('gss_cache_v2'); }catch(e){}
  renderAll();
  updateImpSummary();
  toast('Dados limpos.');
}

function updateImpSummary(){
  const wrap=g('imp-summary-grid'), card=g('imp-summary'); if(!wrap||!card) return;
  const counts={
    'Contas a Receber': D.rec.mat.length+D.rec.fil.length,
    'Contas a Pagar':   D.pag.mat.length+D.pag.fil.length,
    'Faturamento/NF-e': D.nfe.mat.length+D.nfe.fil.length,
    'Devoluções':       D.dev.mat.length+D.dev.fil.length,
  };
  const total=Object.values(counts).reduce((a,b)=>a+b,0);
  card.style.display = total>0 ? '' : 'none';
  wrap.innerHTML=Object.entries(counts).map(([k,v])=>`
    <div class="ucard">
      <div style="font-size:10px;color:rgba(255,255,255,.35);margin-bottom:4px">${k}</div>
      <div style="font-size:18px;font-weight:700;color:#fff">${v}</div>
      <div style="font-size:9px;color:rgba(255,255,255,.22)">lançamentos</div>
    </div>`).join('');
}

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
(function(){
  const t=today(), y=t.slice(0,4), m=t.slice(5,7);
  dtIni=`${y}-${m}-01`;
  dtFim=`${y}-${m}-${String(new Date(+y,+m,0).getDate()).padStart(2,'0')}`;

  try{
    const raw=localStorage.getItem('gss_cache_v2');
    if(raw){
      const obj=JSON.parse(raw);
      if(obj&&obj.D){
        Object.keys(obj.D).forEach(k=>{ if(D[k]) D[k]=obj.D[k]; });
        setTimeout(()=>toast('Dados restaurados do cache. Use "Limpar Tudo" para resetar.'),400);
      }
    }
  }catch(e){}

  g('dt-ini').value=dtIni; g('dt-fim').value=dtFim;
  g('pinfo').textContent=iso2br(dtIni)+' → '+iso2br(dtFim);
  renderAll();
})();

renderDash();
updateImpSummary();
