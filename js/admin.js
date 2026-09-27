import { sb, CONFIG, configurado, urlFoto, brl, esc, STATUS, BUCKET, avisoNaoConfigurado } from './db.js';

const $ = (s) => document.querySelector(s);
const E = { produtos: [], categorias: [], busca: '', cat: 'todas', status: 'estoque' };

// ---------- utilidades ----------
function toast(msg, ms = 2600) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}
const num = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().replace(/[R$\s]/g, '');
  if (!s) return null;
  // aceita "1.234,56", "1234,56" e "1234.56"
  const n = s.includes(',') ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s);
  return Number.isFinite(n) ? n : null;
};
const fmtNum = (v) => (v === null || v === undefined ? '' : String(v).replace('.', ','));
const hoje = () => new Date().toLocaleDateString('sv-SE'); // AAAA-MM-DD no fuso local
const priv = (p) => (Array.isArray(p.produtos_privado) ? p.produtos_privado[0] : p.produtos_privado) || {};
const nomeCat = (id) => E.categorias.find((c) => c.id === id)?.nome || 'Sem categoria';

// ---------- login ----------
async function iniciar() {
  document.title = 'Painel · ' + CONFIG.NOME_LOJA;
  $('#nomeLoja').textContent = CONFIG.NOME_LOJA;
  if (!configurado) {
    $('#telaLogin').hidden = false;
    avisoNaoConfigurado($('#formLogin'));
    return;
  }
  const { data } = await sb.auth.getSession();
  mostrar(!!data.session);
  sb.auth.onAuthStateChange((_ev, sessao) => mostrar(!!sessao));
}

let appAberto = false;
async function mostrar(logado) {
  $('#telaLogin').hidden = logado;
  $('#telaApp').hidden = !logado;
  if (logado && !appAberto) { appAberto = true; await recarregar(); }
  if (!logado) appAberto = false;
}

$('#formLogin').onsubmit = async (e) => {
  e.preventDefault();
  $('#erroLogin').textContent = '';
  $('#btnEntrar').disabled = true;
  const { error } = await sb.auth.signInWithPassword({ email: $('#email').value.trim(), password: $('#senha').value });
  $('#btnEntrar').disabled = false;
  if (error) $('#erroLogin').textContent = /invalid/i.test(error.message) ? 'E-mail ou senha incorretos.' : error.message;
};
$('#sair').onclick = () => sb.auth.signOut();

// ---------- dados ----------
async function recarregar() {
  const [c, p] = await Promise.all([
    sb.from('categorias').select('*').order('ordem').order('nome'),
    sb.from('produtos').select('*, produtos_privado(*)').order('criado_em', { ascending: false }),
  ]);
  if (c.error || p.error) { toast('Erro ao carregar: ' + (c.error || p.error).message, 6000); return; }
  E.categorias = c.data;
  E.produtos = p.data;
  renderFiltroCat(); renderStats(); renderLista(); renderCats();
}

// ---------- abas ----------
document.querySelector('.abas').onclick = (e) => {
  const b = e.target.closest('[data-aba]'); if (!b) return;
  document.querySelectorAll('.abas button').forEach((x) => x.classList.toggle('ativo', x === b));
  $('#abaProdutos').hidden = b.dataset.aba !== 'produtos';
  $('#abaCategorias').hidden = b.dataset.aba !== 'categorias';
};

// ---------- resumo ----------
function renderStats() {
  const ps = E.produtos;
  const vitrine = ps.filter((p) => p.status === 'disponivel' || p.status === 'reservado');
  const estoque = ps.filter((p) => p.status !== 'vendido');
  const mes = hoje().slice(0, 7);
  const vendMes = ps.filter((p) => p.status === 'vendido' && (priv(p).vendido_em || '').startsWith(mes));
  const soma = (l, f) => l.reduce((s, x) => s + (Number(f(x)) || 0), 0);
  const lucroMes = soma(vendMes, (p) => (priv(p).preco_venda ?? p.preco ?? 0) - (priv(p).custo ?? 0));
  $('#stats').innerHTML = `
    <div class="stat"><b>${vitrine.length}</b><span>no catálogo agora</span></div>
    <div class="stat"><b>${brl(soma(vitrine, (p) => p.preco))}</b><span>valor anunciado</span></div>
    <div class="stat"><b>${brl(soma(estoque, (p) => priv(p).custo))}</b><span>custo em estoque (${estoque.length} itens)</span></div>
    <div class="stat"><b>${vendMes.length} · ${brl(lucroMes)}</b><span>vendas e lucro no mês</span></div>`;
}

