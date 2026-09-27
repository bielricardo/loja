import { sb, CONFIG, configurado, urlFoto, brl, esc, avisoNaoConfigurado } from './db.js';

const $ = (s) => document.querySelector(s);
const estado = { produtos: [], categorias: [], cat: 'todas', busca: '', ordem: 'recentes' };

const zap = (msg) => `https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent(msg)}`;

function cabecalho() {
  document.title = CONFIG.NOME_LOJA;
  $('#nomeLoja').textContent = CONFIG.NOME_LOJA;
  $('#slogan').textContent = CONFIG.SLOGAN || '';
  $('#zapTopo').href = zap(`Olá! Vim pelo catálogo da ${CONFIG.NOME_LOJA}.`);
  $('#rodape').innerHTML = `${esc(CONFIG.NOME_LOJA)}${CONFIG.CIDADE ? ' · ' + esc(CONFIG.CIDADE) : ''}
    · Chame no <a href="${zap('Olá!')}" target="_blank" rel="noopener">WhatsApp</a>`;
}

async function carregar() {
  const [cats, prods] = await Promise.all([
    sb.from('categorias').select('id,nome,ordem').order('ordem').order('nome'),
    sb.from('produtos')
      .select('id,nome,descricao,categoria_id,condicao,preco,status,destaque,fotos,criado_em')
      .in('status', ['disponivel', 'reservado'])
      .order('destaque', { ascending: false })
      .order('criado_em', { ascending: false }),
  ]);
  if (cats.error || prods.error) throw cats.error || prods.error;
  estado.categorias = cats.data;
  estado.produtos = prods.data;
}

function nomeCat(id) {
  return estado.categorias.find((c) => c.id === id)?.nome || '';
}

function renderChips() {
  const usadas = new Set(estado.produtos.map((p) => p.categoria_id));
  const cats = estado.categorias.filter((c) => usadas.has(c.id));
  $('#chips').innerHTML = [
    `<button class="chip ${estado.cat === 'todas' ? 'ativo' : ''}" data-cat="todas">Todos</button>`,
    ...cats.map((c) => `<button class="chip ${estado.cat === c.id ? 'ativo' : ''}" data-cat="${c.id}">${esc(c.nome)}</button>`),
  ].join('');
}

function filtrados() {
  const b = estado.busca.trim().toLowerCase();
  let l = estado.produtos.filter((p) =>
    (estado.cat === 'todas' || p.categoria_id === estado.cat) &&
    (!b || (p.nome + ' ' + p.descricao + ' ' + nomeCat(p.categoria_id)).toLowerCase().includes(b)));
  if (estado.ordem === 'menor') l = [...l].sort((a, z) => (a.preco ?? 1e12) - (z.preco ?? 1e12));
  if (estado.ordem === 'maior') l = [...l].sort((a, z) => (z.preco ?? -1) - (a.preco ?? -1));
  return l;
}

function renderGrade() {
  const l = filtrados();
  $('#contagem').textContent = `${l.length} ${l.length === 1 ? 'produto' : 'produtos'}`;
  if (!l.length) {
    $('#grade').innerHTML = `<div class="vazio" style="grid-column:1/-1">Nenhum produto encontrado.</div>`;
    return;
  }
  $('#grade').innerHTML = l.map((p) => `
    <article class="card" data-id="${p.id}">
      <div class="foto">
        ${p.fotos?.[0] ? `<img src="${urlFoto(p.fotos[0], true)}" alt="${esc(p.nome)}" loading="lazy">` : '<div class="semfoto">sem foto</div>'}
        ${p.status === 'reservado' ? '<span class="selo">Reservado</span>' : ''}
        ${p.destaque ? '<span class="selo destaque">Destaque</span>' : ''}
      </div>
      <div class="info">
        <span class="meta">${esc(nomeCat(p.categoria_id))}${p.condicao ? ' · ' + esc(p.condicao) : ''}</span>
        <h3>${esc(p.nome)}</h3>
        <span class="preco">${p.preco != null ? brl(p.preco) : 'Consultar'}</span>
      </div>
    </article>`).join('');
}

// ---------- detalhe do produto ----------
let fotoAtual = 0;

