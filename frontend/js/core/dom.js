// core/dom.js
// Utilidades de DOM reutilizables

/**
 * Carga una vista HTML en #main-content y retorna el elemento raíz.
 * Maneja estado de carga y errores de forma uniforme.
 */
export async function loadViewHtml(viewName) {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="content-box" style="text-align:center; padding:2rem;">
      <div style="font-size:2rem; margin-bottom:1rem;">
        <i class="fas fa-spinner fa-spin"></i>
      </div>
      <p>Cargando ${viewName}...</p>
    </div>`;
  try {
    const res = await fetch(`views/${viewName}.html`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    main.innerHTML = html;
    return main;
  } catch (err) {
    main.innerHTML = `
      <div class="content-box">
        <h1>Error</h1>
        <p>No se pudo cargar la vista: ${viewName}</p>
        <p>${err.message}</p>
        <button class="btn btn-primary" id="volverInicioBtn">Volver al Inicio</button>
      </div>`;
    document.getElementById('volverInicioBtn')?.addEventListener('click', () => window.location.reload());
    throw err;
  }
}

/**
 * Mejora todos los <select.form-select> bajo el nodo dado.
 */
export function enhanceAllSelects(root = document) {
  if (!window.__selectEnhancerBound) {
    window.addEventListener('click', () => {
      document.querySelectorAll('.select-dropdown.open').forEach(d => {
        d.classList.remove('open');
        const t = d.parentElement?.querySelector?.('.select-trigger');
        if (t) t.setAttribute('aria-expanded', 'false');
      });
    });
    window.__selectEnhancerBound = true;
  }
  const selects = Array.from(root.querySelectorAll('select.form-select'))
    .filter(sel => sel.getAttribute('data-no-enhance') !== 'true');
  selects.forEach(enhanceSelect);
}

export function enhanceSelect(selectEl) {
  if (!selectEl || selectEl.dataset.enhanced === 'true') return;
  const wrapper = document.createElement('div');
  wrapper.className = 'select-enhanced';
  const parent = selectEl.parentNode; if (!parent) return;
  parent.insertBefore(wrapper, selectEl);
  wrapper.appendChild(selectEl);

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'select-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.textContent = selectEl.options[selectEl.selectedIndex]?.text || 'Seleccionar';
  wrapper.appendChild(trigger);

  const dropdown = document.createElement('div');
  dropdown.className = 'select-dropdown';
  dropdown.setAttribute('role', 'listbox');
  wrapper.appendChild(dropdown);

  Array.from(selectEl.options).forEach(opt => {
    const optEl = document.createElement('div');
    optEl.className = 'select-option';
    optEl.textContent = opt.text;
    optEl.setAttribute('data-value', opt.value);
    if (opt.disabled) optEl.setAttribute('aria-disabled', 'true');
    if (opt.selected) optEl.setAttribute('aria-selected', 'true');
    dropdown.appendChild(optEl);

    optEl.addEventListener('click', (e) => {
      e.stopPropagation();
      if (opt.disabled) return;
      selectEl.value = opt.value;
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      dropdown.querySelectorAll('.select-option[aria-selected="true"]').forEach(el => el.removeAttribute('aria-selected'));
      optEl.setAttribute('aria-selected', 'true');
      trigger.textContent = opt.text;
      dropdown.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    });
  });

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.toggle('open');
    trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  selectEl.addEventListener('change', () => {
    const opt = selectEl.options[selectEl.selectedIndex];
    trigger.textContent = opt?.text || 'Seleccionar';
  });

  selectEl.dataset.enhanced = 'true';
}

/**
 * Refresca las opciones visibles de un select previamente mejorado
 * leyendo nuevamente las opciones del <select> nativo.
 */
export function refreshEnhancedSelect(selectEl) {
  if (!selectEl || selectEl.dataset.enhanced !== 'true') return;
  const wrapper = selectEl.parentElement;
  if (!wrapper) return;
  const dropdown = wrapper.querySelector('.select-dropdown');
  const trigger = wrapper.querySelector('.select-trigger');
  if (!dropdown || !trigger) return;

  dropdown.innerHTML = '';
  Array.from(selectEl.options).forEach(opt => {
    const optEl = document.createElement('div');
    optEl.className = 'select-option';
    optEl.textContent = opt.text;
    optEl.setAttribute('data-value', opt.value);
    if (opt.disabled) optEl.setAttribute('aria-disabled', 'true');
    if (opt.selected) optEl.setAttribute('aria-selected', 'true');
    dropdown.appendChild(optEl);
    optEl.addEventListener('click', (e) => {
      e.stopPropagation();
      if (opt.disabled) return;
      selectEl.value = opt.value;
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      dropdown.querySelectorAll('.select-option[aria-selected="true"]').forEach(el => el.removeAttribute('aria-selected'));
      optEl.setAttribute('aria-selected', 'true');
      trigger.textContent = opt.text;
      dropdown.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    });
  });
  const current = selectEl.options[selectEl.selectedIndex];
  trigger.textContent = current?.text || 'Seleccionar';
}

export function refreshAllEnhancedSelects(root = document) {
  Array.from(root.querySelectorAll('select.form-select[data-enhanced="true"]'))
    .forEach(refreshEnhancedSelect);
}