// ---------- lista de produtos ----------
function renderFiltroCat() {
  const opts = E.categorias.map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');
  $('#fCat').innerHTML = `<option value="todas">Todas as categorias</option>${opts}<option value="sem">Sem categoria</option>`;
  $('#fCat').value = E.cat;
  $('#f_categoria').innerHTML = `<option value="">Sem categoria</option>${opts}`;
}

function filtrados() {
  const b = E.busca.trim().toLowerCase();
  return E.produtos.filter((p) => {
    if (E.status === 'estoque' && p.status === 'vendido') return false;
    if (!['estoque', 'todos'].includes(E.status) && p.status !== E.status) return false;
    if (E.cat === 'sem' && p.categoria_id) return false;
    if (!['todas', 'sem'].includes(E.cat) && p.categoria_id !== E.cat) return false;
    if (b && !(p.nome + ' ' + p.descricao + ' ' + (priv(p).observacoes || '') + ' ' + (priv(p).onde_comprou || '')).toLowerCase().includes(b)) return false;
    return true;
  });
}

function renderLista() {
  const l = filtrados();
  if (!l.length) {
    $('#lista').innerHTML = `<div class="vazio">${E.produtos.length ? 'Nada encontrado com esses filtros.' : 'Nenhum produto ainda. Clique em <b>+ Novo produto</b>.'}</div>`;
    return;
  }
  $('#lista').innerHTML = l.map((p) => {
    const pv = priv(p);
    const custo = pv.custo;
    let extra = '';
    if (p.status === 'vendido') {
      const venda = pv.preco_venda ?? p.preco;
      const lucro = venda != null && custo != null ? venda - custo : null;
      extra = `<span>Vendido por ${brl(venda)}${pv.vendido_em ? ' em ' + pv.vendido_em.split('-').reverse().join('/') : ''}</span>` +
        (lucro != null ? `<span class="${lucro >= 0 ? 'lucro-pos' : 'lucro-neg'}">lucro ${brl(lucro)}</span>` : '');
    } else if (p.preco != null && custo != null) {
      const m = p.preco - custo;
      extra = `<span class="${m >= 0 ? 'lucro-pos' : 'lucro-neg'}">margem ${brl(m)}</span>`;
    }
    return `
    <div class="item" data-id="${p.id}">
      ${p.fotos?.[0] ? `<img src="${urlFoto(p.fotos[0], true)}" alt="" loading="lazy">` : '<div class="semfoto">—</div>'}
      <div>
        <div class="nome" data-editar="${p.id}">${p.destaque ? '⭐ ' : ''}${esc(p.nome)}</div>
        <div class="sub">
          <span>${esc(nomeCat(p.categoria_id))}</span>
          <span>custo ${brl(custo)}</span>
          <span>preço ${brl(p.preco)}</span>
          ${extra}
        </div>
      </div>
      <div class="dir">
        <select data-status="${p.id}" aria-label="Status">
          ${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === p.status ? 'selected' : ''}>${v.txt}</option>`).join('')}
        </select>
        <button class="btn peq" data-editar="${p.id}">Editar</button>
      </div>
    </div>`;
  }).join('');
}

$('#busca').oninput = (e) => { E.busca = e.target.value; renderLista(); };
$('#fCat').onchange = (e) => { E.cat = e.target.value; renderLista(); };
$('#fStatus').onchange = (e) => { E.status = e.target.value; renderLista(); };
$('#lista').onclick = (e) => {
  const b = e.target.closest('[data-editar]');
  if (b) abrirEditor(E.produtos.find((p) => p.id === b.dataset.editar));
};
$('#lista').onchange = async (e) => {
  const s = e.target.closest('[data-status]'); if (!s) return;
  const p = E.produtos.find((x) => x.id === s.dataset.status);
  s.disabled = true;
  const { error } = await sb.from('produtos').update({ status: s.value }).eq('id', p.id);
  if (!error && s.value === 'vendido') {
    const pv = priv(p);
    await sb.from('produtos_privado').upsert({
      produto_id: p.id, custo: pv.custo ?? null, onde_comprou: pv.onde_comprou ?? null, observacoes: pv.observacoes ?? null,
      preco_venda: pv.preco_venda ?? p.preco ?? null, vendido_em: pv.vendido_em || hoje(),
    });
  }
  if (error) toast('Erro: ' + error.message, 5000);
  else toast(`Status: ${STATUS[s.value].txt}`);
  await recarregar();
};

// ---------- editor ----------
let ed = null; // { id, fotos: [{path} | {file, url}], removidas: [] }

function abrirEditor(p = null) {
  const pv = p ? priv(p) : {};
  ed = { id: p?.id || null, fotos: (p?.fotos || []).map((path) => ({ path })), removidas: [] };
  $('#tituloEditor').textContent = p ? 'Editar produto' : 'Novo produto';
  $('#f_nome').value = p?.nome || '';
  $('#f_categoria').value = p?.categoria_id || (!['todas', 'sem'].includes(E.cat) ? E.cat : '');
  $('#f_condicao').value = p?.condicao || 'Usado';
  $('#f_status').value = p?.status || 'disponivel';
  $('#f_preco').value = fmtNum(p?.preco);
  $('#f_destaque').checked = !!p?.destaque;
  $('#f_descricao').value = p?.descricao || '';
  $('#f_custo').value = fmtNum(pv.custo);
  $('#f_onde').value = pv.onde_comprou || '';
  $('#f_preco_venda').value = fmtNum(pv.preco_venda);
  $('#f_vendido_em').value = pv.vendido_em || '';
  $('#f_obs').value = pv.observacoes || '';
  $('#excluir').hidden = !p;
  $('#erroProd').textContent = '';
  atualizarBlocoVenda();
  renderFotosEdit();
  $('#modal').hidden = false;
  document.body.style.overflow = 'hidden';
  if (!p) setTimeout(() => $('#f_nome').focus(), 50);
}

function fecharEditor() {
  ed?.fotos.forEach((f) => f.url && URL.revokeObjectURL(f.url));
  ed = null;
  $('#modal').hidden = true;
  document.body.style.overflow = '';
}

function atualizarBlocoVenda() {
  const vendido = $('#f_status').value === 'vendido';
  $('#blocoVenda').hidden = !vendido;
  if (vendido) {
    if (!$('#f_vendido_em').value) $('#f_vendido_em').value = hoje();
    if (!$('#f_preco_venda').value) $('#f_preco_venda').value = $('#f_preco').value;
  }
}
$('#f_status').onchange = atualizarBlocoVenda;

function renderFotosEdit() {
  const n = ed.fotos.length;
  $('#fotosEdit').innerHTML = ed.fotos.map((f, i) => `
    <div class="f">
      <img src="${f.url || urlFoto(f.path, true)}" alt="">
      ${i === 0 ? '<span class="capa">CAPA</span>' : ''}
      <div class="ctrl">
        <button type="button" data-mover="${i}" data-d="-1" ${i === 0 ? 'disabled style="opacity:.3"' : ''} title="Mover para a esquerda">◀</button>
        <button type="button" data-tirar="${i}" title="Remover">✕</button>
        <button type="button" data-mover="${i}" data-d="1" ${i === n - 1 ? 'disabled style="opacity:.3"' : ''} title="Mover para a direita">▶</button>
      </div>
    </div>`).join('') + '<div class="add" id="addFoto">+ Adicionar fotos</div>';
}

function adicionarArquivos(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    ed.fotos.push({ file, url: URL.createObjectURL(file) });
  }
  renderFotosEdit();
}

$('#fotosEdit').onclick = (e) => {
  if (e.target.closest('#addFoto')) return $('#inFotos').click();
  const m = e.target.closest('[data-mover]');
  if (m) {
    const i = Number(m.dataset.mover), j = i + Number(m.dataset.d);
    [ed.fotos[i], ed.fotos[j]] = [ed.fotos[j], ed.fotos[i]];
    return renderFotosEdit();
  }
  const t = e.target.closest('[data-tirar]');
  if (t) {
    const [f] = ed.fotos.splice(Number(t.dataset.tirar), 1);
    if (f.path) ed.removidas.push(f.path);
    if (f.url) URL.revokeObjectURL(f.url);
    renderFotosEdit();
  }
};
$('#inFotos').onchange = (e) => { adicionarArquivos(e.target.files); e.target.value = ''; };
document.addEventListener('paste', (e) => {
  if (!ed) return;
  const files = [...(e.clipboardData?.files || [])];
  if (files.length) { e.preventDefault(); adicionarArquivos(files); }
});
$('#fotosEdit').ondragover = (e) => e.preventDefault();
$('#fotosEdit').ondrop = (e) => { e.preventDefault(); adicionarArquivos(e.dataTransfer.files); };

// reduz a foto antes de enviar (economiza espaço e deixa o site rápido)
async function comprimir(file, max, qualidade) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const r = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * r); c.height = Math.round(bmp.height * r);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return new Promise((ok) => c.toBlob(ok, 'image/jpeg', qualidade));
}

async function enviarFoto(produtoId, file) {
  let grande, mini;
  try {
    grande = await comprimir(file, 1600, 0.82);
    mini = await comprimir(file, 480, 0.75);
  } catch {
    throw new Error(`Não consegui ler "${file.name}". Use JPG, PNG ou WEBP (fotos HEIC do iPhone não funcionam).`);
  }
  const base = `${produtoId}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const up1 = await sb.storage.from(BUCKET).upload(base + '.jpg', grande, { contentType: 'image/jpeg', cacheControl: '31536000' });
  if (up1.error) throw up1.error;
  const up2 = await sb.storage.from(BUCKET).upload(base + '_t.jpg', mini, { contentType: 'image/jpeg', cacheControl: '31536000' });
  if (up2.error) throw up2.error;
  return base + '.jpg';
}

