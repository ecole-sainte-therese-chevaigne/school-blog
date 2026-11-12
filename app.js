(() => {
  const $ = (selector) => document.querySelector(selector);
  const cards = $('#cards');
  const count = $('#count');
  const more = $('#more');
  const listing = $('#listing');
  const article = $('#article');
  const search = $('#search');
  const category = $('#category');
  const tag = $('#tag');
  const filterSummary = $('#filter-summary');

  let all = [];
  let shown = 12;
  let selected = null;

  function reportFrameHeight() {
    if (window.parent === window) return;

    const content = document.querySelector('.wrap');
    if (!content) return;
    const height = Math.ceil(content.getBoundingClientRect().height);
    let targetOrigin = '*';
    try {
      if (document.referrer) targetOrigin = new URL(document.referrer).origin;
    } catch (error) {
      // Keep the wildcard fallback; the parent widget validates the sender.
    }
    window.parent.postMessage({ type: 'school-blog-height', height }, targetOrigin);
  }

  let heightFrame = 0;
  function scheduleHeightReport() {
    cancelAnimationFrame(heightFrame);
    heightFrame = requestAnimationFrame(reportFrameHeight);
  }

  const blogContent = document.querySelector('.wrap');
  if ('ResizeObserver' in window && blogContent) {
    new ResizeObserver(scheduleHeightReport).observe(blogContent);
  }
  window.addEventListener('load', scheduleHeightReport);

  const mediaSrc = (media) => typeof media === 'string' ? media : (media?.src || '');
  const mediaAlt = (media, title) => typeof media === 'string' ? title : (media?.alt || title);
  const mediaName = (media) => typeof media === 'string'
    ? decodeURIComponent(media.split('/').pop())
    : (media?.name || 'Ouvrir le document');

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));

  const dateFmt = (date) => {
    if (!date) return 'Date non précisée';
    const [year, month, day] = date.split('-').map(Number);
    const monthName = new Intl.DateTimeFormat('fr-FR', {
      month: 'long',
      timeZone: 'UTC'
    }).format(new Date(Date.UTC(year, month - 1, day)));
    return `${String(day).padStart(2, '0')}. ${monthName} ${year}`;
  };

  const photoPeriod = (post) => {
    const dates = post.photoDates || [];
    if (dates.length > 1 && dates[0] !== dates[dates.length - 1]) {
      return `<p class="photo-period">Photos prises du ${esc(dateFmt(dates[0]))} au ${esc(dateFmt(dates[dates.length - 1]))}</p>`;
    }
    return '';
  };

  const meta = (post) => {
    const categoryLabel = post.category
      ? `<span class="category-label">${esc(post.category)}</span>`
      : '';
    const separator = post.category && post.date ? '<span class="meta-separator" aria-hidden="true">·</span>' : '';
    const date = post.date
      ? `<time class="date" datetime="${esc(post.date)}">${esc(dateFmt(post.date))}</time>`
      : '<span class="date">Date non précisée</span>';
    return `<p class="meta">${categoryLabel}${separator}${date}</p>`;
  };

  function fill(select, values, label) {
    select.innerHTML = `<option value="">${label}</option>`
      + values.map((value) => `<option value="${esc(value)}">${esc(value)}</option>`).join('');
  }

  function filtered() {
    const query = search.value.trim().toLocaleLowerCase('fr');
    return all
      .filter((post) => (
        (!category.value || post.category === category.value)
        && (!tag.value || (post.tags || []).includes(tag.value))
        && (!query || [post.title, post.description, post.content, post.category, ...(post.tags || [])]
          .join(' ')
          .toLocaleLowerCase('fr')
          .includes(query))
      ))
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.title.localeCompare(b.title, 'fr'));
  }

  function card(post) {
    const image = mediaSrc(post.photos?.[0]);
    const cover = image
      ? `<img class="cover" loading="lazy" src="${esc(image)}" alt="${esc(mediaAlt(post.photos[0], post.title))}">`
      : '';
    const description = post.description
      ? `<p class="description">${esc(post.description)}</p>`
      : '';

    return `<article class="card">
      <div class="card-body">
        ${meta(post)}
        ${photoPeriod(post)}
        <h2><a href="#${encodeURIComponent(post.id)}" data-open="${esc(post.id)}">${esc(post.title)}</a></h2>
        ${cover}
        ${description}
        <a class="open" href="#${encodeURIComponent(post.id)}" data-open="${esc(post.id)}">Lire la suite…</a>
      </div>
    </article>`;
  }

  function render() {
    if (selected) return;
    const items = filtered();
    cards.innerHTML = items.slice(0, shown).map(card).join('')
      || '<p class="empty">Aucun article ne correspond à votre recherche.</p>';
    count.textContent = `${items.length} article${items.length > 1 ? 's' : ''}`;
    more.hidden = shown >= items.length;
    filterSummary.textContent = category.value
      ? `Rubrique : ${category.value} · modifier les filtres`
      : 'Rechercher ou filtrer les articles';
    scheduleHeightReport();
  }

  function openArticle(id) {
    selected = all.find((post) => post.id === id);
    if (!selected) return;

    listing.hidden = true;
    article.hidden = false;
    const post = selected;
    const description = !post.content && post.description
      ? `<p class="description">${esc(post.description)}</p>`
      : '';

    article.innerHTML = `<div class="article-detail">
      <button class="back" id="back" type="button">← Retour aux articles</button>
      ${meta(post)}
      ${photoPeriod(post)}
      <h2>${esc(post.title)}</h2>
      ${description}
      ${post.content ? `<div class="article-content">${esc(post.content)}</div>` : ''}
      ${post.documents?.length ? `<h3>Documents</h3><ul class="docs">${post.documents.map((document) => (
        `<li><a href="${esc(mediaSrc(document))}" target="_blank" rel="noopener">${esc(mediaName(document))}</a></li>`
      )).join('')}</ul>` : ''}
      ${post.photos?.length ? `<h3>Photos</h3><div class="gallery">${post.photos.map((image) => (
        `<a href="${esc(mediaSrc(image))}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(mediaSrc(image))}" alt="${esc(mediaAlt(image, post.title))}"></a>`
      )).join('')}</div>` : ''}
    </div>`;

    window.scrollTo(0, 0);
    $('#back').onclick = closeArticle;
    history.pushState({ post: id }, '', `#${encodeURIComponent(id)}`);
    scheduleHeightReport();
  }

  function closeArticle() {
    selected = null;
    article.hidden = true;
    listing.hidden = false;
    article.innerHTML = '';
    if (location.hash) history.replaceState({}, '', location.pathname + location.search);
    render();
    scheduleHeightReport();
  }

  cards.addEventListener('click', (event) => {
    const openButton = event.target.closest('[data-open]');
    if (openButton) {
      event.preventDefault();
      openArticle(openButton.dataset.open);
    }
  });

  [search, category, tag].forEach((control) => {
    control.addEventListener('input', () => {
      shown = 12;
      render();
    });
    control.addEventListener('change', () => {
      shown = 12;
      render();
    });
  });

  more.onclick = () => {
    shown += 12;
    render();
  };

  window.addEventListener('popstate', () => {
    if (selected) closeArticle();
  });

  fetch('./data/posts.json')
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => {
      all = data.posts || [];
      fill(category, [...new Set(all.map((post) => post.category).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'fr')), 'Toutes les rubriques');
      fill(tag, [...new Set(all.flatMap((post) => post.tags || []))]
        .sort((a, b) => a.localeCompare(b, 'fr')), 'Tous les tags');
      const requestedCategory = new URLSearchParams(window.location.search).get('category');
      if (requestedCategory) {
        const matchingCategory = Array.from(category.options).find((option) =>
          option.value.toLocaleLowerCase('fr') === requestedCategory.trim().toLocaleLowerCase('fr')
        );
        if (matchingCategory) category.value = matchingCategory.value;
      }
      render();
      if (location.hash) openArticle(decodeURIComponent(location.hash.slice(1)));
    })
    .catch((error) => {
      cards.innerHTML = '<p class="empty">Les articles ne sont pas disponibles pour le moment. Vérifiez le déploiement GitHub Pages.</p>';
      console.error(error);
      scheduleHeightReport();
    });
})();
