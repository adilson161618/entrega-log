// EntregaLog - Pedidos disponiveis (motoboy) - v3 com notificacao
var SB_URL='https://psqtdivgmrnuxgdvymrh.supabase.co';
var SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzcXRkaXZnbXJudXhnZHZ5bXJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MDk3NDUsImV4cCI6MjA5MjI4NTc0NX0.CAoKz_Q4MVU_8NM821L1DaGz0EaUtJzCxt725Y_isaY';
var MOTOBOY_KEY='el_motoboy_dados';
var IDS_VISTOS_KEY='el_pedidos_ids_vistos';

function uuid(){return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,function(c){return (c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16);});}
function carregarMotoboy(){try{return JSON.parse(localStorage.getItem(MOTOBOY_KEY))||null;}catch(e){return null;}}
function salvarMotoboy(d){localStorage.setItem(MOTOBOY_KEY,JSON.stringify(d));}

function sbHeaders(){return{'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Prefer':'return=representation'};}

async function sbListarPedidos(){
  try{
    var meu=getMotoboyId();
    var url=SB_URL+'/rest/v1/el_pedidos?or=(status.eq.aguardando,and(motoboy_id.eq.'+meu+',status.in.(caminho,entregue)))&order=criado_em.desc';
    var r=await fetch(url,{headers:sbHeaders()});
    if(r.ok)return await r.json();
  }catch(e){console.warn('sbListarPedidos erro:',e);}
  return [];
}

async function sbAceitarPedido(pid){
  var m=carregarMotoboy();
  try{
    var body={status:'caminho',motoboy_id:m.id,motoboy_nome:m.nome,saiu_em:new Date().toISOString()};
    var r=await fetch(SB_URL+'/rest/v1/el_pedidos?id=eq.'+pid+'&status=eq.aguardando',{method:'PATCH',headers:sbHeaders(),body:JSON.stringify(body)});
    if(r.ok){var j=await r.json();return j&&j.length>0;}
  }catch(e){console.warn('sbAceitarPedido erro:',e);}
  return false;
}

async function sbEntreguePedido(pid){
  try{
    var body={status:'entregue',entregue_em:new Date().toISOString()};
    var r=await fetch(SB_URL+'/rest/v1/el_pedidos?id=eq.'+pid,{method:'PATCH',headers:Object.assign({'Prefer':'return=minimal'},sbHeaders()),body:JSON.stringify(body)});
    return r.ok;
  }catch(e){return false;}
}

async function sbSoltarPedido(pid){
  try{
    var body={status:'aguardando',motoboy_id:null,motoboy_nome:null,saiu_em:null};
    var r=await fetch(SB_URL+'/rest/v1/el_pedidos?id=eq.'+pid,{method:'PATCH',headers:Object.assign({'Prefer':'return=minimal'},sbHeaders()),body:JSON.stringify(body)});
    return r.ok;
  }catch(e){return false;}
}