const arquivosDe = (paths) => paths.flatMap((p) => [p, p.replace(/\.jpg$/, '_t.jpg')]);

$('#formProd').onsubmit = async (e) => {
  e.preventDefault();
  const nome = $('#f_nome').value.trim();
  if (!nome) return;
  const btn = $('#salvar');
  btn.disabled = true; $('#erroProd').textContent = '';
  try {
    const dados = {
      nome,
      categoria_id: $('#f_categoria').value || null,
      condicao: $('#f_condicao').value,
      status: $('#f_status').value,
      preco: num($('#f_preco').value),
      destaque: $('#f_destaque').checked,
      descricao: $('#f_descricao').value.trim(),
    };
    let id = ed.id;
    if (!id) {
      btn.textContent = 'Criando…';
      const r = await sb.from('produtos').insert({ ...dados, fotos: [] }).select('id').single();
      if (r.error) throw r.error;
      id = ed.id = r.data.id;
    }
    const caminhos = [];
    const novas = ed.fotos.filter((f) => f.file).length;
    let k = 0;
    for (const f of ed.fotos) {
      if (f.file) {
        btn.textContent = `Enviando foto ${++k}/${novas}…`;
        f.path = await enviarFoto(id, f.file);
        URL.revokeObjectURL(f.url); delete f.file; delete f.url;
      }
      caminhos.push(f.path);
    }
    btn.textContent = 'Salvando…';
    const r2 = await sb.from('produtos').update({ ...dados, fotos: caminhos }).eq('id', id);
    if (r2.error) throw r2.error;
    const vendido = dados.status === 'vendido';
    const r3 = await sb.from('produtos_privado').upsert({
      produto_id: id,
      custo: num($('#f_custo').value),
      onde_comprou: $('#f_onde').value.trim() || null,
      observacoes: $('#f_obs').value.trim() || null,
      preco_venda: vendido ? num($('#f_preco_venda').value) : null,
      vendido_em: vendido ? $('#f_vendido_em').value || null : null,
    });
    if (r3.error) throw r3.error;
    if (ed.removidas.length) await sb.storage.from(BUCKET).remove(arquivosDe(ed.removidas));
    fecharEditor();
    toast('Produto salvo ✔');
    await recarregar();
  } catch (err) {
    console.error(err);
    $('#erroProd').textContent = 'Erro: ' + (err.message || err);
  } finally {
    btn.disabled = false; btn.textContent = 'Salvar';
  }
};

