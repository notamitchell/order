/* EAC-CPF 2.0 builder and renderer, used by form2 (_layouts/form2.html).

     EACCPF.build(entry)   → XML string for one entry (see the shape below).
     EACCPF.check(entry)   → list of warnings for the contributor, e.g. a date
                             with no year in it. Nothing here blocks sending.
     EACCPF.render(xml)    → HTML preview of an EAC-CPF 2.0 record, read back
                             from the XML so it shows exactly what was built.
     EACCPF.narrative(html)→ the article (HTML from the Quill editor) as
                             2.0 biogHist sections: <p>, <list>, <chronList>.

   EAC-CPF 2.0 namespace: https://archivists.org/ns/eac/v2. Today's entries in
   civic/ use the 2010 version and are still shown by _layouts/entry.html.

   entry = {
     recordId, title,
     kind: 'person' | 'corporateBody' | 'family' | 'topic' | '',
     surname, forenames,                     // people only, optional
     authors: ['Name', ...], date: 'YYYY-MM-DD',
     dates: { from, to, approximate },
     otherNames:     [{ name, from, to }],
     places:         [{ address, role, from, to, lat, lng }],
     occupations:    [{ term, from, to }],   // functions for organisations
     legalStatuses:  [{ term, from, to }],
     chronology:     [{ date, event, place }],
     relations:      [{ name, targetType, relationType, href, from, to }],
     sources:        [{ text, href }],
     articleHtml, note
   }
*/
window.EACCPF = (function () {
  const NS = 'https://archivists.org/ns/eac/v2';
  const AGENCY = { code: 'AU-EMEL', name: 'eMelbourne - The Encyclopedia of Melbourne Online' };
  // Rough centre of Carlton, for the "is this coordinate nearby?" check
  const CARLTON = { lat: -37.800, lng: 144.967 };

  const has = (v) => v !== undefined && v !== null && String(v).trim() !== '';
  const trim = (v) => (has(v) ? String(v).trim() : '');
  const filled = (rows, ...keys) => (rows || []).filter((r) => keys.some((k) => has(r[k])));

  /* ---------- Dates ----------
     People type dates loosely ("c. 1856", "March 1856", "1856-03-04").
     standardDate is only set when we can read an ISO date or a year. */
  const APPROX = /\b(c\.?|ca\.?|circa|about|around|approx\.?)\s*(?=\d)|~|\?/i;

  function parseDate(text) {
    const t = trim(text);
    if (!t) return null;
    let standard = '';
    const iso = t.match(/^(\d{4})(-\d{2})?(-\d{2})?$/);
    if (iso) standard = t;
    else {
      const year = t.match(/\b(1[5-9]\d\d|20\d\d)\b/);
      if (year) standard = year[1];
    }
    return { text: t, standard, approximate: APPROX.test(t) };
  }

  /* ---------- A tiny DOM writer, so escaping is always right ---------- */
  function writer() {
    const doc = document.implementation.createDocument(NS, 'eac', null);
    function el(name, attrs, ...children) {
      const node = doc.createElementNS(NS, name);
      for (const [k, v] of Object.entries(attrs || {})) {
        if (has(v)) node.setAttribute(k, String(v));
      }
      append(node, children);
      return node;
    }
    function append(node, children) {
      for (const c of children.flat(Infinity)) {
        if (c === null || c === undefined || c === false || c === '') continue;
        node.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c);
      }
      return node;
    }
    return { doc, el, append };
  }

  /* date / dateRange from two loosely typed dates */
  function dateEls(el, from, to, forceApprox) {
    const f = parseDate(from);
    const t = parseDate(to);
    const attrs = (d) => ({
      standardDate: d.standard,
      certainty: (forceApprox || d.approximate) ? 'approximate' : ''
    });
    if (f && t) return el('dateRange', null, el('fromDate', attrs(f), f.text), el('toDate', attrs(t), t.text));
    if (f) return el('dateRange', null, el('fromDate', attrs(f), f.text));
    if (t) return el('dateRange', null, el('toDate', attrs(t), t.text));
    return null;
  }

  function singleDate(el, text) {
    const d = parseDate(text);
    if (!d) return null;
    return el('date', { standardDate: d.standard, certainty: d.approximate ? 'approximate' : '' }, d.text);
  }

  /* ---------- Article: Quill HTML → biogHist sections ----------
     Each heading starts a new biogHist with that heading as its <head>.
     Bold / italic / underline become <span style>, links become <reference>.
     A pasted table becomes a <chronList> when its first column holds years,
     otherwise a <list> with one item per row. */
  const STYLE = { STRONG: 'font-weight:bold', B: 'font-weight:bold', EM: 'font-style:italic', I: 'font-style:italic', U: 'text-decoration:underline' };

  function narrative(html, el) {
    const src = new DOMParser().parseFromString(`<body>${html || ''}</body>`, 'text/html').body;
    const sections = [];
    let current = { head: '', blocks: [] };
    const flush = () => { if (current.head || current.blocks.length) sections.push(current); };

    // Inline content → array of strings / <span> / <reference>
    function inline(node, styles, inLink) {
      const out = [];
      for (const child of node.childNodes) {
        if (child.nodeType === 3) {
          const text = child.textContent.replace(/ /g, ' ');
          if (!text) continue;
          out.push(styles.length ? el('span', { style: styles.join(';') }, text) : text);
        } else if (child.nodeType === 1) {
          const tag = child.tagName;
          if (tag === 'BR') { out.push(' '); continue; }
          if (tag === 'A' && !inLink && has(child.getAttribute('href'))) {
            out.push(el('reference', { href: child.getAttribute('href') }, inline(child, styles, true)));
            continue;
          }
          const next = STYLE[tag] && !styles.includes(STYLE[tag]) ? styles.concat(STYLE[tag]) : styles;
          out.push(...inline(child, next, inLink));
        }
      }
      return out;
    }
    const isBlank = (parts) => parts.every((p) => typeof p === 'string' ? !p.trim() : !p.textContent.trim());

    function table(node) {
      const rows = [...node.querySelectorAll('tr')]
        .map((tr) => [...tr.children].map((td) => td.textContent.replace(/ /g, ' ').trim()))
        .filter((cells) => cells.some(Boolean));
      if (!rows.length) return null;
      const yearFirst = rows.filter((r) => /^\s*(1[5-9]\d\d|20\d\d)\b/.test(r[0])).length;
      if (yearFirst >= Math.ceil(rows.length / 2)) {
        return el('chronList', null, rows.map((r) => {
          const date = /^\s*(1[5-9]\d\d|20\d\d)\b/.test(r[0]) ? r[0] : '';
          const rest = (date ? r.slice(1) : r).filter(Boolean).join('; ');
          return el('chronItem', null, singleDate(el, date) || el('date', { status: 'unknown' }, 'Undated'), el('event', null, rest || r[0]));
        }));
      }
      return el('list', { listType: 'unordered' }, rows.map((r) => el('item', null, r.filter(Boolean).join('; '))));
    }

    function block(node) {
      if (node.nodeType === 3) {
        if (node.textContent.trim()) current.blocks.push(el('p', null, node.textContent.trim()));
        return;
      }
      if (node.nodeType !== 1) return;
      const tag = node.tagName;
      if (/^H[1-6]$/.test(tag)) {
        flush();
        current = { head: node.textContent.replace(/ /g, ' ').trim(), blocks: [] };
      } else if (tag === 'UL' || tag === 'OL') {
        const items = [...node.children].filter((li) => li.tagName === 'LI')
          .map((li) => inline(li, [], false)).filter((parts) => !isBlank(parts));
        if (items.length) {
          current.blocks.push(el('list', { listType: tag === 'OL' ? 'ordered' : 'unordered' },
            items.map((parts) => el('item', null, parts))));
        }
      } else if (tag === 'TABLE') {
        const t = table(node);
        if (t) current.blocks.push(t);
      } else if (node.querySelector && node.querySelector('table')) {
        // Quill wraps pasted tables in <div class="ql-table-embed">
        [...node.childNodes].forEach(block);
      } else {
        const parts = inline(node, [], false);
        if (!isBlank(parts)) current.blocks.push(el('p', null, parts));
      }
    }

    [...src.childNodes].forEach(block);
    flush();
    return sections;
  }

  /* ---------- Build the record ---------- */
  function build(entry) {
    const { doc, el } = writer();
    const root = doc.documentElement;
    const kind = entry.kind || '';
    // EAC-CPF only knows people, families and corporate bodies. Topics,
    // streets and entries with no type given are recorded as corporate
    // bodies, marked with identity/@localType so they can be found later.
    const entityType = ['person', 'family', 'corporateBody'].includes(kind) ? kind : 'corporateBody';
    const identityLocalType = kind === 'topic' ? 'topic' : (kind ? '' : 'notStated');
    const today = entry.date || new Date().toISOString().slice(0, 10);
    const authors = (entry.authors || []).map(trim).filter(Boolean);

    // control
    const sources = filled(entry.sources, 'text', 'href');
    root.appendChild(el('control', { maintenanceStatus: 'new' },
      el('recordId', null, trim(entry.recordId) || 'unassigned'),
      el('maintenanceAgency', null, el('agencyCode', null, AGENCY.code), el('agencyName', null, AGENCY.name)),
      el('maintenanceHistory', null, (authors.length ? authors : ['Unknown']).map((name, i) =>
        el('maintenanceEvent', { maintenanceEventType: 'created' },
          el('agent', { agentType: 'human' }, name),
          el('eventDateTime', { standardDateTime: today }, today),
          el('eventDescription', null, i === 0
            ? (trim(entry.note) || 'Public contribution via the contribution form (form2)')
            : 'Co-author of the public contribution')))),
      sources.length ? el('sources', null, sources.map((s) =>
        el('source', { href: trim(s.href) }, el('reference', { href: trim(s.href) }, trim(s.text) || trim(s.href))))) : null,
      el('languageDeclaration', { languageCode: 'eng', scriptCode: 'Latn' })
    ));

    // identity
    const title = trim(entry.title);
    const others = filled(entry.otherNames, 'name');
    const mainParts = kind === 'person' && (has(entry.surname) || has(entry.forenames))
      ? [has(entry.surname) ? el('part', { localType: 'surname' }, trim(entry.surname)) : null,
         has(entry.forenames) ? el('part', { localType: 'forename' }, trim(entry.forenames)) : null]
      : [el('part', null, title || 'Untitled')];
    const identity = el('identity', { localType: identityLocalType },
      el('entityType', { value: entityType }),
      el('nameEntry', { status: others.length ? 'authorized' : '' }, mainParts),
      others.map((n) => el('nameEntry', { status: 'alternative' },
        el('part', null, trim(n.name)),
        (has(n.from) || has(n.to)) ? el('useDates', null, dateEls(el, n.from, n.to)) : null))
    );

    // description, in the order the schema wants
    const occupations = filled(entry.occupations, 'term');
    const legal = filled(entry.legalStatuses, 'term');
    const places = filled(entry.places, 'address', 'lat', 'lng');
    const chron = filled(entry.chronology, 'event');
    const term = (name, r) => el(name, null, el('term', null, trim(r.term)), dateEls(el, r.from, r.to));
    const existDates = dateEls(el, entry.dates && entry.dates.from, entry.dates && entry.dates.to, entry.dates && entry.dates.approximate);

    const descChildren = [
      kind === 'corporateBody' && occupations.length ? el('functions', null, occupations.map((r) => term('function', r))) : null,
      legal.length ? el('legalStatuses', null, legal.map((r) => term('legalStatus', r))) : null,
      kind !== 'corporateBody' && occupations.length ? el('occupations', null, occupations.map((r) => term('occupation', r))) : null,
      places.length ? el('places', null, places.map((p) => el('place', null,
        has(p.address) ? el('placeName', null, trim(p.address)) : null,
        has(p.role) ? el('placeRole', null, trim(p.role)) : null,
        has(p.lat) && has(p.lng) ? el('geographicCoordinates', { coordinateSystem: 'WGS84' }, `${trim(p.lat)} ${trim(p.lng)}`) : null,
        dateEls(el, p.from, p.to)))) : null,
      existDates ? el('existDates', null, existDates) : null,
      narrative(entry.articleHtml, el).map((s) => el('biogHist', null, s.head ? el('head', null, s.head) : null, s.blocks)),
      chron.length ? el('biogHist', null, el('head', null, 'Chronology'), el('chronList', null, chron.map((c) =>
        el('chronItem', null, singleDate(el, c.date) || el('date', { status: 'unknown' }, 'Undated'),
          el('event', null, trim(c.event)),
          has(c.place) ? el('place', null, el('placeName', null, trim(c.place))) : null)))) : null
    ].flat().filter(Boolean);

    const relations = filled(entry.relations, 'name');
    root.appendChild(el('cpfDescription', null,
      identity,
      descChildren.length ? el('description', null, descChildren) : null,
      relations.length ? el('relations', null, relations.map((r) => el('relation', null,
        el('targetEntity', { targetType: r.targetType || 'resource', valueURI: trim(r.href) }, el('part', null, trim(r.name))),
        dateEls(el, r.from, r.to),
        has(r.relationType) ? el('relationType', null, trim(r.relationType)) : null))) : null
    ));

    return '<?xml version="1.0" encoding="UTF-8"?>\n' + pretty(root, 0) + '\n';
  }

  /* Indent elements that hold only elements; keep mixed content on one line. */
  const MIXED = new Set(['p', 'item', 'event', 'head', 'reference', 'span', 'eventDescription']);
  function pretty(node, depth) {
    const pad = '  '.repeat(depth);
    const kids = [...node.childNodes];
    const s = new XMLSerializer();
    let open = s.serializeToString(node.cloneNode(false)).replace(/\s*\/>$|><\/[^>]+>$/, '');
    if (depth > 0) open = open.replace(` xmlns="${NS}"`, '');
    const name = node.localName;
    if (!kids.length) return `${pad}${open}/>`;
    if (MIXED.has(name) || kids.some((k) => k.nodeType === 3)) {
      const inner = kids.map((k) => s.serializeToString(k)).join('').replace(/ xmlns="[^"]*"/g, '');
      return `${pad}${open}>${inner}</${name}>`;
    }
    return `${pad}${open}>\n${kids.map((k) => pretty(k, depth + 1)).join('\n')}\n${pad}</${name}>`;
  }

  /* ---------- Checks shown to the contributor ---------- */
  function check(entry) {
    const out = [];
    const need = (v, msg) => { if (!has(v)) out.push({ level: 'error', text: msg }); };
    need(entry.authors && entry.authors[0], 'Add your name.');
    need(entry.title, 'Add a title.');
    if (!trim((new DOMParser().parseFromString(entry.articleHtml || '', 'text/html').body.textContent))) {
      out.push({ level: 'error', text: 'Write some article text.' });
    }

    const dateCheck = (label, from, to) => {
      const f = parseDate(from); const t = parseDate(to);
      [f, t].forEach((d) => {
        if (d && !d.standard) out.push({ level: 'warn', text: `${label}: we couldn't find a year in "${d.text}".` });
        const y = d && Number(d.standard.slice(0, 4));
        if (y && (y < 1800 || y > new Date().getFullYear())) out.push({ level: 'warn', text: `${label}: ${y} looks unusual for Carlton. Is it right?` });
      });
      if (f && t && f.standard && t.standard && f.standard.slice(0, 4) > t.standard.slice(0, 4)) {
        out.push({ level: 'warn', text: `${label}: the end date is before the start date.` });
      }
    };
    if (entry.dates) dateCheck('Dates', entry.dates.from, entry.dates.to);
    filled(entry.otherNames, 'name').forEach((n) => dateCheck(`Other name "${trim(n.name)}"`, n.from, n.to));
    filled(entry.occupations, 'term').forEach((n) => dateCheck(`"${trim(n.term)}"`, n.from, n.to));
    filled(entry.legalStatuses, 'term').forEach((n) => dateCheck(`"${trim(n.term)}"`, n.from, n.to));
    filled(entry.chronology, 'date', 'event').forEach((c) => {
      if (!has(c.event)) out.push({ level: 'warn', text: `Chronology: the row dated "${trim(c.date)}" has no event, so it's left out.` });
      else dateCheck('Chronology', c.date, '');
    });

    filled(entry.places, 'address', 'lat', 'lng').forEach((p) => {
      const label = `Address "${trim(p.address) || 'without a name'}"`;
      dateCheck(label, p.from, p.to);
      if (has(p.lat) !== has(p.lng)) out.push({ level: 'warn', text: `${label}: give both latitude and longitude, or neither.` });
      if (has(p.lat) && has(p.lng)) {
        const lat = Number(p.lat); const lng = Number(p.lng);
        if (!isFinite(lat) || !isFinite(lng)) out.push({ level: 'warn', text: `${label}: coordinates should be numbers, like -37.8004 144.9671.` });
        else if (Math.hypot((lat - CARLTON.lat) * 111, (lng - CARLTON.lng) * 88) > 5) {
          out.push({ level: 'warn', text: `${label}: these coordinates are more than 5 km from Carlton.` });
        }
      }
    });

    const urlOk = (u) => /^https?:\/\/\S+$/i.test(trim(u));
    filled(entry.sources, 'href').forEach((s) => {
      if (!urlOk(s.href)) out.push({ level: 'warn', text: `Source link "${trim(s.href)}" should start with http:// or https://.` });
    });
    filled(entry.relations, 'name', 'href').forEach((r) => {
      if (!has(r.name)) out.push({ level: 'warn', text: 'Related entry: a row has a link but no name, so it\'s left out.' });
      if (has(r.href) && !urlOk(r.href)) out.push({ level: 'warn', text: `Related entry "${trim(r.name)}": the link should start with http:// or https://.` });
    });
    return out;
  }

  /* ---------- Render a 2.0 record back to HTML ---------- */
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function render(xmlText) {
    const xml = new DOMParser().parseFromString(xmlText, 'application/xml');
    if (xml.querySelector('parsererror')) return '<p>The XML could not be read.</p>';
    const all = (ctx, name) => [...ctx.getElementsByTagNameNS(NS, name)];
    const kids = (ctx, name) => [...ctx.children].filter((c) => c.localName === name);
    const one = (ctx, name) => all(ctx, name)[0];
    const text = (ctx, name) => (ctx && one(ctx, name) ? one(ctx, name).textContent.trim() : '');

    function mixed(node) {
      return [...node.childNodes].map((c) => {
        if (c.nodeType === 3) return esc(c.textContent);
        if (c.localName === 'span') {
          const st = c.getAttribute('style') || '';
          let h = esc(c.textContent);
          if (/italic/.test(st)) h = `<em>${h}</em>`;
          if (/bold/.test(st)) h = `<strong>${h}</strong>`;
          if (/underline/.test(st)) h = `<u>${h}</u>`;
          return h;
        }
        if (c.localName === 'reference') {
          const href = c.getAttribute('href');
          return href && /^https?:/i.test(href) ? `<a href="${esc(href)}" target="_blank" rel="noopener">${mixed(c)}</a>` : mixed(c);
        }
        return esc(c.textContent);
      }).join('');
    }
    function dates(ctx) {
      if (!ctx) return '';
      const range = kids(ctx, 'dateRange')[0];
      if (range) {
        const f = text(range, 'fromDate'); const t = text(range, 'toDate');
        if (f && f === t) return f;
        return f && t ? `${f} – ${t}` : f ? `from ${f}` : `until ${t}`;
      }
      return text(ctx, 'date');
    }
    const withDates = (label, ctx) => { const d = dates(ctx); return d ? `${esc(label)} <span class="pv-dates">(${esc(d)})</span>` : esc(label); };

    const identity = one(xml, 'identity');
    const names = all(identity, 'nameEntry');
    const nameOf = (n) => {
      const parts = all(n, 'part');
      const sur = parts.find((p) => p.getAttribute('localType') === 'surname');
      const fore = parts.find((p) => p.getAttribute('localType') === 'forename');
      if (sur || fore) return [fore, sur].filter(Boolean).map((p) => p.textContent.trim()).join(' ');
      return parts.map((p) => p.textContent.trim()).join(' ');
    };
    const main = names.find((n) => n.getAttribute('status') !== 'alternative') || names[0];
    const alt = names.filter((n) => n !== main);
    const type = one(identity, 'entityType')?.getAttribute('value') || '';
    const localType = identity.getAttribute('localType');
    const typeLabel = localType === 'topic' ? 'Place, street or topic'
      : localType === 'notStated' ? 'Type not given'
      : ({ person: 'Person', corporateBody: 'Business or organisation', family: 'Family' }[type] || '');

    const desc = one(xml, 'description');
    const exist = desc && kids(desc, 'existDates')[0];
    const facts = [];
    if (desc) {
      all(desc, 'occupation').forEach((o) => facts.push(['Occupation', withDates(text(o, 'term'), o)]));
      all(desc, 'function').forEach((o) => facts.push(['What it did', withDates(text(o, 'term'), o)]));
      all(desc, 'legalStatus').forEach((o) => facts.push(['Legal status', withDates(text(o, 'term'), o)]));
      kids(one(desc, 'places') || desc, 'place').forEach((p) => {
        const coords = text(p, 'geographicCoordinates');
        facts.push([text(p, 'placeRole') || 'Address', withDates(text(p, 'placeName') || coords, p) + (coords ? ` <span class="pv-dates">· ${esc(coords)}</span>` : '')]);
      });
    }
    alt.forEach((n) => facts.push(['Also known as', withDates(nameOf(n), kids(n, 'useDates')[0])]));

    const body = (desc ? kids(desc, 'biogHist') : []).map((b) => {
      const head = kids(b, 'head')[0];
      const inner = [...b.children].map((c) => {
        if (c.localName === 'p') return `<p>${mixed(c)}</p>`;
        if (c.localName === 'list') {
          const tag = c.getAttribute('listType') === 'ordered' ? 'ol' : 'ul';
          return `<${tag}>${kids(c, 'item').map((i) => `<li>${mixed(i)}</li>`).join('')}</${tag}>`;
        }
        if (c.localName === 'chronList') {
          return `<table class="pv-chron"><tbody>${kids(c, 'chronItem').map((i) =>
            `<tr><th scope="row">${esc(dates(i))}</th><td>${mixed(kids(i, 'event')[0])}${text(i, 'placeName') ? ` <span class="pv-dates">(${esc(text(i, 'placeName'))})</span>` : ''}</td></tr>`).join('')}</tbody></table>`;
        }
        return '';
      }).join('');
      return `${head ? `<h2>${mixed(head)}</h2>` : ''}${inner}`;
    }).join('');

    const relations = all(xml, 'relation').map((r) => {
      const target = kids(r, 'targetEntity')[0];
      const name = target ? [...target.children].map((p) => p.textContent.trim()).join(' ') : '';
      const href = target?.getAttribute('valueURI');
      const label = href && /^https?:/i.test(href) ? `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(name)}</a>` : esc(name);
      const rt = text(r, 'relationType');
      const d = dates(r);
      return `<li>${label}${rt ? ` <span class="pv-dates">${esc(rt)}</span>` : ''}${d ? ` <span class="pv-dates">(${esc(d)})</span>` : ''}</li>`;
    }).join('');

    const sources = all(one(xml, 'control'), 'source').map((s) => {
      const ref = kids(s, 'reference')[0];
      const href = ref && ref.getAttribute('href');
      return `<li>${ref ? (href && /^https?:/i.test(href) ? `<a href="${esc(href)}" target="_blank" rel="noopener">${mixed(ref)}</a>` : mixed(ref)) : ''}</li>`;
    }).join('');
    const authors = all(xml, 'agent').map((a) => a.textContent.trim()).filter((a) => a !== 'Unknown');

    return `
      <article class="pv-entry">
        <p class="pv-type">${esc(typeLabel)}</p>
        <h1>${esc(main ? nameOf(main) : '')}</h1>
        ${exist ? `<p class="pv-life">${esc(dates(exist))}</p>` : ''}
        ${facts.length ? `<dl class="pv-facts">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>` : ''}
        <div class="pv-body">${body || '<p><em>No article text yet.</em></p>'}</div>
        ${relations ? `<h2>Related</h2><ul>${relations}</ul>` : ''}
        ${sources ? `<h2>References</h2><ul>${sources}</ul>` : ''}
        ${authors.length ? `<p class="pv-by">By ${esc(authors.join(', '))}</p>` : ''}
      </article>`;
  }

  return { NS, build, check, render, narrative: (html) => narrative(html, writer().el), parseDate };
})();