function getMotoboyId(){var m=carregarMotoboy();return m?m.id:'sem-id';}
function toast(msg){var t=document.getElementById('toast');t.textContent=msg;t.classList.add('ativo');clearTimeout(t._h);t._h=setTimeout(function(){t.classList.remove('ativo');},2200);}
function fecharModal(id){document.getElementById(id).classList.remove('ativo');}
function escapeHtml(s){if(!s)return '';return String(s).replace(/[&<>"\']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}

// ============ ALERTAS / NOTIFICACOES ============
var audioCtx=null;
function tocarBeep(){
  try{
    if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    // 3 beeps rapidos pra chamar atencao
    [0,0.2,0.4].forEach(function(delay){
      var osc=audioCtx.createOscillator();
      var gain=audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value=880;
      osc.type='sine';
      var t=audioCtx.currentTime+delay;
      gain.gain.setValueAtTime(0,t);
      gain.gain.linearRampToValueAtTime(0.3,t+0.01);
      gain.gain.exponentialRampToValueAtTime(0.001,t+0.15);
      osc.start(t);
      osc.stop(t+0.2);
    });
  }catch(e){console.warn('beep erro:',e);}
}

function vibrar(){
  try{if(navigator.vibrate)navigator.vibrate([200,100,200,100,200]);}catch(e){}
}

function notificacaoVisual(qtd){
  try{
    if(!('Notification' in window))return;
    if(Notification.permission!=='granted')return;
    var n=new Notification('🛵 Novo pedido!',{
      body:qtd>1?qtd+' pedidos disponiveis pra retirada':'1 pedido disponivel pra retirada',
      icon:'icon-192.png',
      tag:'novo-pedido',
      requireInteraction:false
    });
    setTimeout(function(){try{n.close();}catch(e){}},8000);
  }catch(e){console.warn('notif erro:',e);}
}

function pedirPermissaoNotif(){
  try{
    if(!('Notification' in window))return;
    if(Notification.permission==='default'){
      Notification.requestPermission().then(function(p){
        if(p==='granted')toast('🔔 Notificacoes ativadas');
      });
    }
  }catch(e){}
}

function carregarIdsVistos(){
  try{return JSON.parse(localStorage.getItem(IDS_VISTOS_KEY))||[];}catch(e){return [];}
}
function salvarIdsVistos(ids){
  try{localStorage.setItem(IDS_VISTOS_KEY,JSON.stringify(ids.slice(0,200)));}catch(e){}
}

function detectarNovoPedido(listaDisponiveis){
  var vistos=carregarIdsVistos();
  var novos=listaDisponiveis.filter(function(p){return vistos.indexOf(p.id)===-1;});
  if(novos.length>0 && vistos.length>0){
    // So alerta se ja tinha alguma lista antes (evita disparar na primeira carga)
    tocarBeep();
    vibrar();
    notificacaoVisual(novos.length);
  }
  var ids=listaDisponiveis.map(function(p){return p.id;});
  salvarIdsVistos(ids);
}

// ============ PERFIL ============
function abrirPerfil(){
  var m=carregarMotoboy()||{};
  document.getElementById('m-nome').value=m.nome||'';
  document.getElementById('m-telefone').value=m.telefone||'';
  document.getElementById('modal-perfil').classList.add('ativo');
}

function salvarPerfil(){
  var nome=document.getElementById('m-nome').value.trim();
  if(!nome){alert('Informe seu nome');return;}
  var atual=carregarMotoboy()||{};
  var d={id:atual.id||uuid(),nome:nome,telefone:document.getElementById('m-telefone').value.trim()};
  salvarMotoboy(d);
  fecharModal('modal-perfil');
  document.getElementById('motoboy-nome').textContent=d.nome;
  toast('✓ Perfil salvo');
  pedirPermissaoNotif();
  carregar();
}

// ============ ACOES PEDIDO ============
async function aceitar(pid){
  var m=carregarMotoboy();
  if(!m||!m.nome){alert('Cadastre seu nome primeiro (botão 👤 no canto superior)');abrirPerfil();return;}
  if(!confirm('Aceitar essa entrega?'))return;
  toast('Aceitando...');
  var ok=await sbAceitarPedido(pid);
  if(ok){toast('✓ Pedido aceito! Boa entrega');}
  else{toast('⚠ Outro motoboy pegou antes');}
  carregar();
}

async function entregar(pid){
  if(!confirm('Marcar como entregue?'))return;
  var ok=await sbEntreguePedido(pid);
  if(ok)toast('✓ Entregue! +1');
  carregar();
}

async function soltar(pid){
  if(!confirm('Soltar esse pedido (volta pra fila pública)?'))return;
  var ok=await sbSoltarPedido(pid);
  if(ok)toast('Pedido solto');
  carregar();
}

// ============ RENDER ============
function renderPedidos(lista){
  var meuId=getMotoboyId();
  var meus=lista.filter(function(p){return p.motoboy_id===meuId&&p.status!=='entregue';});
  var entregues=lista.filter(function(p){return p.motoboy_id===meuId&&p.status==='entregue';});
  var disp=lista.filter(function(p){return p.status==='aguardando';});

  // Detectar novo pedido ANTES de salvar ids
  detectarNovoPedido(disp);

  document.getElementById('st-aguardando').textContent=disp.length;
  document.getElementById('st-meus').textContent=meus.length;
  document.getElementById('st-entregue').textContent=entregues.length;

  var elM=document.getElementById('lista-meus');
  if(!meus.length){
    elM.innerHTML='<div class="empty"><div class="empty-titulo">Nenhum pedido seu agora</div><div>Aceite um da lista abaixo</div></div>';
  }else{
    elM.innerHTML='';
    meus.forEach(function(p){elM.appendChild(renderCardMeu(p));});
  }
  var elD=document.getElementById('lista-disponiveis');
  if(!disp.length){
    elD.innerHTML='<div class="empty"><div class="empty-icon">📦</div><div class="empty-titulo">Sem pedidos no momento</div><div>Vai aparecer aqui quando alguma loja publicar.</div></div>';
  }else{
    elD.innerHTML='';
    disp.forEach(function(p){elD.appendChild(renderCardDisponivel(p));});
  }
}

function renderCardMeu(p){
  var c=document.createElement('div');
  c.className='pedido meu';
  var mapsUrl='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.endereco||'');
  var h='<span class="badge badge-meu">SEU PEDIDO</span>';
  h+='<div class="pedido-loja">'+escapeHtml(p.estabelecimento_nome||'Estabelecimento')+' #'+p.numero+'</div>';
  h+='<div class="pedido-cliente">'+escapeHtml(p.cliente)+'</div>';
  h+='<div class="pedido-addr">📍 '+escapeHtml(p.endereco)+'</div>';
  if(p.itens)h+='<div class="pedido-itens">'+escapeHtml(p.itens)+'</div>';
  if(p.valor)h+='<div class="pedido-valor">R$ '+escapeHtml(p.valor)+'</div>';
  if(p.obs)h+='<div class="pedido-obs">💡 '+escapeHtml(p.obs)+'</div>';
  h+='<div class="pedido-acoes">';
  h+='<a class="btn btn-laranja" href="'+mapsUrl+'" target="_blank" rel="noopener" style="text-decoration:none;display:flex;align-items:center;justify-content:center">🗺️ Navegar</a>';
  h+='<button class="btn btn-verde" onclick="entregar(\''+p.id+'\')">✓ Entreguei</button>';
  h+='<button class="btn btn-cinza" onclick="soltar(\''+p.id+'\')">↩ Soltar</button>';
  h+='</div>';
  c.innerHTML=h;
  return c;
}

function renderCardDisponivel(p){
  var c=document.createElement('div');
  c.className='pedido';
  var h='<span class="badge badge-aguardando">Disponível</span>';
  h+='<div class="pedido-loja">'+escapeHtml(p.estabelecimento_nome||'Estabelecimento')+' #'+p.numero+'</div>';
  h+='<div class="pedido-cliente">'+escapeHtml(p.cliente)+'</div>';
  h+='<div class="pedido-addr">📍 '+escapeHtml(p.endereco)+'</div>';
  if(p.itens)h+='<div class="pedido-itens">'+escapeHtml(p.itens)+'</div>';
  if(p.valor)h+='<div class="pedido-valor">R$ '+escapeHtml(p.valor)+'</div>';
  if(p.obs)h+='<div class="pedido-obs">💡 '+escapeHtml(p.obs)+'</div>';
  var ha=p.criado_em?new Date(p.criado_em).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'';
  h+='<div class="pedido-meta">🕐 Publicado às '+ha+'</div>';
  h+='<div class="pedido-acoes">';
  h+='<button class="btn btn-laranja" onclick="aceitar(\''+p.id+'\')">🛵 Aceitar entrega</button>';
  h+='</div>';
  c.innerHTML=h;
  return c;
}

async function carregar(){
  document.getElementById('status-conexao').textContent='Atualizando...';
  var lista=await sbListarPedidos();
  document.getElementById('status-conexao').textContent='Conectado';
  renderPedidos(lista);
}

document.querySelectorAll('.modal-overlay').forEach(function(ov){ov.addEventListener('click',function(e){if(e.target===ov)ov.classList.remove('ativo');});});

// Inicia
var motoboy=carregarMotoboy();
if(motoboy&&motoboy.nome){
  document.getElementById('motoboy-nome').textContent=motoboy.nome;
  pedirPermissaoNotif();
}else{
  document.getElementById('motoboy-nome').textContent='Sem cadastro';
  setTimeout(abrirPerfil,500);
}
// Primeira interacao do usuario libera audio context (politica do navegador)
document.addEventListener('click',function _init(){
  try{if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==='suspended')audioCtx.resume();}catch(e){}
  document.removeEventListener('click',_init);
},{once:true});
carregar();
setInterval(carregar,10000);
