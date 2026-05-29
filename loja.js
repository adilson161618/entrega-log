// EntregaLog - Pagina da Loja - Logica
var LOJA_KEY='el_loja_dados';
var PEDIDOS_KEY='el_loja_pedidos';
var _logoTmp='';
var _bgTmp='';
var PALETA=['#F97316','#1D9E75','#DC2626','#7C3AED','#2563EB','#DB2777','#0EA5E9','#16A34A','#CA8A04','#EA580C','#9333EA','#475569'];

function carregarLoja(){try{return JSON.parse(localStorage.getItem(LOJA_KEY))||defaultLoja();}catch(e){return defaultLoja();}}
function defaultLoja(){return{nome:'Pet Shop Patinhas',endereco:'',telefone:'',plano:'basico',slogan:'',cor:'#F97316',logoEmoji:'🏪',logoImg:'',bgImg:'',bgModo:'banner'};}
function salvarLoja(d){localStorage.setItem(LOJA_KEY,JSON.stringify(d));}
function carregarPedidos(){try{return JSON.parse(localStorage.getItem(PEDIDOS_KEY))||[];}catch(e){return [];}}
function salvarPedidos(l){localStorage.setItem(PEDIDOS_KEY,JSON.stringify(l));}

function hex2rgba(hex,a){
  hex=hex.replace('#','');
  if(hex.length!==6)return 'rgba(249,115,22,'+a+')';
  var r=parseInt(hex.substring(0,2),16);
  var g=parseInt(hex.substring(2,4),16);
  var b=parseInt(hex.substring(4,6),16);
  return 'rgba('+r+','+g+','+b+','+a+')';
}

function aplicarLoja(){
  var d=carregarLoja();
  document.getElementById('loja-nome').textContent=d.nome||'Comércio';
  var planos={basico:'Plano Básico',intermediario:'Plano Intermediário',empresarial:'Plano Empresarial'};
  var hoje=new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
  document.getElementById('loja-status').innerHTML=(planos[d.plano]||'Plano Básico')+' · '+hoje;
  document.title='EntregaLog · '+(d.nome||'Loja');
  var cor=d.cor||'#F97316';
  document.documentElement.style.setProperty('--cor-principal',cor);
  document.documentElement.style.setProperty('--cor-principal-clara',hex2rgba(cor,0.08));
  document.documentElement.style.setProperty('--cor-principal-borda',hex2rgba(cor,0.4));
  var slogan=document.getElementById('loja-slogan');
  if(d.slogan){slogan.textContent='"'+d.slogan+'"';slogan.style.display='block';}
  else{slogan.style.display='none';}
  var logo=document.getElementById('loja-logo');
  if(d.logoImg){logo.innerHTML='<img src="'+d.logoImg+'" alt=""/>';}
  else{logo.innerHTML='';logo.textContent=d.logoEmoji||'🏪';}
  if(d.bgImg && d.bgModo==='banner'){
    document.documentElement.style.setProperty('--banner-img','url('+d.bgImg+')');
    document.documentElement.style.setProperty('--bg-display','none');
  }else if(d.bgImg && d.bgModo==='pagina'){
    document.documentElement.style.setProperty('--banner-img','none');
    document.documentElement.style.setProperty('--bg-loja','url('+d.bgImg+')');
    document.documentElement.style.setProperty('--bg-display','block');
  }else{
    document.documentElement.style.setProperty('--banner-img','none');
    document.documentElement.style.setProperty('--bg-display','none');
  }
}

function trocarTab(t){
  document.querySelectorAll('.tab').forEach(function(b){b.classList.toggle('ativa',b.dataset.tab===t);});
  document.querySelectorAll('.tab-conteudo').forEach(function(c){c.style.display='none';});
  document.getElementById('tab-'+t).style.display='block';
  if(t==='pedidos')renderPedidos();
  if(t==='motoboys')renderMotoboys();
  if(t==='historico')renderHistorico();
}