$('#excluir').onclick = async () => {
  const p = E.produtos.find((x) => x.id === ed.id);
  if (!p || !confirm(`Excluir "${p.nome}" e todas as fotos? Não dá para desfazer.\n\nDica: se foi vendido, prefira mudar o status para "Vendido" — assim você mantém o histórico de lucro.`)) return;
  const paths = [...(p.fotos || []), ...ed.removidas];
  const { error } = await sb.from('produtos').delete().eq('id', p.id);
  if (error) return toast('Erro: ' + error.message, 5000);
  if (paths.length) await sb.storage.from(BUCKET).remove(arquivosDe(paths));
  fecharEditor();
  toast('Produto excluído');
  await recarregar();
};

$('#novo').onclick = () => abrirEditor();
$('#fechar').onclick = fecharEditor;
$('#cancelar').onclick = fecharEditor;
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ed) fecharEditor(); });

// ---------- exportar planilha (CSV que abre no Excel/Google Planilhas) ----------
$('#exportar').onclick = () => {
  const cab = ['Nome', 'Categoria', 'Condição', 'Status', 'Preço', 'Custo', 'Vendido por', 'Data venda', 'Onde comprei', 'Anotações', 'Descrição', 'Qtd fotos', 'Criado em'];
  const cel = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const n = (v) => (v == null ? '' : String(v).replace('.', ','));
  const linhas = E.produtos.map((p) => {
    const pv = priv(p);
    return [p.nome, nomeCat(p.categoria_id), p.condicao, STATUS[p.status]?.txt, n(p.preco), n(pv.custo), n(pv.preco_venda),
      pv.vendido_em || '', pv.onde_comprou || '', pv.observacoes || '', p.descricao, (p.fotos || []).length,
      p.criado_em?.slice(0, 10)].map(cel).join(';');
  });
  const blob = new Blob(['﻿' + [cab.map(cel).join(';'), ...linhas].join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `estoque_${hoje()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};

// ---------- categorias ----------
function renderCats() {
  const qtd = (id) => E.produtos.filter((p) => p.categoria_id === id).length;
  $('#listaCats').innerHTML = E.categorias.length ? E.categorias.map((c) => `
    <div class="cat-linha" data-id="${c.id}">
      <input value="${esc(c.nome)}" data-campo="nome" aria-label="Nome">
      <input type="number" value="${c.ordem}" data-campo="ordem" aria-label="Ordem">
      <button class="btn peq" data-salvar-cat>Salvar</button>
      <button class="btn peq perigo" data-excluir-cat title="${qtd(c.id)} produto(s)">Excluir <span class="qtd">(${qtd(c.id)})</span></button>
    </div>`).join('') : '<div class="vazio">Nenhuma categoria.</div>';
}

$('#formCat').onsubmit = async (e) => {
  e.preventDefault();
  const nome = $('#novaCat').value.trim(); if (!nome) return;
  const ordem = Math.max(0, ...E.categorias.filter((c) => c.ordem < 99).map((c) => c.ordem)) + 1;
  const { error } = await sb.from('categorias').insert({ nome, ordem });
  if (error) return toast(/duplicate|unique/i.test(error.message) ? 'Essa categoria já existe.' : 'Erro: ' + error.message, 5000);
  $('#novaCat').value = '';
  toast('Categoria criada');
  await recarregar();
};

$('#listaCats').onclick = async (e) => {
  const linha = e.target.closest('.cat-linha'); if (!linha) return;
  const id = linha.dataset.id;
  if (e.target.closest('[data-salvar-cat]')) {
    const nome = linha.querySelector('[data-campo=nome]').value.trim();
    const ordem = Number(linha.querySelector('[data-campo=ordem]').value) || 0;
    if (!nome) return;
    const { error } = await sb.from('categorias').update({ nome, ordem }).eq('id', id);
    if (error) return toast('Erro: ' + error.message, 5000);
    toast('Categoria salva'); await recarregar();
  }
  if (e.target.closest('[data-excluir-cat]')) {
    const c = E.categorias.find((x) => x.id === id);
    const q = E.produtos.filter((p) => p.categoria_id === id).length;
    if (!confirm(`Excluir a categoria "${c.nome}"?${q ? `\n\n${q} produto(s) vão ficar "Sem categoria".` : ''}`)) return;
    const { error } = await sb.from('categorias').delete().eq('id', id);
    if (error) return toast('Erro: ' + error.message, 5000);
    toast('Categoria excluída'); await recarregar();
  }
};

iniciar();