function abrir(id) {
  const p = estado.produtos.find((x) => x.id === id);
  if (!p) return fechar();
  fotoAtual = 0;
  const link = location.href.split('#')[0] + '#p=' + p.id;
  const msg = `Olá! Tenho interesse no produto: ${p.nome}` +
    (p.preco != null ? ` (${brl(p.preco)})` : '') + `\n${link}`;
  const fotos = p.fotos || [];

  $('#modalCorpo').innerHTML = `
    <div class="detalhe">
      <div class="galeria">
        <div class="principal">
          ${fotos.length ? `<img id="fotoGrande" src="${urlFoto(fotos[0])}" alt="${esc(p.nome)}">` : '<div class="semfoto">sem foto</div>'}
          ${fotos.length > 1 ? '<button class="btn nav ant" data-nav="-1" aria-label="Anterior">‹</button><button class="btn nav prox" data-nav="1" aria-label="Próxima">›</button>' : ''}
        </div>
        ${fotos.length > 1 ? `<div class="miniaturas">${fotos.map((f, i) =>
          `<img src="${urlFoto(f, true)}" data-i="${i}" class="${i === 0 ? 'ativa' : ''}" alt="Foto ${i + 1}">`).join('')}</div>` : ''}
      </div>
      <div>
        <h2>${esc(p.nome)}</h2>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${nomeCat(p.categoria_id) ? `<span class="tag">${esc(nomeCat(p.categoria_id))}</span>` : ''}
          ${p.condicao ? `<span class="tag">${esc(p.condicao)}</span>` : ''}
          ${p.status === 'reservado' ? '<span class="tag amarelo">Reservado</span>' : '<span class="tag verde">Disponível</span>'}
        </div>
        <div class="preco">${p.preco != null ? brl(p.preco) : 'Preço a consultar'}</div>
        ${p.descricao ? `<div class="desc">${esc(p.descricao)}</div>` : ''}
        <div class="acoes">
          <a class="btn zap" href="${zap(msg)}" target="_blank" rel="noopener">Chamar no WhatsApp</a>
          <button class="btn" id="compartilhar">Compartilhar</button>
        </div>
      </div>
    </div>`;

  $('#modal').hidden = false;
  document.body.style.overflow = 'hidden';
  if (location.hash !== '#p=' + p.id) history.replaceState(null, '', '#p=' + p.id);

  $('#compartilhar').onclick = async () => {
    try {
      if (navigator.share) await navigator.share({ title: p.nome, text: p.nome, url: link });
      else { await navigator.clipboard.writeText(link); $('#compartilhar').textContent = 'Link copiado!'; }
    } catch { /* usuário cancelou */ }
  };

  const trocar = (i) => {
    fotoAtual = (i + fotos.length) % fotos.length;
    $('#fotoGrande').src = urlFoto(fotos[fotoAtual]);
    document.querySelectorAll('.miniaturas img').forEach((m, k) => m.classList.toggle('ativa', k === fotoAtual));
  };
  $('#modalCorpo').onclick = (e) => {
    const nav = e.target.closest('[data-nav]');
    if (nav) trocar(fotoAtual + Number(nav.dataset.nav));
    const mini = e.target.closest('.miniaturas img');
    if (mini) trocar(Number(mini.dataset.i));
  };
  // arrastar para o lado no celular
  const g = document.querySelector('.galeria .principal');
  let x0 = null;
  g.ontouchstart = (e) => { x0 = e.touches[0].clientX; };
  g.ontouchend = (e) => {
    if (x0 === null || fotos.length < 2) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) trocar(fotoAtual + (dx < 0 ? 1 : -1));
    x0 = null;
  };
}

function fechar() {
  $('#modal').hidden = true;
  document.body.style.overflow = '';
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
}

function abrirPeloLink() {
  const m = location.hash.match(/^#p=([\w-]+)/);
  if (m) abrir(m[1]);
}

// ---------- eventos ----------
$('#chips').onclick = (e) => {
  const c = e.target.closest('[data-cat]');
  if (!c) return;
  estado.cat = c.dataset.cat;
  renderChips(); renderGrade();
};
$('#busca').oninput = (e) => { estado.busca = e.target.value; renderGrade(); };
$('#ordem').onchange = (e) => { estado.ordem = e.target.value; renderGrade(); };
$('#grade').onclick = (e) => { const c = e.target.closest('.card'); if (c) abrir(c.dataset.id); };
$('#fechar').onclick = fechar;
$('#modal').onclick = (e) => { if (e.target.id === 'modal') fechar(); };
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) fechar(); });
window.addEventListener('hashchange', abrirPeloLink);

// ---------- início ----------
cabecalho();
if (!configurado) {
  avisoNaoConfigurado($('#grade'));
} else {
  carregar()
    .then(() => { renderChips(); renderGrade(); abrirPeloLink(); })
    .catch((err) => {
      console.error(err);
      $('#grade').innerHTML = `<div class="vazio" style="grid-column:1/-1">Não foi possível carregar os produtos.<br><small>${esc(err.message)}</small></div>`;
    });
}