function toast(msg){
  var t=document.getElementById('toast');
  t.textContent=msg;
  t.classList.add('ativo');
  clearTimeout(t._h);
  t._h=setTimeout(function(){t.classList.remove('ativo');},2200);
}

function fecharModal(id){document.getElementById(id).classList.remove('ativo');}
function escapeHtml(s){if(!s)return '';return String(s).replace(/[&<>"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}

function novoIdPedido(){
  var l=carregarPedidos();
  var m=l.reduce(function(x,p){return Math.max(x,parseInt(p.numero||0));},1000);
  return m+1;
}

function abrirNovoPedido(){
  document.getElementById('p-cliente').value='';
  document.getElementById('p-endereco').value='';
  document.getElementById('p-itens').value='';
  document.getElementById('p-valor').value='';
  document.getElementById('p-obs').value='';
  document.getElementById('modal-pedido').classList.add('ativo');
}

function salvarPedido(){
  var cli=document.getElementById('p-cliente').value.trim();
  var end=document.getElementById('p-endereco').value.trim();
  if(!cli){alert('Informe o cliente');return;}
  if(!end){alert('Informe o endereço');return;}
  var lista=carregarPedidos();
  var p={
    numero:novoIdPedido(),
    cliente:cli,
    endereco:end,
    itens:document.getElementById('p-itens').value.trim(),
    valor:document.getElementById('p-valor').value.trim(),
    obs:document.getElementById('p-obs').value.trim(),
    status:'aguardando',
    criado_em:new Date().toISOString(),
    motoboy:null,saiu_em:null,entregue_em:null
  };
  lista.unshift(p);
  salvarPedidos(lista);
  fecharModal('modal-pedido');
  renderPedidos();
  toast('✓ Pedido #'+p.numero+' salvo');
}

function mudarStatus(num,novo){
  var l=carregarPedidos();
  var i=l.findIndex(function(x){return x.numero===num;});
  if(i<0)return;
  l[i].status=novo;
  if(novo==='caminho')l[i].saiu_em=new Date().toISOString();
  if(novo==='entregue')l[i].entregue_em=new Date().toISOString();
  salvarPedidos(l);
  renderPedidos();
  var lab={caminho:'a caminho',entregue:'entregue',aguardando:'aguardando'};
  toast('Pedido #'+num+' '+lab[novo]);
}

function excluirPedido(num){
  if(!confirm('Excluir o pedido #'+num+'?'))return;
  var l=carregarPedidos().filter(function(x){return x.numero!==num;});
  salvarPedidos(l);
  renderPedidos();
  toast('Pedido #'+num+' excluído');
}

function renderPedidos(){
  var lista=carregarPedidos();
  var hoje=new Date().toDateString();
  var hojeP=lista.filter(function(p){try{return new Date(p.criado_em).toDateString()===hoje;}catch(e){return true;}});
  document.getElementById('st-total').textContent=hojeP.length;
  document.getElementById('st-aguardando').textContent=hojeP.filter(function(p){return p.status==='aguardando';}).length;
  document.getElementById('st-caminho').textContent=hojeP.filter(function(p){return p.status==='caminho';}).length;
  document.getElementById('st-entregue').textContent=hojeP.filter(function(p){return p.status==='entregue';}).length;
  var el=document.getElementById('lista-pedidos');
  if(!hojeP.length){
    el.innerHTML='<div class="empty"><div class="empty-icon">📦</div>Nenhum pedido hoje.<br/><br/>Toque em <b>+ Cadastrar novo pedido</b>.</div>';
    return;
  }
  el.innerHTML='';
  hojeP.forEach(function(p){
    var c=document.createElement('div');
    c.className='pedido '+p.status;
    var lab={aguardando:'Aguardando',caminho:'A caminho',entregue:'Entregue'};
    var bd={aguardando:'badge-aguardando',caminho:'badge-caminho',entregue:'badge-entregue'};
    var h=p.criado_em?new Date(p.criado_em).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'';
    var html='<div class="pedido-topo"><div><div class="pedido-num">#'+p.numero+'</div></div><span class="badge '+bd[p.status]+'">'+lab[p.status]+'</span></div>';
    html+='<div class="pedido-cliente">'+escapeHtml(p.cliente)+'</div>';
    html+='<div class="pedido-addr">📍 '+escapeHtml(p.endereco)+'</div>';
    if(p.itens)html+='<div class="pedido-itens">'+escapeHtml(p.itens)+'</div>';
    if(p.valor)html+='<div class="pedido-valor">R$ '+escapeHtml(p.valor)+'</div>';
    if(p.obs)html+='<div class="pedido-meta">💡 '+escapeHtml(p.obs)+'</div>';
    html+='<div class="pedido-meta">🕐 Criado às '+h+'</div>';
    html+='<div class="pedido-acoes">';
    if(p.status==='aguardando')html+='<button class="btn btn-principal" onclick="mudarStatus('+p.numero+',\'caminho\')">🛵 Saiu para entrega</button>';
    else if(p.status==='caminho'){
      html+='<button class="btn btn-verde" onclick="mudarStatus('+p.numero+',\'entregue\')">✓ Marcar entregue</button>';
      html+='<button class="btn btn-cinza" onclick="mudarStatus('+p.numero+',\'aguardando\')">↩</button>';
    }
    else html+='<button class="btn btn-cinza" onclick="mudarStatus('+p.numero+',\'caminho\')">↩ Voltar</button>';
    html+='<button class="btn btn-vermelho" title="Excluir" onclick="excluirPedido('+p.numero+')">🗑</button>';
    html+='</div>';
    c.innerHTML=html;
    el.appendChild(c);
  });
}

function renderMotoboys(){
  document.getElementById('lista-motoboys').innerHTML='<div class="empty"><div class="empty-icon">🛵</div>Em breve.<br/><br/>Aqui ficará a lista de motoboys cadastrados no EntregaLog que atendem o seu comércio.</div>';
}

function renderHistorico(){
  var l=carregarPedidos();
  var hoje=new Date().toDateString();
  var ant=l.filter(function(p){try{return new Date(p.criado_em).toDateString()!==hoje;}catch(e){return false;}});
  var el=document.getElementById('lista-historico');
  if(!ant.length){el.innerHTML='<div class="empty"><div class="empty-icon">📁</div>Sem pedidos anteriores.</div>';return;}
  el.innerHTML='';
  ant.forEach(function(p){
    var c=document.createElement('div');
    c.className='pedido '+p.status;
    var d=p.criado_em?new Date(p.criado_em).toLocaleDateString('pt-BR'):'';
    var lab={aguardando:'Aguardando',caminho:'A caminho',entregue:'Entregue'};
    var bd={aguardando:'badge-aguardando',caminho:'badge-caminho',entregue:'badge-entregue'};
    c.innerHTML='<div class="pedido-topo"><div><div class="pedido-num">#'+p.numero+'</div></div><span class="badge '+bd[p.status]+'">'+lab[p.status]+'</span></div><div class="pedido-cliente">'+escapeHtml(p.cliente)+'</div><div class="pedido-addr">📍 '+escapeHtml(p.endereco)+'</div><div class="pedido-meta">🗓 '+d+'</div>';
    el.appendChild(c);
  });
}

function lerImg(file,maxW,cb){
  if(!file){cb('');return;}
  var r=new FileReader();
  r.onload=function(e){
    var img=new Image();
    img.onload=function(){
      var cv=document.createElement('canvas');
      var w=img.width,h=img.height;
      if(w>maxW){h=Math.round(h*maxW/w);w=maxW;}
      cv.width=w;cv.height=h;
      cv.getContext('2d').drawImage(img,0,0,w,h);
      cb(cv.toDataURL('image/jpeg',0.78));
    };
    img.src=e.target.result;
  };
  r.readAsDataURL(file);
}

function montarPaleta(cor){
  var div=document.getElementById('paleta-cores');
  div.innerHTML='';
  PALETA.forEach(function(c){
    var b=document.createElement('div');
    b.className='bola-cor'+(c.toLowerCase()===cor.toLowerCase()?' selecionada':'');
    b.style.background=c;
    b.onclick=function(){document.getElementById('c-cor').value=c;montarPaleta(c);};
    div.appendChild(b);
  });
}

function atualizarPreviewLogo(emoji,img){
  var p=document.getElementById('logo-preview');
  if(img){p.innerHTML='<img src="'+img+'" style="width:100%;height:100%;object-fit:cover"/>';}
  else{p.textContent=emoji||'🏪';}
}

function removerLogo(){
  _logoTmp='';
  document.getElementById('c-logo-emoji').value='🏪';
  atualizarPreviewLogo('🏪','');
}

function removerBg(){
  _bgTmp='';
  var p=document.getElementById('bg-preview');
  p.style.backgroundImage='';
  p.textContent='Sem foto';
}

function abrirConfig(){
  var d=carregarLoja();
  document.getElementById('c-nome').value=d.nome||'';
  document.getElementById('c-endereco').value=d.endereco||'';
  document.getElementById('c-telefone').value=d.telefone||'';
  document.getElementById('c-plano').value=d.plano||'basico';
  document.getElementById('c-slogan').value=d.slogan||'';
  document.getElementById('c-cor').value=d.cor||'#F97316';
  document.getElementById('c-logo-emoji').value=d.logoEmoji||'🏪';
  document.getElementById('c-logo-arquivo').value='';
  document.getElementById('c-bg-arquivo').value='';
  _logoTmp=d.logoImg||'';
  _bgTmp=d.bgImg||'';
  atualizarPreviewLogo(d.logoEmoji||'🏪',d.logoImg||'');
  var bp=document.getElementById('bg-preview');
  if(d.bgImg){bp.style.backgroundImage='url('+d.bgImg+')';bp.textContent='';}
  else{bp.style.backgroundImage='';bp.textContent='Sem foto';}
  document.querySelectorAll('input[name="bg-modo"]').forEach(function(r){r.checked=(r.value===(d.bgModo||'banner'));});
  montarPaleta(d.cor||'#F97316');
  document.getElementById('modal-config').classList.add('ativo');
}

function salvarConfig(){
  var m=document.querySelector('input[name="bg-modo"]:checked');
  var d={
    nome:document.getElementById('c-nome').value.trim()||'Comércio',
    endereco:document.getElementById('c-endereco').value.trim(),
    telefone:document.getElementById('c-telefone').value.trim(),
    plano:document.getElementById('c-plano').value,
    slogan:document.getElementById('c-slogan').value.trim(),
    cor:document.getElementById('c-cor').value||'#F97316',
    logoEmoji:document.getElementById('c-logo-emoji').value.trim()||'🏪',
    logoImg:_logoTmp||'',
    bgImg:_bgTmp||'',
    bgModo:m?m.value:'banner'
  };
  try{salvarLoja(d);}catch(e){alert('Erro: imagem grande demais. Tente uma menor.');return;}
  aplicarLoja();
  fecharModal('modal-config');
  toast('✓ Configurações salvas');
}

document.getElementById('c-logo-emoji').addEventListener('input',function(e){
  _logoTmp='';
  atualizarPreviewLogo(e.target.value||'🏪','');
});
document.getElementById('c-logo-arquivo').addEventListener('change',function(e){
  var f=e.target.files[0];
  if(!f)return;
  lerImg(f,200,function(u){_logoTmp=u;atualizarPreviewLogo('',u);});
});
document.getElementById('c-bg-arquivo').addEventListener('change',function(e){
  var f=e.target.files[0];
  if(!f)return;
  lerImg(f,1200,function(u){_bgTmp=u;var p=document.getElementById('bg-preview');p.style.backgroundImage='url('+u+')';p.textContent='';});
});
document.querySelectorAll('.modal-overlay').forEach(function(ov){
  ov.addEventListener('click',function(e){if(e.target===ov)ov.classList.remove('ativo');});
});

aplicarLoja();
renderPedidos();
