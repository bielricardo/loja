import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { CONFIG } from './config.js';

export { CONFIG };

export const configurado =
  !CONFIG.SUPABASE_URL.includes('SEU-PROJETO') && !CONFIG.SUPABASE_KEY.includes('COLE_AQUI');

export const sb = configurado ? createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY) : null;

export const BUCKET = 'fotos';

// caminho salvo no banco → link público da foto (miniatura quando thumb = true)
export function urlFoto(caminho, thumb = false) {
  if (!caminho) return '';
  if (/^(https?:|data:|blob:)/.test(caminho)) return caminho;
  const p = thumb ? caminho.replace(/\.jpg$/, '_t.jpg') : caminho;
  return `${CONFIG.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${p}`;
}

export const brl = (v) =>
  v === null || v === undefined || v === ''
    ? '—'
    : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const STATUS = {
  rascunho:   { txt: 'Rascunho',   cor: 'cinza' },
  disponivel: { txt: 'Disponível', cor: 'verde' },
  reservado:  { txt: 'Reservado',  cor: 'amarelo' },
  vendido:    { txt: 'Vendido',    cor: 'azul' },
};

export function avisoNaoConfigurado(el) {
  el.innerHTML = `<div class="vazio"><h2>Falta configurar</h2>
    <p>Abra o arquivo <code>js/config.js</code> e preencha <b>SUPABASE_URL</b> e <b>SUPABASE_KEY</b>.
    O passo a passo está no arquivo <code>LEIAME.md</code>.</p></div>`;
}
