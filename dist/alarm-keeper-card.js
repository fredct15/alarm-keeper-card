/**
 * Alarm Keeper Card — Home Assistant dashboard card. Version 1.0
 * Copyright (c) 2026 luigi-regolo. SPDX-License-Identifier: GPL-3.0-only.
 * Works on the alarm_control_panel domain and on device classes, so it fits any alarm integration.
 * The alarm code is typed every time, is sent to Home Assistant and is never stored.
 * No external scripts, fonts, analytics or assets.
 */
(() => {
  'use strict';

  const VERSION = '1.0';
  const TAG = 'alarm-keeper-card';
  const EDITOR_TAG = 'alarm-keeper-card-editor';

  /* ---------------------------------------------------------------- data */
  // Modules: every one works alone (card without the alarm panel) or together in the full card.
  const MODS = {
    doors:     { title: 'Porte',       short: 'Porte',       icon: 'mdi:door-closed',        help: 'Sensori porta e porta garage.',                      sel: { filter: [{ domain: 'binary_sensor', device_class: ['door', 'garage_door', 'opening'] }] },            tile: true },
    windows:   { title: 'Finestre',    short: 'Finestre',    icon: 'mdi:window-closed-variant', help: 'Sensori finestra o apertura.',                    sel: { filter: [{ domain: 'binary_sensor', device_class: ['window', 'opening'] }] },                         tile: true },
    motion:    { title: 'Volumetrici', short: 'Volumetrici', icon: 'mdi:motion-sensor',      help: 'Sensori di movimento e presenza, con l’ultimo movimento.', sel: { filter: [{ domain: 'binary_sensor', device_class: ['motion', 'occupancy', 'presence'] }] },      tile: true },
    batteries: { title: 'Batterie',    short: 'Batterie',    icon: 'mdi:battery',            help: 'Livello delle batterie dei dispositivi dell’allarme.', sel: { filter: [{ domain: 'sensor', device_class: 'battery' }, { domain: 'binary_sensor', device_class: 'battery' }] }, tile: true },
    cameras:   { title: 'Telecamere',  short: 'Telecamere',  icon: 'mdi:cctv',               help: 'Telecamere opzionali, un tocco apre i dettagli.',   sel: { filter: [{ domain: 'camera' }] },                                                                        tile: true },
    siren:     { title: 'Sirena',      short: 'Sirena',      icon: 'mdi:bullhorn-outline',   help: 'Accende e spegne la sirena, con conferma prima di attivarla.', sel: { filter: [{ domain: 'switch' }, { domain: 'siren' }] },                                   tile: true },
    tamper:    { title: 'Manomissione', short: 'Manomissione', icon: 'mdi:shield-alert',     help: 'Sensori di manomissione.',                          sel: { filter: [{ domain: 'binary_sensor', device_class: 'tamper' }] },                                          tile: false },
    station:   { title: 'Centrale',    short: 'Centrale',    icon: 'mdi:router-wireless',    help: 'Informazioni e stato della centrale.',              sel: { filter: [{ domain: 'sensor' }, { domain: 'binary_sensor' }] },                                          tile: false },
    volumes:   { title: 'Volumi',      short: 'Volumi',      icon: 'mdi:volume-high',        help: 'Volume della sirena e della tastiera. Sola lettura, si modifica con il lucchetto.', sel: { filter: [{ domain: 'number' }] }, tile: false },
    settings:  { title: 'Impostazioni', short: 'Impostazioni', icon: 'mdi:tune',             help: 'Modalità di esclusione, suoni e altre scelte.', sel: { filter: [{ domain: 'select' }] },                                                                    tile: false }
  };
  const ROOM_MODS = ['doors', 'windows', 'motion', 'batteries', 'tamper', 'cameras'];
  const MOD_ORDER = ['doors', 'windows', 'motion', 'batteries', 'cameras', 'siren', 'tamper', 'station', 'volumes', 'settings'];

  const DEFAULTS = {
    entity: '', title: 'Allarme', eyebrow: 'ALARM KEEPER CARD', show_eyebrow: true, show_title: true,
    panel: true, commands: true, legend: true, hands: false, width: 'center', theme_mode: 'auto'
  };

  const SHIELD = {"home": "M11,13H13V16H16V11H18L12,6L6,11H8V16H11V13M12,1L21,5V11C21,16.55 17.16,21.74 12,23C6.84,21.74 3,16.55 3,11V5L12,1Z", "off": "M1,4.27L2.28,3L20.5,21.22L19.23,22.5L17,20.25C15.57,21.57 13.87,22.54 12,23C6.84,21.74 3,16.55 3,11V6.27L1,4.27M12,1L21,5V11C21,13.28 20.35,15.5 19.23,17.41L5.65,3.82L12,1Z", "away": "M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.1 14.8,9.5V11C15.4,11 16,11.6 16,12.3V15.8C16,16.4 15.4,17 14.7,17H9.2C8.6,17 8,16.4 8,15.7V12.2C8,11.6 8.6,11 9.2,11V9.5C9.2,8.1 10.6,7 12,7M12,8.2C11.2,8.2 10.5,8.7 10.5,9.5V11H13.5V9.5C13.5,8.7 12.8,8.2 12,8.2Z", "trig": "M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5M11,7H13V13H11M11,15H13V17H11"};
  const LOW_BATTERY = 20;
  const IS_PHONE = Math.min(window.screen ? window.screen.width : 9999, window.screen ? window.screen.height : 9999) < 600;

  /* ------------------------------------------------------------- helpers */
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const ic = (name, extra) => '<ha-icon icon="' + esc(name) + '"' + (extra || '') + '></ha-icon>';
  const pad = (n) => (n < 10 ? '0' : '') + n;
  const hhmm = (d) => pad(d.getHours()) + ':' + pad(d.getMinutes());
  const agoT = (ms) => {
    const m = Math.round(ms / 60000);
    if (m < 1) return 'ora';
    if (m < 60) return m + ' min';
    if (m < 1440) return Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '');
    return Math.floor(m / 1440) + ' g';
  };
  const durH = (h) => {
    const m = Math.round(h * 60);
    if (m < 1) return 'meno di 1 min';
    const H = Math.floor(m / 60), M = m % 60;
    return H ? (M ? H + ' h ' + M + ' min' : H + ' h') : M + ' min';
  };
  const midnight = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const nowH = () => (Date.now() - midnight()) / 3600000;
  const atText = (ts) => {
    const d = new Date(ts), n = new Date();
    if (d.toDateString() === n.toDateString()) return 'alle ' + hhmm(d);
    const y = new Date(n.getTime() - 86400000);
    if (d.toDateString() === y.toDateString()) return 'ieri alle ' + hhmm(d);
    return 'il ' + pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + ' alle ' + hhmm(d);
  };
  const isNum = (v) => v !== '' && v != null && isFinite(Number(v));

  function normalizeConfig(raw) {
    if (!raw || typeof raw !== 'object') throw new Error('Configurazione non valida');
    const c = Object.assign({}, DEFAULTS, raw);
    if (['auto', 'light', 'dark'].indexOf(c.theme_mode) < 0) c.theme_mode = 'auto';
    ['show_eyebrow', 'show_title', 'panel', 'commands', 'legend', 'hands'].forEach((k) => { c[k] = c[k] !== false && c[k] !== 'false'; });
    if (['center', 'left', 'right', 'full'].indexOf(c.width) < 0) c.width = 'center';
    c.hands = raw.hands === true;
    c.title = String(c.title == null ? '' : c.title).trim().replace(/\.+$/, '');
    const src = raw.modules && typeof raw.modules === 'object' ? raw.modules : {};
    c.modules = {};
    MOD_ORDER.forEach((k) => {
      const m = src[k] && typeof src[k] === 'object' ? src[k] : {};
      c.modules[k] = {
        on: m.on !== false,
        entities: Array.isArray(m.entities) ? m.entities.filter((e) => typeof e === 'string' && e) : [],
        tile: typeof m.tile === 'boolean' ? m.tile : MODS[k].tile
      };
    });
    const ord = Array.isArray(raw.order) ? raw.order.filter((k) => MODS[k]) : [];
    c.order = ord.filter((k, i) => ord.indexOf(k) === i);
    MOD_ORDER.forEach((k) => { if (c.order.indexOf(k) < 0) c.order.push(k); });
    return c;
  }

  /* -------------------------------------------------------- entity logic */
  const stOf = (h, id) => (h && h.states ? h.states[id] : undefined);
  const missing = (s) => !s || s.state === 'unavailable' || s.state === 'unknown';
  // Room of an entity: its own area, otherwise the area of its device (Home Assistant registries).
  function areaOf(h, id) {
    if (!h || !h.entities) return null;
    const e = h.entities[id];
    if (!e) return null;
    let aid = e.area_id;
    if (!aid && e.device_id && h.devices && h.devices[e.device_id]) aid = h.devices[e.device_id].area_id;
    if (!aid) return null;
    const a = h.areas && h.areas[aid];
    return { id: aid, name: (a && a.name) || aid };
  }
  const nameOf = (s, id) => (s && s.attributes && s.attributes.friendly_name) || id;

  function alarmMode(state) {
    switch (state) {
      case 'disarmed': return 'off';
      case 'armed_home': case 'armed_night': return 'home';
      case 'armed_away': case 'armed_vacation': case 'armed_custom_bypass': return 'away';
      case 'triggered': return 'trig';
      case 'arming': case 'pending': case 'disarming': return 'pend';
      default: return 'unk';
    }
  }

  function fmtState(h, s) {
    if (!s) return 'Non trovata';
    if (h && typeof h.formatEntityState === 'function') { try { return h.formatEntityState(s); } catch (e) { /* fall back */ } }
    const u = s.attributes && s.attributes.unit_of_measurement;
    return s.state + (u ? ' ' + u : '');
  }

  // One item per configured entity. lv: '' (ok) | 'warn' | 'crit'.
  function itemsOf(h, cfg, k, volPend) {
    const ids = cfg.modules[k].entities, now = Date.now();
    return ids.map((id) => {
      const s = stOf(h, id), nm = nameOf(s, id), lc = s ? Date.parse(s.last_changed) : NaN;
      const since = isFinite(lc) ? agoT(now - lc) : '';
      const it = { id: id, name: nm, lv: '', icon: MODS[k].icon, sub: '', val: '' };
      if (!s) { it.lv = 'warn'; it.sub = 'Entità non trovata'; return it; }
      if (s.state === 'unavailable' || s.state === 'unknown') { it.lv = 'warn'; it.sub = 'Non disponibile'; it.na = true; if (k === 'cameras') it.off = true; return it; }
      const on = s.state === 'on';
      if (k === 'doors' || k === 'windows') {
        const door = k === 'doors';
        it.icon = on ? (door ? 'mdi:door-open' : 'mdi:window-open-variant') : (door ? 'mdi:door-closed' : 'mdi:window-closed-variant');
        it.open = on; it.lv = on ? 'warn' : '';
        it.sub = on ? 'Aperta' + (since ? ' da ' + since : '') : 'Chiusa' + (since ? ' · da ' + since : '');
      } else if (k === 'motion') {
        it.act = on; it.lv = on ? 'warn' : '';
        it.sub = on ? 'Movimento in corso' : 'Nessun movimento' + (isFinite(lc) ? ' · ultimo ' + atText(lc) : '');
      } else if (k === 'tamper') {
        it.tamper = on; it.lv = on ? 'crit' : ''; it.sub = on ? 'Manomissione' : 'Ok';
      } else if (k === 'batteries') {
        if (s.entity_id && s.entity_id.indexOf('binary_sensor.') === 0) { it.low = on; it.lv = on ? 'warn' : ''; it.icon = on ? 'mdi:battery-alert' : 'mdi:battery'; it.sub = on ? 'Bassa' : 'Ok'; }
        else if (isNum(s.state)) { const p = Number(s.state); it.pct = p; it.low = p < LOW_BATTERY; it.lv = it.low ? 'warn' : ''; it.icon = it.low ? 'mdi:battery-low' : 'mdi:battery'; it.sub = Math.round(p) + '%'; }
        else { it.lv = 'warn'; it.sub = 'Valore non valido'; it.na = true; }
      } else if (k === 'station') {
        it.icon = (s.attributes && s.attributes.icon) || 'mdi:router-wireless'; it.sub = fmtState(h, s);
      } else if (k === 'siren') {
        it.on = on; it.lv = on ? 'crit' : ''; it.sub = on ? 'Attiva' : 'Spenta';
      } else if (k === 'cameras') {
        it.pic = s.attributes && s.attributes.entity_picture; it.off = false; it.sub = 'Attiva';
      } else if (k === 'volumes') {
        const a = s.attributes || {};
        let v = Number(s.state);
        if (volPend && volPend[id] != null) v = volPend[id];
        it.num = v; it.min = isNum(a.min) ? Number(a.min) : 0; it.max = isNum(a.max) ? Number(a.max) : 100; it.step = isNum(a.step) && Number(a.step) > 0 ? Number(a.step) : 1; it.unit = a.unit_of_measurement || '';
        it.val = (isNum(v) ? (Math.round(v * 100) / 100) : s.state) + (it.unit ? (it.unit === '%' ? '' : ' ') + it.unit : '');
        it.icon = 'mdi:volume-high';
        if (!isNum(v)) { it.lv = 'warn'; it.sub = 'Valore non valido'; it.na = true; }
      } else if (k === 'settings') {
        const a = s.attributes || {};
        it.options = Array.isArray(a.options) ? a.options : []; it.cur = s.state; it.icon = a.icon || 'mdi:tune';
      }
      return it;
    });
  }

  function summaryOf(k, items) {
    const n = items.length, na = items.filter((i) => i.na).length;
    if (k === 'doors' || k === 'windows') {
      const o = items.filter((i) => i.open).length;
      if (o) return { lv: 'warn', t: o + (o === 1 ? ' aperta' : ' aperte') + ' su ' + n };
      if (na) return { lv: 'warn', t: na + ' non disponibil' + (na === 1 ? 'e' : 'i') };
      return { lv: 'ok', t: n === 1 ? 'Chiusa' : (k === 'doors' ? 'Tutte chiuse' : 'Tutte chiuse') };
    }
    if (k === 'motion') {
      const a = items.filter((i) => i.act).length;
      if (a) return { lv: 'warn', t: a + (a === 1 ? ' attivo' : ' attivi') };
      if (na) return { lv: 'warn', t: na + ' non disponibil' + (na === 1 ? 'e' : 'i') };
      return { lv: 'ok', t: 'Nessuno' };
    }
    if (k === 'tamper') {
      const a = items.filter((i) => i.tamper).length;
      if (a) return { lv: 'crit', t: a + (a === 1 ? ' manomissione' : ' manomissioni') };
      if (na) return { lv: 'warn', t: na + ' non disponibil' + (na === 1 ? 'e' : 'i') };
      return { lv: 'ok', t: 'Nessuna' };
    }
    if (k === 'batteries') {
      const l = items.filter((i) => i.low).length;
      if (l) return { lv: 'warn', t: l + (l === 1 ? ' bassa' : ' basse') };
      if (na) return { lv: 'warn', t: na + ' non disponibil' + (na === 1 ? 'e' : 'i') };
      return { lv: 'ok', t: 'Tutte ok' };
    }
    if (k === 'cameras') {
      const off = items.filter((i) => i.off).length;
      if (off) return { lv: 'warn', t: off + (off === 1 ? ' non disponibile' : ' non disponibili') };
      return { lv: 'ok', t: n + (n === 1 ? ' attiva' : ' attive') };
    }
    if (k === 'siren') {
      if (items.some((i) => i.on)) return { lv: 'crit', t: 'Attiva' };
      if (na) return { lv: 'warn', t: 'Non disponibile' };
      return { lv: 'ok', t: 'Spenta' };
    }
    if (k === 'volumes') {
      if (na) return { lv: 'warn', t: na + ' non disponibil' + (na === 1 ? 'e' : 'i') };
      return { lv: 'ok', t: n === 1 ? items[0].val : n + ' volumi' };
    }
    if (k === 'settings') {
      if (na) return { lv: 'warn', t: na + ' non disponibil' + (na === 1 ? 'e' : 'i') };
      return { lv: 'ok', t: n === 1 ? items[0].cur : n + ' impostazioni' };
    }
    if (na) return { lv: 'warn', t: na + ' non disponibil' + (na === 1 ? 'e' : 'i') };
    return { lv: 'ok', t: n === 1 ? 'Ok' : 'Tutto ok' };
  }

  /* ----------------------------------------------------------------- CSS */
  const CARD_CSS = `
:host{display:block}
*{box-sizing:border-box}
.hc{--hc-accent:#0a7156;--hc-bg:#fafbf9;--hc-tile:#f0f2ef;--hc-circle:#ffffff;--hc-line:#e0e5df;--hc-fg:#18221c;--hc-muted:#56675c;--hc-btn-fg:#0a7156;
  --hc-warn-bg:#f9f3de;--hc-warn-bd:#d3bd63;--hc-warn-fg:#5f4a10;--hc-crit-bg:#b83a42;--hc-crit-text:#ae4742;--hc-idle:#858E89;--hc-away:#246a83;
  display:block;font-family:var(--ha-font-family-body,Roboto,Arial,sans-serif);color:var(--hc-fg);font-size:var(--ha-font-size-m,14px);line-height:1.4;text-align:left}
.hc[data-mode="dark"]{--hc-accent:#0e795d;--hc-bg:#101211;--hc-tile:#191c1a;--hc-circle:#282b29;--hc-line:#2b302c;--hc-fg:#f5f7f4;--hc-muted:#bbc5bd;--hc-btn-fg:#f5f7f4;--hc-warn-bg:#302b1b;--hc-warn-bd:#816e31;--hc-warn-fg:#f1d78b;--hc-crit-text:#e85e64;--hc-idle:#8B918E}
.hc :where(button,select,input){font:inherit;color:inherit}
.hc button{cursor:pointer}
.hc ha-icon{display:flex;align-items:center;justify-content:center;line-height:0;flex:none;--mdc-icon-size:18px;width:18px;height:18px}
.cardw{container-type:inline-size;min-width:0}
.shell{position:relative;background:var(--hc-bg);border:1px solid var(--hc-line);border-radius:26px;padding:13px}
.head{margin:2px 4px 12px}.eye{font-size:10px;letter-spacing:1.7px;font-weight:750;color:var(--hc-muted);margin-bottom:7px;overflow-wrap:anywhere}
.title{font-size:23px;line-height:1.14;font-weight:800;letter-spacing:-.7px;overflow-wrap:anywhere}.title b{color:var(--hc-accent)}
.panel{position:relative;background:var(--hc-tile);border:1px solid var(--hc-line);border-radius:24px;padding:8px 12px;margin-bottom:10px}
.dial{display:block;margin:0 auto 4px;max-width:186px;width:100%;height:auto}.dial.tap{cursor:pointer}
.cmds{display:flex;gap:8px;margin-top:10px}
.cmd{flex:1;min-height:42px;border-radius:999px;border:1px solid var(--hc-line);background:var(--hc-bg);font-size:13px;font-weight:600;display:flex;gap:6px;align-items:center;justify-content:center;padding:0 8px;color:var(--hc-fg)}
.cmd.p{background:var(--hc-accent);border-color:var(--hc-accent);color:#fff}
.cmd.c{background:var(--hc-crit-bg);border-color:var(--hc-crit-bg);color:#fff}
.cmd[disabled]{opacity:.5;cursor:default}
.msg{margin:8px 4px 0;font-size:12px;color:var(--hc-crit-text);font-weight:600;text-align:center}
.lab{margin:14px 4px 8px;color:var(--hc-muted);font-size:10px;letter-spacing:1.3px;font-weight:600;text-transform:uppercase}
.lab:first-child{margin-top:0}
.lkrow{display:flex;align-items:center;justify-content:space-between}
.lst{display:grid;grid-template-columns:minmax(0,1fr);background:var(--hc-tile);border:1px solid var(--hc-line);border-radius:20px;overflow:hidden}
.tile{display:flex;align-items:center;gap:10px;background:transparent;border:0;border-top:1px solid var(--hc-line);border-radius:0;padding:8px 12px;min-height:50px;text-align:left;width:100%;min-width:0;color:var(--hc-fg)}
.tile:first-child{border-top:0}
.tile .t{flex:1}.tile .st{flex:none;max-width:50%;margin:0;font-size:12px;text-align:right;color:var(--hc-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tile.warn .st{color:var(--hc-warn-fg);font-weight:600}.tile.crit .st{color:var(--hc-crit-text);font-weight:600}
.tile .chev{color:var(--hc-muted);--mdc-icon-size:18px}
.ico{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;line-height:0;background:var(--hc-circle);flex:none;color:var(--hc-accent);--mdc-icon-size:16px}
.ico ha-icon{--mdc-icon-size:16px;width:16px;height:16px}
.warn>.ico{background:var(--hc-warn-bg);box-shadow:inset 0 0 0 1px var(--hc-warn-bd);color:var(--hc-warn-fg)}
.crit>.ico{background:var(--hc-crit-bg);color:#fff}
.t{flex:1;min-width:0}
.rn{font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rs{font-size:10.5px;color:var(--hc-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.warn .rs{color:var(--hc-warn-fg);font-weight:600}.crit .rs{color:var(--hc-crit-text);font-weight:600}
.detail{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:42px;border-radius:999px;font-weight:600;font-size:13.5px;color:var(--hc-btn-fg);border:1px solid color-mix(in srgb,var(--hc-accent) 45%,transparent);background:color-mix(in srgb,var(--hc-accent) 12%,transparent);margin-top:10px}
.leg{position:absolute;left:14px;right:14px;top:56px;background:var(--hc-bg);border:1px solid var(--hc-line);border-radius:20px;padding:14px;box-shadow:0 10px 30px #0004;z-index:2;cursor:pointer}
.leg b{display:block;font-size:15px;margin-bottom:8px}.leg .l{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--hc-muted);margin-bottom:8px}.leg .l span{display:inline-flex;align-items:center;gap:6px}.leg i{width:9px;height:9px;border-radius:50%;display:inline-block}.leg p{margin:0;font-size:11px;color:var(--hc-muted)}
.note{margin:6px 4px 12px;font-size:12px;color:var(--hc-muted)}
.empty{padding:18px 8px;text-align:center;color:var(--hc-muted);font-size:13px}
@container (min-width:600px){.panel.has-dial{display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px 28px;align-items:center;padding:16px 28px}.panel.has-dial .dial{margin:0}.panel.has-dial .cmds{margin-top:0;flex-direction:column}.panel.has-dial .cmd{min-height:52px;font-size:14.5px}.panel.has-dial .msg{grid-column:2}  .lst{grid-template-columns:repeat(2,minmax(0,1fr))}.lst .tile:nth-child(2){border-top:0}.lst .tile:nth-child(even){border-left:1px solid var(--hc-line)}.lst .tile:last-child:nth-child(odd){grid-column:1/-1}.leg{left:28px;right:auto;width:300px}}
.hc .cardw{max-width:460px;margin:0 auto}
.hc[data-cw="left"] .cardw{margin:0 auto 0 0}.hc[data-cw="right"] .cardw{margin:0 0 0 auto}.hc[data-cw="full"] .cardw{max-width:none}
.hc .head{margin-bottom:4px}.hc .title{font-size:20px}
.hc .panel.has-dial{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px 14px;align-items:center;padding:8px 12px}
.hc .panel.has-dial .dial{max-width:112px;margin:0}.hc .panel.has-dial .cmds{flex-direction:column;gap:6px;margin:0}
.hc .panel.has-dial .cmd{min-height:38px;font-size:13px;padding:4px 10px}.hc .panel.has-dial .msg{grid-column:1/-1}
.hc .lst{grid-template-columns:repeat(3,minmax(0,1fr))}
.hc .lst .tile{flex-direction:column;gap:3px;text-align:center;padding:8px 4px;min-height:64px;justify-content:center;border-top:0;border-left:1px solid var(--hc-line)}
.hc .lst .tile:nth-child(3n+1){border-left:0}.hc .lst .tile:nth-child(n+4){border-top:1px solid var(--hc-line)}
.hc .lst .tile:last-child:nth-child(odd){grid-column:auto}
.hc .tile .t{flex:none;font-size:11.5px}.hc .tile .st{max-width:100%;font-size:10.5px;text-align:center}.hc .tile .chev{display:none}
.hc .lst .tile.ph{pointer-events:none}
.hc .detail{min-height:38px}
.head.hb{display:flex;align-items:center;justify-content:space-between;gap:10px}.head.hb .ht{min-width:0}
.hc .detail.dtl{flex:none;width:36px;min-width:36px;height:36px;min-height:36px;padding:0;gap:0;margin:0;border-radius:50%}.detail.dtl ha-icon{--mdc-icon-size:20px}
@container (min-width:600px){
.hc[data-cw="full"] .shell:has(.panel.has-dial):has(.lst){display:grid;grid-template-columns:290px minmax(0,1fr);gap:10px 12px;align-items:stretch}
.hc[data-cw="full"] .shell:has(.panel.has-dial):has(.lst)>:not(.panel):not(.lst){grid-column:1/-1}
.hc[data-cw="full"] .shell:has(.panel.has-dial):has(.lst)>.panel.has-dial{grid-column:1;display:flex;flex-direction:column;align-items:stretch;justify-content:center;gap:10px;padding:10px 12px;margin-bottom:0}
.hc[data-cw="full"] .panel.has-dial .dial{max-width:150px}.hc[data-cw="full"] .panel.has-dial .cmd{min-height:46px;font-size:14px}
.hc[data-cw="full"] .shell:has(.panel.has-dial):has(.lst)>.lst{grid-column:2;grid-row:2;grid-template-columns:minmax(0,1fr)}
.hc[data-cw="full"] .lst .tile{flex-direction:row;gap:10px;text-align:left;padding:8px 12px;min-height:50px;justify-content:flex-start}
.hc[data-cw="full"] .lst .tile:nth-child(n){border-left:0;border-top:1px solid var(--hc-line)}.hc[data-cw="full"] .lst .tile:nth-child(1){border-top:0}
.hc[data-cw="full"] .lst .tile .t{flex:1;font-size:inherit}.hc[data-cw="full"] .lst .tile .st{max-width:50%;font-size:12px;text-align:right}.hc[data-cw="full"] .lst .tile .chev{display:inline-flex}
.hc[data-cw="full"] .lst .tile.ph{display:none}}
/* rows */
.row{display:flex;align-items:center;gap:10px;background:var(--hc-tile);border:1px solid var(--hc-line);border-radius:14px;padding:5px 10px;min-height:44px;margin-bottom:5px;min-width:0}
.row .rn{font-size:13px;white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere;line-height:1.25}.row .rs{font-size:11px;white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere;line-height:1.3;margin-top:1px}
.sw{width:40px;height:23px;border-radius:12px;background:var(--hc-idle);position:relative;flex:none;border:0;padding:0}.sw::after{content:"";position:absolute;top:3px;left:3px;width:17px;height:17px;border-radius:50%;background:#fff;transition:left .15s}
.sw.on{background:var(--hc-accent)}.sw.on::after{left:20px}.sw.crit.on{background:var(--hc-crit-bg)}
.lk{display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 10px;border-radius:14px;border:1px solid var(--hc-line);background:var(--hc-bg);color:var(--hc-fg);font-size:11px;font-weight:600;text-transform:none;letter-spacing:0}.lk.open{background:var(--hc-accent);border-color:var(--hc-accent);color:#fff}
.lk ha-icon{--mdc-icon-size:14px;width:14px;height:14px}
.rl{flex:none;width:30px;height:30px;border-radius:50%;border:1px solid var(--hc-line);background:var(--hc-bg);color:var(--hc-muted);display:inline-flex;align-items:center;justify-content:center;padding:0;margin-left:8px}.rl.open{background:var(--hc-accent);border-color:var(--hc-accent);color:#fff}.rl ha-icon{--mdc-icon-size:15px;width:15px;height:15px}
.vv{font-size:13px;min-width:38px;text-align:right;font-weight:700}
.stp{display:flex;align-items:center;gap:8px}.stp button{width:32px;height:32px;border-radius:50%;border:1px solid var(--hc-line);background:var(--hc-bg);font-size:18px;line-height:1;color:var(--hc-fg);padding:0}.stp button[disabled]{opacity:.4}.stp strong{min-width:44px;text-align:center;font-size:13px}
.sp{appearance:none;border:1px solid var(--hc-line);background:var(--hc-bg);border-radius:999px;padding:7px 12px;font-size:12.5px;font-weight:600;width:132px;max-width:50%;flex:none;text-align:center;text-align-last:center;color:var(--hc-fg)}
.cams{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:6px}
.cam{position:relative;aspect-ratio:16/10;border-radius:16px;border:1px solid var(--hc-line);overflow:hidden;display:grid;place-items:center;color:#ffffffb0;text-align:left;padding:0;background:linear-gradient(135deg,#34424b,#1b252b)}
.cams .cam:last-child:nth-child(odd){grid-column:1/-1;aspect-ratio:16/5}
.cam img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.cam .n{position:absolute;left:8px;bottom:6px;right:8px;font-size:11.5px;font-weight:600;color:#fff;text-shadow:0 1px 3px #000a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cam .lv{position:absolute;right:8px;top:7px;font-size:9px;font-weight:700;letter-spacing:.8px;color:#fff;display:flex;align-items:center;gap:4px;text-shadow:0 1px 3px #000a}.cam .lv i{width:6px;height:6px;border-radius:50%;background:#4bd8a2}.cam .lv.off i{background:#e85e64}
.cam ha-icon{--mdc-icon-size:30px;width:30px;height:30px}
/* popup */
.ov{position:fixed;inset:0;margin:0;width:100%;height:100%;max-width:none;max-height:none;border:0;z-index:9999;overscroll-behavior:contain;overflow:hidden;color:inherit;background:#0009;align-items:center;justify-content:center;padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))}
.ov:not([open]){display:none}.ov[open]{display:flex}.ov::backdrop{background:transparent}
.dlg{width:min(390px,100%);max-width:100%;min-width:0;align-self:center;height:min(calc(100vh - 40px),680px);height:min(calc(100dvh - 40px),680px);display:flex;flex-direction:column;background:var(--hc-bg);color:var(--hc-fg);border:1px solid var(--hc-line);border-radius:26px;overflow:hidden;box-shadow:0 18px 60px #0005}
:host([data-popup="wide"]) .dlg{width:min(1120px,100%);height:min(80vh,560px);height:min(80dvh,560px)}
.dlg.small,:host([data-popup="wide"]) .dlg.small{width:min(390px,100%);height:auto;max-height:min(calc(100vh - 32px),680px);max-height:min(calc(100dvh - 32px),680px)}
.dlg.small .mb{flex:0 1 auto}
.mh{flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 16px 12px 18px;background:var(--hc-bg);border-bottom:1px solid var(--hc-line)}
.mt{flex:1;min-width:0;margin:0;font-size:17px;font-weight:600;line-height:1.3}
.x{display:grid;place-items:center;line-height:0;margin:0;padding:0;width:40px;height:40px;flex:none;border:1px solid var(--hc-line);border-radius:50%;background:var(--hc-tile);color:var(--hc-fg)}
.mb{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;padding:12px 18px 18px;min-width:0}
:host([data-popup="wide"]) .mb{padding:12px 22px 22px}
.chips{display:flex;gap:6px;margin-bottom:4px}
.chip{min-height:36px;padding:0 14px;border:1px solid var(--hc-line);border-radius:999px;background:var(--hc-tile);color:var(--hc-muted);font-size:13px}
.chip[aria-pressed="true"]{background:color-mix(in srgb,var(--hc-accent) 14%,transparent);border-color:color-mix(in srgb,var(--hc-accent) 45%,transparent);color:var(--hc-fg);font-weight:600}
.rh{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:16px 0 8px;font-size:13px;font-weight:600}.rh span{font-size:11px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase;color:var(--hc-muted)}
.rh em{font-style:normal;font-size:11px;font-weight:600;padding:3px 9px;border-radius:10px}.rh em.w{color:var(--hc-warn-fg);background:var(--hc-warn-bg,#f7ecc8)}.rh em.o{color:var(--hc-accent);background:color-mix(in srgb,var(--hc-accent) 14%,transparent)}.rh em.c{color:var(--hc-crit-text);background:color-mix(in srgb,var(--hc-crit-text) 14%,transparent)}
:host([data-popup="wide"]) .cols{column-width:260px;column-count:4;column-gap:22px;column-fill:balance;direction:rtl}
:host([data-popup="wide"]) .cols>*{direction:ltr}
:host([data-popup="wide"]) .chips{column-span:all}
:host([data-popup="wide"]) .cols .rh{break-after:avoid;margin:0 0 8px}
:host([data-popup="wide"]) .cols .grp{padding-bottom:16px}
:host([data-popup="wide"]) .chips{margin-bottom:14px}
:host([data-popup="wide"]) .cols .grp>*{break-inside:avoid}
.mcol>.grp:first-child .rh,.cols>.grp:first-child .rh{margin-top:4px}
.abig{display:flex;align-items:center;gap:12px;margin:4px 0 12px;padding:14px;border-radius:24px;background:var(--hc-tile);border:1px solid var(--hc-line)}
.orb{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:var(--hc-accent);color:#fff;flex:none}
.orb svg{width:24px;height:24px}
.vt{font-size:17px;font-weight:700;letter-spacing:-.3px}.vs{font-size:11.5px;color:var(--hc-muted);margin-top:2px}
.ast{display:flex;gap:8px;margin-bottom:14px}.ast>div{flex:1;padding:10px 12px;border-radius:16px;background:var(--hc-tile);border:1px solid var(--hc-line)}.ast span{display:block;font-size:11px;color:var(--hc-muted)}.ast b{display:block;margin-top:3px;font-size:13px}
.lbl{margin:0 4px 8px;color:var(--hc-muted);font-size:10px;letter-spacing:1.3px;font-weight:600;text-transform:uppercase;text-align:center}
.warnt{margin:0 0 12px;padding:9px 12px;border-radius:14px;background:var(--hc-warn-bg);border:1px solid var(--hc-warn-bd);color:var(--hc-warn-fg);font-size:12px;text-align:center}
.dotrow{display:flex;justify-content:center;align-items:center;min-height:28px;margin-bottom:4px}
.dots{display:flex;gap:12px;justify-content:center;min-height:14px}.dots i{width:12px;height:12px;border-radius:50%;border:1.5px solid var(--hc-muted)}.dots i.f{background:var(--hc-fg);border-color:var(--hc-fg)}
.err{text-align:center;color:var(--hc-crit-text);font-size:12.5px;font-weight:600;min-height:18px;margin:2px 0 6px}
.keys{display:grid;grid-template-columns:repeat(3,72px);gap:10px;justify-content:center;margin:4px 0 14px}
.keys button{width:72px;height:56px;border-radius:18px;border:1px solid var(--hc-line);background:var(--hc-tile);padding:0;display:flex;align-items:center;justify-content:center;line-height:1;color:var(--hc-fg);-webkit-tap-highlight-color:transparent}
.keys button:active{background:var(--hc-line)}
.keys b{font-size:24px;font-weight:500;letter-spacing:0}
.keys .bk{border-color:transparent;background:transparent}.keys .bk ha-icon{--mdc-icon-size:26px;width:26px;height:26px}.keys .bk[disabled]{opacity:.35;cursor:default}
@media (max-height:720px){.keys button{height:48px}.keys{gap:8px 10px}.keys b{font-size:22px}}
.code{display:block;width:100%;min-height:46px;margin:0 0 12px;padding:0 14px;border-radius:14px;border:1px solid var(--hc-line);background:var(--hc-tile);color:var(--hc-fg);font-size:16px}
.acta{display:block;width:100%;min-height:46px;border-radius:999px;background:var(--hc-accent);color:#fff;border:0;font-size:14px;font-weight:600}.acta[disabled]{opacity:.45;cursor:default}
.acta.c{background:var(--hc-crit-bg)}
.cf{padding:22px 18px 18px;text-align:center}.cf .wi{width:48px;height:48px;border-radius:50%;margin:0 auto 12px;display:grid;place-items:center;background:var(--hc-warn-bg);box-shadow:inset 0 0 0 2px var(--hc-warn-bd);color:var(--hc-warn-fg)}.cf .wi ha-icon{--mdc-icon-size:24px;width:24px;height:24px}
.cf h3{margin:0 0 6px;font-size:18px}.cf p{margin:0 0 16px;color:var(--hc-muted);font-size:13px}.cf .cmds{margin-top:0}
.shake{animation:sh .35s}@keyframes sh{20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important;scroll-behavior:auto!important}}
`;

  /* ------------------------------------------------------------ the card */
  class AlarmKeeperCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = '<style>' + CARD_CSS + '</style><div id="r"></div>';
      this._root = this.shadowRoot.getElementById('r');
      this._cfg = null; this._hass = null; this._sig = null;
      this._popup = false; this._view = 'list'; this._filter = 'v'; this._focusMod = null; this._ret = '';
      this._code = ''; this._err = ''; this._busy = false; this._act = ''; this._shake = false; this._sirenId = '';
      this._leg = false; this._vunl = {}; this._volPend = {}; this._msg = ''; this._focus = '';
      this._segs = null; this._histOk = false; this._histAt = 0; this._histBusy = false; this._histKey = '';
      this._onKey = (e) => this._key(e);
      this._onResize = () => { this._applyLayout(); if (this._popup) this._render(); };
      this._timer = null;
      this.shadowRoot.addEventListener('click', (e) => this._click(e));
      this.shadowRoot.addEventListener('change', (e) => this._change(e));
    }

    static getStubConfig(hass) {
      const c = {};
      const ids = hass && hass.states ? Object.keys(hass.states).filter((i) => i.indexOf('alarm_control_panel.') === 0) : [];
      if (ids.length) c.entity = ids[0];
      return c;
    }
    static getConfigElement() { return document.createElement(EDITOR_TAG); }
    getCardSize() { return 6; }
    getGridOptions() { return { columns: 12, min_columns: 6 }; }

    setConfig(config) {
      this._cfg = normalizeConfig(config);
      this._sig = null; this._histKey = '';
      this._render();
    }
    set hass(h) {
      this._hass = h;
      if (!this._cfg) return;
      this._maybeHistory();
      const sig = this._signature();
      if (sig === this._sig) return;
      this._sig = sig;
      this._render();
    }
    get hass() { return this._hass; }

    connectedCallback() {
      window.addEventListener('resize', this._onResize);
      this._applyLayout();
      this._timer = window.setInterval(() => {
        if (this._cfg && this._hass && !this._popup) { this._maybeHistory(); this._render(); }
      }, 60000);
    }
    disconnectedCallback() {
      window.removeEventListener('resize', this._onResize);
      document.removeEventListener('keydown', this._onKey, true);
      if (this._timer) window.clearInterval(this._timer);
    }

    _applyLayout() {
      const wide = !IS_PHONE && window.matchMedia('(min-width:640px) and (min-height:600px)').matches;
      this.setAttribute('data-popup', wide ? 'wide' : 'phone');
    }
    _wide() { return this.getAttribute('data-popup') === 'wide'; }
    _colCount() {
      if (!this._wide()) return 1;
      const w = Math.min(1120, window.innerWidth - 32) - 44;
      return Math.max(1, Math.min(4, Math.floor((w + 22) / 282)));
    }

    _mode() {
      const m = this._cfg.theme_mode;
      if (m === 'light' || m === 'dark') return m;
      return this._hass && this._hass.themes && this._hass.themes.darkMode ? 'dark' : 'light';
    }

    _signature() {
      const h = this._hass, c = this._cfg;
      const parts = [h && h.themes && h.themes.darkMode ? 'd' : 'l', JSON.stringify(this._vunl), JSON.stringify(this._volPend)];
      if (c.entity) { const s = stOf(h, c.entity); parts.push('A:' + (s ? s.state + ':' + s.last_changed + ':' + (s.attributes && s.attributes.code_format) : '-')); }
      MOD_ORDER.forEach((k) => {
        const m = c.modules[k];
        if (!m.on) return;
        m.entities.forEach((id) => {
          const s = stOf(h, id);
          parts.push(id + ':' + (s ? s.state + (k === 'cameras' ? ':' + (s.attributes && s.attributes.entity_picture) : '') + (s.attributes && s.attributes.options ? ':' + s.attributes.options.length : '') : '-'));
        });
      });
      return parts.join('|');
    }

    /* ---- history of the day for the clock ---- */
    _maybeHistory() {
      const c = this._cfg, h = this._hass;
      if (!c || !h || !c.panel || !c.entity || this._histBusy) return;
      const s = stOf(h, c.entity);
      const key = c.entity + '|' + (s ? s.state : '-') + '|' + new Date().toDateString();
      if (key === this._histKey && Date.now() - this._histAt < 300000) return;
      this._histBusy = true; this._histKey = key; this._histAt = Date.now();
      const m0 = midnight();
      const fallback = () => {
        const st = stOf(this._hass, c.entity);
        const lc = st ? Date.parse(st.last_changed) : NaN;
        this._segs = st && isFinite(lc) ? [{ a: Math.max(0, (lc - m0) / 3600000), b: null, m: alarmMode(st.state) }] : [];
        this._histOk = false;
      };
      const done = () => { this._histBusy = false; this._sig = null; this._render(); };
      try {
        Promise.resolve(h.callWS({ type: 'history/history_during_period', start_time: new Date(m0).toISOString(), end_time: new Date().toISOString(), entity_ids: [c.entity], minimal_response: true, no_attributes: true, significant_changes_only: false })).then((r) => {
          const arr = r && (r[c.entity] || (Array.isArray(r) ? r[0] : null));
          if (!Array.isArray(arr) || !arr.length) { fallback(); done(); return; }
          const pts = [];
          arr.forEach((e) => {
            const state = e.s != null ? e.s : e.state;
            let ts = e.lc != null ? e.lc : (e.lu != null ? e.lu : null);
            ts = ts != null ? ts * 1000 : Date.parse(e.last_changed || e.last_updated);
            if (state == null || !isFinite(ts)) return;
            pts.push({ t: Math.max(ts, m0), m: alarmMode(state) });
          });
          pts.sort((x, y) => x.t - y.t);
          if (!pts.length) { fallback(); done(); return; }
          this._segs = pts.map((p, i) => ({ a: (p.t - m0) / 3600000, b: i < pts.length - 1 ? (pts[i + 1].t - m0) / 3600000 : null, m: p.m }));
          this._histOk = true; done();
        }, () => { fallback(); done(); });
      } catch (err) { fallback(); this._histBusy = false; }
    }

    _segments() {
      const n = nowH();
      let segs = this._segs;
      if (!segs) {
        const st = stOf(this._hass, this._cfg.entity), lc = st ? Date.parse(st.last_changed) : NaN;
        segs = st && isFinite(lc) ? [{ a: Math.max(0, (lc - midnight()) / 3600000), b: null, m: alarmMode(st.state) }] : [];
      }
      return segs.map((s) => ({ a: s.a, b: s.b == null ? n : s.b, m: s.m }));
    }

    /* ---- the clock ---- */
    _dial(mode, st) {
      const cx = 100, cy = 100, r = 84, n = nowH(), half = n >= 12 ? 1 : 0, h0 = half * 12, cfg = this._cfg;
      const meta = {
        home: { p: SHIELD.home, l: 'In casa', o: 'var(--hc-accent)', f: '#fff' },
        away: { p: SHIELD.away, l: 'Fuori casa', o: 'var(--hc-away)', f: '#fff' },
        off: { p: SHIELD.off, l: 'Disinserito', o: 'var(--hc-warn-bg)', f: 'var(--hc-warn-fg)', ring: 'var(--hc-warn-bd)' },
        trig: { p: SHIELD.trig, l: 'Scattato', o: 'var(--hc-crit-bg)', f: '#fff' },
        pend: { p: SHIELD.off, l: st && st.state === 'arming' ? 'Inserimento' : st && st.state === 'pending' ? 'Ingresso' : 'Disinserimento', o: 'var(--hc-warn-bg)', f: 'var(--hc-warn-fg)', ring: 'var(--hc-warn-bd)' },
        unk: { p: SHIELD.off, l: 'Non disp.', o: 'var(--hc-warn-bg)', f: 'var(--hc-warn-fg)', ring: 'var(--hc-warn-bd)' }
      };
      const M = meta[mode], lc = st ? Date.parse(st.last_changed) : NaN;
      const sub = !isFinite(lc) ? '' : (mode === 'home' || mode === 'away') ? 'dalle ' + hhmm(new Date(lc)) : mode === 'unk' ? '' : 'da ' + agoT(Date.now() - lc);
      const P = (rr, p) => { const a = (p / 12 * 360 - 90) * Math.PI / 180; return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]; };
      const arc = (p0, p1, col) => {
        const A = P(r, p0), B = P(r, p1);
        return '<path d="M' + A[0].toFixed(1) + ' ' + A[1].toFixed(1) + 'A' + r + ' ' + r + ' 0 ' + ((p1 - p0) > 6 ? 1 : 0) + ' 1 ' + B[0].toFixed(1) + ' ' + B[1].toFixed(1) + '" fill="none" stroke="' + col + '" stroke-width="10"/>';
      };
      let a = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--hc-line)" stroke-width="10"/>';
      const col = { home: 'var(--hc-accent)', away: 'var(--hc-away)', off: 'var(--hc-warn-bd)', trig: 'var(--hc-crit-bg)' };
      this._segments().forEach((s) => {
        if (!col[s.m]) return;
        const A = Math.max(s.a, h0), B = Math.min(s.b, h0 + 12);
        if (B - A > 0.005) a += arc(A - h0, B - h0, col[s.m]);
      });
      const np = P(r, n - h0);
      a += mode === 'trig'
        ? '<circle cx="' + np[0] + '" cy="' + np[1] + '" r="7" fill="var(--hc-crit-bg)" stroke="var(--hc-tile)" stroke-width="3"/>'
        : '<circle cx="' + np[0] + '" cy="' + np[1] + '" r="5.5" fill="var(--hc-tile)" stroke="var(--hc-fg)" stroke-width="2"/>';
      for (let i = 0; i < 12; i++) {
        if (i % 3 === 0) continue;
        const p0 = P(r - 11, i), p1 = P(r - 16, i);
        a += '<line x1="' + p0[0] + '" y1="' + p0[1] + '" x2="' + p1[0] + '" y2="' + p1[1] + '" stroke="var(--hc-muted)" stroke-width="1.5" stroke-linecap="round" opacity=".6"/>';
      }
      [['12', 0], ['3', 3], ['6', 6], ['9', 9]].forEach((l) => {
        const p = P(r - 23, l[1]);
        a += '<text x="' + p[0] + '" y="' + (p[1] + 5) + '" text-anchor="middle" font-size="14" font-weight="700" fill="var(--hc-fg)" font-family="Roboto,Arial,sans-serif">' + l[0] + '</text>';
      });
      if (cfg.hands) {
        const hh = P(32, n % 12), mm = P(46, ((n % 1) * 60) / 5);
        a += '<line x1="' + cx + '" y1="' + cy + '" x2="' + hh[0] + '" y2="' + hh[1] + '" stroke="var(--hc-fg)" stroke-width="4" stroke-linecap="round" opacity=".85"/><line x1="' + cx + '" y1="' + cy + '" x2="' + mm[0] + '" y2="' + mm[1] + '" stroke="var(--hc-fg)" stroke-width="2.5" stroke-linecap="round" opacity=".85"/><circle cx="' + cx + '" cy="' + cy + '" r="5" fill="var(--hc-fg)"/>';
      }
      const hd = cfg.hands, ry = hd ? 108 : 58, rh = hd ? 48 : 84, ir = hd ? 8 : 13, iy = hd ? 121 : 80, ly = hd ? 140 : 115, sy = hd ? 151 : 131;
      const ks = ir * 2 * 0.65 / 24, lsz = M.l.length > 11 ? 12 : hd ? 12 : 14;
      a += '<rect x="46" y="' + ry + '" width="108" height="' + rh + '" rx="16" fill="var(--hc-tile)" opacity=".94"/><circle cx="' + cx + '" cy="' + iy + '" r="' + ir + '" fill="' + M.o + '"' + (M.ring ? ' stroke="' + M.ring + '" stroke-width="1.5"' : '') + '/>' +
        '<g transform="translate(' + (cx - 12 * ks).toFixed(2) + ',' + (iy - 12 * ks).toFixed(2) + ') scale(' + ks.toFixed(3) + ')" fill="' + M.f + '"><path d="' + M.p + '"/></g>' +
        '<text x="' + cx + '" y="' + (sub ? ly : ly + 4) + '" text-anchor="middle" font-size="' + lsz + '" font-weight="700" fill="var(--hc-fg)" font-family="Roboto,Arial,sans-serif">' + M.l + '</text>' +
        (sub ? '<text x="' + cx + '" y="' + sy + '" text-anchor="middle" font-size="9.5" fill="var(--hc-muted)" font-family="Roboto,Arial,sans-serif">' + esc(sub) + '</text>' : '');
      return '<svg class="dial' + (cfg.legend ? ' tap' : '') + '" ' + (cfg.legend ? 'data-act="leg" role="button" tabindex="0" ' : 'role="img" ') + 'aria-label="Quadrante dell’allarme: ' + M.l + '" width="200" height="200" viewBox="0 0 200 200">' + a + '</svg>';
    }

    _armedTotal() {
      const n = nowH();
      return this._segments().reduce((t, s) => t + ((s.m === 'home' || s.m === 'away') ? Math.max(0, Math.min(s.b, n) - s.a) : 0), 0);
    }

    /* ---- commands ---- */
    _cmds(mode, st) {
      const b = (cls, icon, label, act) => '<button type="button" class="cmd ' + cls + '" data-act="' + act + '" data-focus="' + act + '">' + ic(icon) + label + '</button>';
      if (mode === 'home') return b('p', 'mdi:shield-off', 'Disattiva', 'disarm') + b('', 'mdi:shield-lock', 'Fuori casa', 'arm_away');
      if (mode === 'away') return b('p', 'mdi:shield-off', 'Disattiva', 'disarm') + b('', 'mdi:shield-home', 'In casa', 'arm_home');
      if (mode === 'trig') return b('c', 'mdi:shield-off', 'Disattiva', 'disarm');
      if (mode === 'off') return b('p', 'mdi:shield-home', 'In casa', 'arm_home') + b('', 'mdi:shield-lock', 'Fuori casa', 'arm_away');
      if (mode === 'pend') return b('p', 'mdi:shield-off', 'Disattiva', 'disarm');
      return '';
    }

    _needsCode(st) { return !!(st && st.attributes && st.attributes.code_format); }

    _arm(act) {
      const st = stOf(this._hass, this._cfg.entity);
      if (!st) return;
      const needArm = !!(st.attributes && st.attributes.code_arm_required && this._needsCode(st));
      if (needArm) { this._openKeypad(act); return; }
      this._call('alarm_control_panel', 'alarm_' + act, { entity_id: this._cfg.entity }, 'Comando non riuscito. Riprova.');
    }
    _call(domain, service, data, failMsg) {
      try {
        Promise.resolve(this._hass.callService(domain, service, data)).then(() => { /* state arrives through hass */ }, () => { this._flash(failMsg || 'Comando non riuscito.'); });
      } catch (e) { this._flash(failMsg || 'Comando non riuscito.'); }
    }
    _flash(t) {
      this._msg = t; this._render();
      window.clearTimeout(this._msgT);
      this._msgT = window.setTimeout(() => { this._msg = ''; this._render(); }, 5000);
    }

    _openKeypad(act) {
      this._ret = act === 'disarm' ? 'disarm' : act;
      this._view = 'keypad'; this._act = act; this._code = ''; this._err = ''; this._busy = false;
      this._popup = true; this._focus = 'close';
      document.addEventListener('keydown', this._onKey, true);
      this._render();
    }
    _submit() {
      const st = stOf(this._hass, this._cfg.entity);
      if (this._busy || !st) return;
      const need = this._needsCode(st);
      if (need && !this._code) return;
      this._busy = true; this._err = ''; this._render();
      const data = { entity_id: this._cfg.entity };
      if (this._code) data.code = this._code;
      const act = this._act;
      const fin = (ok) => {
        this._busy = false;
        if (ok) { this._code = ''; this._closePopup(); return; }
        this._err = 'Codice non corretto o comando rifiutato.'; this._code = ''; this._shake = true; this._focus = 'close'; this._render(); this._shake = false;
      };
      try { Promise.resolve(this._hass.callService('alarm_control_panel', 'alarm_' + act, data)).then(() => fin(true), () => fin(false)); } catch (e) { fin(false); }
    }

    _openDetails(mod) {
      const issues = this._allIssues();
      this._view = 'details'; this._filter = issues ? 'v' : 'a'; this._focusMod = mod || null; this._gv = mod ? 'type' : 'room';
      if (mod) this._filter = 'a';
      this._ret = mod ? 'tile-' + mod : 'details'; this._popup = true; this._focus = 'close';
      document.addEventListener('keydown', this._onKey, true);
      this._render();
    }
    _openSiren(id) {
      this._view = 'siren'; this._sirenId = id; this._ret = 'tile-siren'; this._popup = true; this._focus = 'close';
      document.addEventListener('keydown', this._onKey, true);
      this._render();
    }
    _closePopup(silent) {
      if (!this._popup) return;
      this._popup = false; this._view = 'list'; this._code = ''; this._err = ''; this._busy = false; this._focusMod = null;
      document.removeEventListener('keydown', this._onKey, true);
      this._focus = silent ? '' : this._ret; this._render();
    }

    _mods() { return this._cfg.order.filter((k) => this._cfg.modules[k].on && this._cfg.modules[k].entities.length); }
    _items(k) { return itemsOf(this._hass, this._cfg, k, this._volPend); }
    _allIssues() {
      return this._mods().reduce((n, k) => n + this._items(k).filter((i) => i.lv).length, 0);
    }

    /* ---- markup ---- */
    _row(it, extra) {
      return '<div class="row ' + it.lv + '"><div class="ico">' + ic(it.icon) + '</div><div class="t"><div class="rn">' + esc(it.name) + '</div>' + (it.sub ? '<div class="rs">' + esc(it.sub) + '</div>' : '') + '</div>' + (extra || '') + '</div>';
    }
    _section(k) { return this._itemsHTML(k, this._items(k)); }
    _itemsHTML(k, items) {
      if (k === 'cameras') {
        return '<div class="cams">' + items.map((it) => '<button type="button" class="cam" data-act="cam" data-id="' + esc(it.id) + '" aria-label="' + esc(it.name) + '">' + (it.pic && !it.off ? '<img src="' + esc(it.pic) + '" alt="" loading="lazy">' : ic('mdi:cctv')) + '<span class="lv ' + (it.off ? 'off' : '') + '"><i></i>' + (it.off ? 'OFFLINE' : 'LIVE') + '</span><span class="n">' + esc(it.name) + '</span></button>').join('') + '</div>';
      }
      return items.map((it) => {
        if (k === 'siren') return this._row(it, '<button type="button" class="sw crit ' + (it.on ? 'on' : '') + '" data-act="siren" data-id="' + esc(it.id) + '" aria-label="Sirena ' + esc(it.name) + '" ' + (it.na ? 'disabled' : '') + '></button>');
        if (k === 'volumes') {
          if (it.na) return this._row(it);
          const unl = !!this._vunl[it.id];
          const lkb = '<button type="button" class="rl ' + (unl ? 'open' : '') + '" data-act="vlock" data-id="' + esc(it.id) + '" data-focus="vl-' + esc(it.id) + '" aria-label="' + (unl ? 'Blocca la modifica di ' : 'Sblocca la modifica di ') + esc(it.name) + '">' + ic(unl ? 'mdi:lock-open-variant' : 'mdi:lock') + '</button>';
          if (!unl) return this._row(Object.assign({}, it, { sub: '' }), '<strong class="vv">' + esc(it.val) + '</strong>' + lkb);
          const dl = Math.max(it.step, Math.round(((it.max - it.min) / 10) / it.step) * it.step);
          return this._row(Object.assign({}, it, { sub: '' }), '<div class="stp"><button type="button" data-act="vol" data-focus="vm-' + esc(it.id) + '" data-id="' + esc(it.id) + '" data-d="' + (-dl) + '" aria-label="Diminuisci ' + esc(it.name) + '" ' + (it.num <= it.min ? 'disabled' : '') + '>−</button><strong>' + esc(it.val) + '</strong><button type="button" data-act="vol" data-focus="vp-' + esc(it.id) + '" data-id="' + esc(it.id) + '" data-d="' + dl + '" aria-label="Aumenta ' + esc(it.name) + '" ' + (it.num >= it.max ? 'disabled' : '') + '>+</button></div>' + lkb);
        }
        if (k === 'settings') {
          if (it.na || !it.options.length) return this._row(Object.assign({}, it, { sub: it.na ? it.sub : it.cur }));
          return this._row(Object.assign({}, it, { sub: '' }), '<select class="sp" data-sel="' + esc(it.id) + '" aria-label="' + esc(it.name) + '">' + it.options.map((o) => '<option value="' + esc(o) + '" ' + (o === it.cur ? 'selected' : '') + '>' + esc(o) + '</option>').join('') + '</select>');
        }
        return this._row(it);
      }).join('');
    }

    _hasRooms() {
      return this._mods().some((k) => this._items(k).some((it) => areaOf(this._hass, it.id)));
    }
    _groupsHTML(filter) {
      const mods = this._mods();
      let b = '';
      const none = () => '<div class="grp"><div class="rh"><span>Tutto in ordine</span><em class="o">nessuna segnalazione</em></div>' + this._row({ lv: '', icon: 'mdi:check', name: 'Nessuna segnalazione', sub: 'Ok' }) + '</div>';
      if (this._gv === 'room' && this._hasRooms()) {
        const bk = {};
        mods.forEach((k) => this._items(k).forEach((it) => {
          if (filter === 'v' && !it.lv) return;
          const a = areaOf(this._hass, it.id), key = a ? a.id : '';
          (bk[key] = bk[key] || { name: a ? a.name : '', mods: {} }).mods[k] = (bk[key].mods[k] || []).concat([it]);
        }));
        const keys = Object.keys(bk).filter((x) => x !== '').sort((x, y) => bk[x].name.localeCompare(bk[y].name, 'it'));
        if (!keys.length && !bk['']) return none();
        const grp = (title, g, lock, first) => {
          const ord = mods.filter((k) => g.mods[k]).sort((x, y) => (x === first ? -1 : 0) - (y === first ? -1 : 0)), all = [].concat.apply([], ord.map((k) => g.mods[k])), bad = all.filter((i) => i.lv);
          return '<div class="grp"><div class="rh"><span>' + esc(title) + '</span>' + '' + '<em class="' + (bad.some((i) => i.lv === 'crit') ? 'c' : bad.length ? 'w' : 'o') + '">' + (bad.length ? bad.length + ' in attenzione' : 'Tutto ok') + '</em></div>' +
            ord.map((k) => filter === 'v' ? g.mods[k].map((i) => this._row(i)).join('') : this._itemsHTML(k, g.mods[k])).join('') + '</div>';
        };
        keys.forEach((key) => { b += grp(bk[key].name, bk[key], !!bk[key].mods.volumes && filter !== 'v'); });
        // Devices without a room are not a room: they follow. Battery, tamper, volumes and settings that
        // belong to the same Home Assistant device as the siren (or the base station) are listed under it.
        if (bk['']) {
          const free = bk[''].mods, ent = this._hass.entities || {}, devOf = (id) => (ent[id] && ent[id].device_id) || '';
          const dev = { siren: {}, station: {} };
          ['siren', 'station'].forEach((an) => { if (mods.indexOf(an) >= 0) this._cfg.modules[an].entities.forEach((id) => { if (devOf(id)) dev[an][devOf(id)] = 1; }); });
          const sub = { siren: {}, station: {} }, rest = {};
          Object.keys(free).forEach((m) => free[m].forEach((it) => {
            const d = devOf(it.id), an = ['batteries', 'tamper', 'volumes', 'settings'].indexOf(m) >= 0 && d ? (dev.siren[d] ? 'siren' : dev.station[d] ? 'station' : '') : '';
            if (an) sub[an][m] = (sub[an][m] || []).concat([it]); else rest[m] = (rest[m] || []).concat([it]);
          }));
          mods.forEach((k) => {
            const g = { mods: {} };
            if (rest[k]) g.mods[k] = rest[k];
            if (sub[k]) Object.keys(sub[k]).forEach((m) => { g.mods[m] = sub[k][m]; });
            if (Object.keys(g.mods).length) b += grp(MODS[k].title, g, !!g.mods.volumes && filter !== 'v', k);
          });
        }
        return b;
      }
      if (filter === 'v') {
        let any = false;
        mods.forEach((k) => {
          const L = this._items(k).filter((i) => i.lv);
          if (!L.length) return;
          any = true;
          b += '<div class="grp"><div class="rh"><span>' + esc(MODS[k].title) + '</span><em class="' + (L.some((i) => i.lv === 'crit') ? 'c' : 'w') + '">' + L.length + ' in attenzione</em></div>' + L.map((i) => this._row(i)).join('') + '</div>';
        });
        return any ? b : none();
      }
      mods.forEach((k) => {
        const s = summaryOf(k, this._items(k));
        b += '<div class="grp" data-mod="' + k + '"><div class="rh"><span>' + esc(MODS[k].title) + '</span>' + '<em class="' + (s.lv === 'ok' ? 'o' : s.lv === 'crit' ? 'c' : 'w') + '">' + esc(s.t) + '</em></div>' + this._section(k) + '</div>';
      });
      return b;
    }

    _popupHTML() {
      const x = '<button type="button" class="x" data-act="close" data-focus="close" aria-label="Chiudi">' + ic('mdi:close') + '</button>';
      const st = stOf(this._hass, this._cfg.entity);
      if (this._view === 'details') {
        const chips = '<div class="chips"><button type="button" class="chip" data-filter="v" aria-pressed="' + (this._filter === 'v') + '" data-focus="fv">Attenzione</button><button type="button" class="chip" data-filter="a" aria-pressed="' + (this._filter === 'a') + '" data-focus="fa">Tutti</button></div>';
        return '<dialog class="ov" data-act="ovclose" aria-label="Dettagli e stato"><div class="dlg"><div class="mh"><h2 class="mt">Dettagli e stato</h2>' + x + '</div><div class="mb"><div class="cols">' + chips + this._groupsHTML(this._filter) + '</div></div></div></dialog>';
      }
      if (this._view === 'siren') {
        const so = !!this._sirenOff;
        return '<dialog class="ov" data-act="ovclose" aria-label="' + (so ? 'Spegnere la sirena' : 'Attivare la sirena') + '"><div class="dlg small"><div class="cf"><div class="wi">' + ic('mdi:bullhorn-outline') + '</div><h3>' + (so ? 'Spegnere la sirena?' : 'Attivare la sirena?') + '</h3><p>' + (so ? 'La sirena verrà spenta subito.' : 'La sirena suonerà subito. Potrai spegnerla da qui.') + '</p><div class="cmds"><button type="button" class="cmd" data-act="close" data-focus="close">Annulla</button><button type="button" class="cmd ' + (so ? 'p' : 'c') + '" data-act="siren-yes" data-focus="yes">' + (so ? 'Spegni sirena' : 'Attiva sirena') + '</button></div></div></div></dialog>';
      }
      // keypad
      const mode = alarmMode(st ? st.state : ''), need = this._needsCode(st), text = st && st.attributes && st.attributes.code_format === 'text';
      const lab = { home: 'In casa', away: 'Fuori casa', off: 'Disinserito', trig: 'Allarme scattato', pend: 'In corso', unk: 'Non disponibile' }[mode];
      const after = { disarm: 'Disinserito', arm_home: 'In casa', arm_away: 'Fuori casa' }[this._act];
      const orbBg = mode === 'trig' ? 'var(--hc-crit-bg)' : mode === 'away' ? 'var(--hc-away)' : mode === 'off' || mode === 'pend' || mode === 'unk' ? 'var(--hc-warn-bg)' : 'var(--hc-accent)';
      const orbFg = mode === 'off' || mode === 'pend' || mode === 'unk' ? 'var(--hc-warn-fg)' : '#fff';
      const sh = SHIELD[mode === 'unk' || mode === 'pend' ? 'off' : mode];
      const dots = Math.max(4, this._code.length);
      const sz = this._wide() ? ' small' : '';
      let input;
      if (text) input = '<input class="code" type="password" id="code" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Codice" value="' + esc(this._code) + '" data-focus="code">';
      else input = '<div class="dotrow"><div class="dots ' + (this._shake ? 'shake' : '') + '" id="dots">' + Array.from({ length: dots }, (_, i) => '<i class="' + (i < this._code.length ? 'f' : '') + '"></i>').join('') + '</div></div>';
      const kb = (k) => '<button type="button" data-act="key" data-k="' + k + '" aria-label="' + k + '"><b>' + k + '</b></button>';
      const keys = text ? '' : '<div class="keys">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(kb).join('') + '<span></span>' + kb(0) + '<button type="button" class="bk" data-act="back" aria-label="Cancella l’ultima cifra" ' + (this._code ? '' : 'disabled') + '>' + ic('mdi:backspace-outline') + '</button></div>';
      const label = this._act === 'disarm' ? 'Disattiva allarme' : this._act === 'arm_home' ? 'Inserisci in casa' : 'Inserisci fuori casa';
      return '<dialog class="ov" data-act="ovclose" aria-label="Allarme"><div class="dlg' + sz + '"><div class="mh"><h2 class="mt">Allarme</h2>' + x + '</div><div class="mb">' +
        '<div class="abig"><div class="orb" style="background:' + orbBg + ';color:' + orbFg + '"><svg viewBox="0 0 24 24"><path fill="currentColor" d="' + sh + '"/></svg></div><div><div class="vt">' + lab + '</div><div class="vs">' + esc(this._cfg.title || 'Allarme') + '</div></div></div>' +
        '<div class="ast"><div><span>Ora</span><b>' + lab + '</b></div><div><span>Dopo il comando</span><b>' + after + '</b></div></div>' +
        (need ? '<div class="lbl">Codice richiesto</div>' : '<div class="warnt">Nessun codice impostato in Home Assistant: il tastierino non verifica nulla.</div>') +
        input + '<div class="err" id="err" role="alert">' + esc(this._err) + '</div>' + keys +
        '<button type="button" class="acta' + (this._act === 'disarm' && mode === 'trig' ? ' c' : '') + '" data-act="submit" data-focus="submit" ' + ((need && !this._code) || this._busy ? 'disabled' : '') + '>' + (this._busy ? 'Invio…' : label) + '</button>' +
        '<div class="note" style="text-align:center;margin-top:10px">Il codice si digita ogni volta e non viene mai salvato. Lo verifica Home Assistant.</div></div></div></dialog>';
    }

    _render() {
      if (!this._cfg) return;
      const root = this._root, cfg = this._cfg, hass = this._hass;
      const body0 = root.querySelector('.mb'), keep = body0 ? body0.scrollTop : 0;
      const active = this.shadowRoot.activeElement;
      const want = this._focus || (active && active.getAttribute ? active.getAttribute('data-focus') : '');
      const typed = active && active.id === 'code' ? { v: active.value, s: active.selectionStart } : null;
      this._focus = '';
      if (!hass) { root.innerHTML = '<div class="hc" data-mode="' + this._mode() + '"><div class="cardw"><div class="shell"><div class="empty">Caricamento…</div></div></div></div>'; return; }
      const h0 = root.offsetHeight; if (h0) root.style.minHeight = h0 + 'px';
      const mods = this._mods();
      let h = '<div class="shell">';
      const hasHead = (cfg.show_title && cfg.title) || (cfg.show_eyebrow && cfg.eyebrow);
      const dtlInHead = !!(hasHead && cfg.panel && mods.length);
      if (hasHead) {
        const ht = (cfg.show_eyebrow && cfg.eyebrow ? '<div class="eye">' + esc(cfg.eyebrow) + '</div>' : '') + (cfg.show_title && cfg.title ? '<div class="title" role="heading" aria-level="2">' + esc(cfg.title) + '<b>.</b></div>' : '');
        h += dtlInHead ? '<div class="head hb"><div class="ht">' + ht + '</div><button type="button" class="detail dtl" data-act="details" data-focus="details" aria-label="Dettagli e stato" title="Dettagli e stato">' + ic('mdi:chevron-right') + '</button></div>' : '<div class="head">' + ht + '</div>';
      }
      if (cfg.panel) {
        const st = cfg.entity ? stOf(hass, cfg.entity) : null;
        if (!cfg.entity) h += '<div class="panel"><div class="empty">Scegli l’entità dell’allarme dalla configurazione della card.</div></div>';
        else {
          const mode = alarmMode(st ? st.state : '');
          h += '<div class="panel has-dial">' + this._dial(mode, st) + (cfg.commands ? '<div class="cmds">' + this._cmds(mode, st) + '</div>' : '') + (this._msg ? '<div class="msg" role="alert">' + esc(this._msg) + '</div>' : '');
          if (this._leg && cfg.legend) {
            const n = nowH();
            h += '<div class="leg" data-act="leg"><b>Oggi inserito ' + durH(this._armedTotal()) + '</b><div class="l"><span><i style="background:var(--hc-accent)"></i>In casa</span><span><i style="background:var(--hc-away)"></i>Fuori casa</span><span><i style="background:var(--hc-warn-bd)"></i>Non inserito</span></div><p>Quadrante da 12 ore: ora mostra ' + (n >= 12 ? 'il pomeriggio (12–24)' : 'la mattina (0–12)') + '.' + (this._histOk ? '' : ' Storico non disponibile: mostro solo lo stato attuale.') + '</p></div>';
          }
          h += '</div>';
        }
        const tiles = mods.filter((k) => cfg.modules[k].tile);
        if (tiles.length) {
          h += '<div class="lst">' + tiles.map((k) => {
            const s = summaryOf(k, this._items(k));
            return '<button type="button" class="tile ' + (s.lv === 'ok' ? '' : s.lv) + '" data-act="' + (k === 'siren' ? 'siren-tile' : 'tile') + '" data-m="' + k + '" data-focus="tile-' + k + '"><div class="ico">' + ic(MODS[k].icon) + '</div><div class="t"><div class="rn">' + esc(MODS[k].short) + '</div></div><div class="rs st">' + esc(s.t) + '</div>' + ic('mdi:chevron-right', ' class="chev"') + '</button>';
          }).join('') + new Array((3 - (tiles.length % 3)) % 3 + 1).join('<span class="tile ph" aria-hidden="true"></span>') + '</div>';
        }
        if (mods.length && !dtlInHead) h += '<button type="button" class="detail" data-act="details" data-focus="details">Dettagli e stato ' + ic('mdi:chevron-right') + '</button>';
      } else {
        if (!mods.length) h += '<div class="empty">Nessun modulo con entità: scegli le entità dalla configurazione della card.</div>';
        mods.forEach((k) => {
          h += (mods.length > 1 ? '<div class="lab">' + esc(MODS[k].title) + '</div>' : '') + this._section(k);
        });
      }
      h += '</div>';
      root.innerHTML = '<div class="hc" data-mode="' + this._mode() + '"' + ' data-cw="' + cfg.width + '"' + '><div class="cardw">' + h + '</div>' + (this._popup ? this._popupHTML() : '') + '</div>';
      const modal = root.querySelector('dialog.ov');
      if (modal) {
        modal.addEventListener('cancel', (ev) => ev.preventDefault());
        // Top layer: the popup is centred on the screen whatever the dashboard around the card does.
        try { if (typeof modal.showModal === 'function') modal.showModal(); else modal.setAttribute('open', ''); } catch (err) { modal.setAttribute('open', ''); }
      }
      const nb = root.querySelector('.mb');
      if (nb) {
        nb.scrollTop = keep;
        if (this._focusMod) {
          const g = nb.querySelector('[data-mod="' + this._focusMod + '"]');
          if (g) nb.scrollTop = Math.max(0, nb.scrollTop + g.getBoundingClientRect().top - nb.getBoundingClientRect().top - 6);
          this._focusMod = null;
        }
      }
      if (this._popup) this._lockScroll();
      if (h0) window.requestAnimationFrame(() => { root.style.minHeight = ''; });
      if (typed) { const el = root.querySelector('#code'); if (el) { el.focus({ preventScroll: true }); try { el.setSelectionRange(typed.s, typed.s); } catch (e) { /* ignore */ } } }
      else if (want) { const el = root.querySelector('[data-focus="' + want + '"]'); if (el) el.focus({ preventScroll: true }); }
    }

    // Groups flow into columns, each under the shortest one, so the wide popup has no empty gaps.
    _masonry() {
      if (!this._popup || this._view !== 'details') return;
      const c = this._root.querySelector('.cols');
      if (!c) return;
      const n = this._colCount();
      if (n < 2) return;
      const gs = [].slice.call(c.querySelectorAll(':scope > .grp'));
      if (!gs.length) return;
      const hs = gs.map((g) => g.offsetHeight + 16), row = document.createElement('div');
      row.className = 'mrow';
      const cols = [], H = [];
      for (let i = 0; i < n; i++) { const d = document.createElement('div'); d.className = 'mcol'; row.appendChild(d); cols.push(d); H.push(0); }
      gs.forEach((g, i) => {
        let m = 0;
        for (let k = 1; k < n; k++) if (H[k] < H[m]) m = k;
        cols[m].appendChild(g); H[m] += hs[i];
      });
      c.appendChild(row);
    }

    // While the popup is open the dashboard behind must not move.
    _lockScroll() {
      const overlay = this._root.querySelector('.ov');
      if (!overlay) return;
      const body = overlay.querySelector('.mb');
      const atEdge = (dy) => !body || (dy < 0 && body.scrollTop <= 0) || (dy > 0 && body.scrollTop + body.clientHeight >= body.scrollHeight - 1);
      overlay.addEventListener('wheel', (e) => { if (!body || !body.contains(e.target) || atEdge(e.deltaY)) e.preventDefault(); }, { passive: false });
      let y = 0;
      overlay.addEventListener('touchstart', (e) => { const t = e.touches[0]; y = t ? t.clientY : 0; }, { passive: true });
      overlay.addEventListener('touchmove', (e) => { const t = e.touches[0], dy = y - (t ? t.clientY : y); if (!body || !body.contains(e.target) || atEdge(dy)) e.preventDefault(); }, { passive: false });
    }

    _click(e) {
      const t = e.target.closest ? e.target.closest('[data-act],[data-filter]') : null;
      if (!t) return;
      if (t.dataset.filter) { this._filter = t.dataset.filter; this._focus = t.dataset.focus || ''; this._render(); return; }
      const a = t.dataset.act, hass = this._hass;
      if (a === 'ovclose') { if (e.target === t) this._closePopup(); return; }
      if (a === 'close') { this._closePopup(); return; }
      if (a === 'leg') { this._leg = !this._leg; this._render(); return; }
      if (a === 'details') { this._openDetails(); return; }
      if (a === 'tile') { this._openDetails(t.dataset.m); return; }
      if (a === 'disarm') { this._openKeypad('disarm'); return; }
      if (a === 'arm_home' || a === 'arm_away') { this._arm(a); return; }
      if (a === 'key') { if (this._code.length < 12 && !this._busy) { this._code += t.dataset.k; this._err = ''; this._focus = ''; this._render(); } return; }
      if (a === 'back') { this._code = this._code.slice(0, -1); this._err = ''; this._render(); return; }
      if (a === 'submit') { this._submit(); return; }
      if (a === 'vlock') { const vid = t.dataset.id; this._vunl[vid] = !this._vunl[vid]; this._focus = 'vl-' + vid; this._sig = null; this._render(); return; }
      if (a === 'vol') {
        const id = t.dataset.id, s = stOf(hass, id); if (!s) return;
        const at = s.attributes || {}, mn = isNum(at.min) ? Number(at.min) : 0, mx = isNum(at.max) ? Number(at.max) : 100;
        const base = this._volPend[id] != null ? this._volPend[id] : Number(s.state);
        if (!isNum(base)) return;
        const v = Math.max(mn, Math.min(mx, Math.round((base + Number(t.dataset.d)) * 1000) / 1000));
        this._volPend[id] = v; this._sig = null; this._focus = t.dataset.focus || '';
        window.setTimeout(() => { if (this._volPend[id] === v) { delete this._volPend[id]; this._sig = null; if (this._popup || this._cfg) this._render(); } }, 4000);
        this._call('number', 'set_value', { entity_id: id, value: v }, 'Volume non modificato.');
        this._render(); return;
      }
      if (a === 'siren-tile' || a === 'siren') {
        const id = t.dataset.id || (this._cfg.modules.siren.entities.find((i) => { const s = stOf(hass, i); return s && s.state === 'on'; }) || this._cfg.modules.siren.entities[0]);
        const s = stOf(hass, id); if (!s || missing(s)) return;
        this._sirenOff = s.state === 'on';
        this._openSiren(id);
        return;
      }
      if (a === 'siren-yes') { const id = this._sirenId, off = this._sirenOff; this._closePopup(true); this._call(id.split('.')[0], off ? 'turn_off' : 'turn_on', { entity_id: id }, off ? 'Sirena non spenta.' : 'Sirena non attivata.'); return; }
      if (a === 'cam') { const id = t.dataset.id; if (this._popup) this._closePopup(true); this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: id }, bubbles: true, composed: true })); }
    }
    _change(e) {
      const el = e.target;
      if (el && el.dataset && el.dataset.sel) this._call('select', 'select_option', { entity_id: el.dataset.sel, option: el.value }, 'Impostazione non modificata.');
      if (el && el.id === 'code') { this._code = el.value; this._err = ''; }
    }
    _key(e) {
      if (!this._popup) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this._closePopup(); return; }
      if (this._view === 'keypad') {
        const st = stOf(this._hass, this._cfg.entity), text = st && st.attributes && st.attributes.code_format === 'text';
        const inInput = this.shadowRoot.activeElement && this.shadowRoot.activeElement.id === 'code';
        if (inInput) {
          if (e.key === 'Enter') { e.preventDefault(); this._code = this.shadowRoot.activeElement.value; this._submit(); return; }
        } else if (!text) {
          if (/^[0-9]$/.test(e.key)) { e.preventDefault(); if (this._code.length < 12 && !this._busy) { this._code += e.key; this._err = ''; this._render(); } return; }
          if (e.key === 'Backspace') { e.preventDefault(); this._code = this._code.slice(0, -1); this._render(); return; }
          if (e.key === 'Enter') { e.preventDefault(); this._submit(); return; }
        }
      }
      if (e.key === 'Tab') {
        const dlg = this._root.querySelector('.dlg'); if (!dlg) return;
        const f = [].slice.call(dlg.querySelectorAll('button:not([disabled]),input,select')); if (!f.length) return;
        const first = f[0], last = f[f.length - 1], act = this.shadowRoot.activeElement;
        if (e.shiftKey && act === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && act === last) { e.preventDefault(); first.focus(); }
        else if (!dlg.contains(act)) { e.preventDefault(); first.focus(); }
      }
    }
  }

  /* ----------------------------------------------------------- the editor */
  const EDITOR_CSS = `
:host{display:block;color:var(--primary-text-color,#19221E);font-family:var(--ha-font-family-body,Roboto,Arial,sans-serif)}
*{box-sizing:border-box}
.ed{font-size:14px}
button,input,select{font:inherit;color:inherit}
.tabs{display:flex;gap:5px;overflow-x:auto;padding-bottom:14px;border-bottom:1px solid var(--divider-color,#E1E5E1)}
.tab{border:0;background:none;color:var(--secondary-text-color,#68716C);border-radius:13px;padding:10px 13px;white-space:nowrap;cursor:pointer}
.tab[aria-pressed="true"]{color:var(--primary-text-color,#19221E);background:var(--secondary-background-color,#F1F3EF);font-weight:650}
.heading{font-size:21px;font-weight:500;margin:25px 0 9px}
.desc{color:var(--secondary-text-color,#68716C);font-size:13px;line-height:1.5;margin-bottom:20px}
.field{display:block;margin:18px 0}
.label{font-size:14px;margin-bottom:10px}
.input{display:block;width:100%;background:var(--secondary-background-color,#F1F3EF);color:var(--primary-text-color,#19221E);border:0;border-bottom:1px solid var(--divider-color,#E1E5E1);padding:14px 13px;min-height:50px;border-radius:11px 11px 0 0}
.row{border-bottom:1px solid var(--divider-color,#E1E5E1);padding:13px 0;display:flex;align-items:center;justify-content:space-between;gap:15px}
.row label{flex:1;min-width:0}
.row input[type=checkbox]{width:18px;height:18px;accent-color:var(--primary-color,#064E3B);flex:none}
.muted{font-size:12px;line-height:1.5;color:var(--secondary-text-color,#68716C)}
.tiny{font-size:11px;color:var(--secondary-text-color,#68716C);margin:9px 0}
.action{background:var(--secondary-background-color,#F1F3EF);border:1px solid var(--divider-color,#E1E5E1);color:var(--primary-text-color,#19221E);padding:5px 9px;min-width:34px;border-radius:10px;cursor:pointer}
.action:disabled{opacity:.45;cursor:not-allowed}
.mod{border-bottom:1px solid var(--divider-color,#E1E5E1);padding:16px 0}
.mh{display:flex;align-items:center;gap:10px}
.mh .nm{flex:1;min-width:0;font-weight:600;font-size:15px}
.ctl{display:flex;gap:6px;flex:none}
.mb{margin-top:10px}
.chk{display:flex;align-items:center;gap:10px;margin:8px 0;font-size:13px}
.chk input{width:18px;height:18px;accent-color:var(--primary-color,#064E3B)}
`;

  class AlarmKeeperCardEditor extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._config = {}; this._hass = null; this._tab = 'allarme'; this._last = ''; this._built = false;
      this.shadowRoot.addEventListener('click', (e) => this._click(e));
      this.shadowRoot.addEventListener('change', (e) => this._change(e));
      this.shadowRoot.addEventListener('input', (e) => this._input(e));
    }
    setConfig(config) {
      const j = JSON.stringify(config || {});
      if (this._built && j === this._last) return;
      this._config = clone(config || {}); this._last = j; this._render();
    }
    set hass(h) {
      const first = !this._hass; this._hass = h;
      if (first && this._built) this._render();
      else this.shadowRoot.querySelectorAll('ha-selector').forEach((s) => { s.hass = h; });
    }
    get hass() { return this._hass; }

    _emit(cfg) {
      this._config = cfg; this._last = JSON.stringify(cfg);
      this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: cfg }, bubbles: true, composed: true }));
    }
    _norm() { try { return normalizeConfig(this._config); } catch (e) { return normalizeConfig({}); } }
    _set(key, value) { const c = clone(this._config); if (value === undefined || value === '') delete c[key]; else c[key] = value; this._emit(c); }
    _setMod(k, patch) {
      const n = this._norm(), c = clone(this._config);
      c.modules = c.modules || {};
      c.modules[k] = Object.assign({}, n.modules[k], patch);
      c.order = n.order;
      this._emit(c);
    }

    _field(label, inner, help) { return '<div class="field"><div class="label">' + esc(label) + '</div>' + inner + (help ? '<div class="tiny">' + esc(help) + '</div>' : '') + '</div>'; }
    _check(id, label, help, on) { return '<div class="row"><label for="' + id + '">' + esc(label) + (help ? '<div class="muted">' + esc(help) + '</div>' : '') + '</label><input type="checkbox" id="' + id + '" ' + (on ? 'checked' : '') + '></div>'; }

    _allarme(n) {
      return '<div class="heading">Allarme</div><div class="desc">Scegli la centrale e come si presenta il pannello. Il codice non viene mai salvato nella card: lo digiti ogni volta e lo verifica Home Assistant.</div>' +
        this._field('Entità allarme', '<div data-slot="entity"></div>', 'Qualsiasi entità del dominio alarm_control_panel.') +
        this._check('panel', 'Pannello allarme', 'Quadrante con le ore di oggi, comandi e riquadri. Spento: la card mostra solo i moduli scelti.', n.panel) +
        this._check('commands', 'Comandi attivi', 'Pulsanti In casa, Fuori casa e Disattiva. Spenti: il pannello resta in sola lettura.', n.commands) +
        this._check('legend', 'Legenda al tocco', 'Toccando il quadrante compaiono i colori e il totale di oggi.', n.legend) +
        this._check('hands', 'Lancette', 'Spente di default: il punto sul bordo segna già l’ora attuale.', n.hands);
    }
    _moduli(n) {
      let h = '<div class="heading">Moduli</div><div class="desc">Scegli le entità di ogni modulo dai selettori. Un modulo senza entità non compare. Ogni modulo funziona anche da solo: per averne uno solo su una card, spegni il pannello allarme e lascia attivo solo quel modulo.</div>';
      n.order.forEach((k, i) => {
        const m = n.modules[k];
        h += '<div class="mod"><div class="mh"><div class="nm">' + esc(MODS[k].title) + '</div><div class="ctl"><button type="button" class="action" data-move="' + i + ':-1" aria-label="Sposta su ' + esc(MODS[k].title) + '" ' + (i === 0 ? 'disabled' : '') + '>↑</button><button type="button" class="action" data-move="' + i + ':1" aria-label="Sposta giù ' + esc(MODS[k].title) + '" ' + (i === n.order.length - 1 ? 'disabled' : '') + '>↓</button></div></div>' +
          '<div class="muted" style="margin-top:6px">' + esc(MODS[k].help) + '</div>' +
          '<div class="mb"><div class="chk"><input type="checkbox" id="on-' + k + '" data-on="' + k + '" ' + (m.on ? 'checked' : '') + '><label for="on-' + k + '">Modulo attivo</label></div>' +
          (n.panel ? '<div class="chk"><input type="checkbox" id="tile-' + k + '" data-tile="' + k + '" ' + (m.tile ? 'checked' : '') + '><label for="tile-' + k + '">Riga nell’elenco della card</label></div>' : '') +
          '<div data-slot="mod-' + k + '"></div>' + this._roomPick(k, m) + '</div></div>';
      });
      return h;
    }
    // Rooms (Home Assistant areas) that hold compatible devices not yet in the module.
    _roomsFor(k, m) {
      const h = this._hass, f = MODS[k].sel && MODS[k].sel.filter;
      if (!h || !h.states || !h.areas || ROOM_MODS.indexOf(k) < 0 || !f) return [];
      const out = {};
      Object.keys(h.states).forEach((id) => {
        if (m.entities.indexOf(id) >= 0) return;
        const st = h.states[id], dc = st && st.attributes && st.attributes.device_class;
        const ok = f.some((x) => x.domain === id.split('.')[0] && (!x.device_class || [].concat(x.device_class).indexOf(dc) >= 0));
        if (!ok) return;
        const a = areaOf(h, id);
        if (a) (out[a.id] = out[a.id] || { id: a.id, name: a.name, ids: [] }).ids.push(id);
      });
      return Object.keys(out).map((x) => out[x]).sort((x, y) => x.name.localeCompare(y.name, 'it'));
    }
    _roomPick(k, m) {
      const rs = this._roomsFor(k, m);
      if (!rs.length) return '';
      return '<div class="field"><div class="label">Aggiungi da stanza</div><select class="input" data-room="' + k + '"><option value="">Scegli una stanza…</option>' + rs.map((r) => '<option value="' + esc(r.id) + '">' + esc(r.name) + ' (' + r.ids.length + ')</option>').join('') + '</select><div class="tiny">Aggiunge i dispositivi compatibili di quella stanza. Puoi sempre toglierne qualcuno dal selettore.</div></div>';
    }
    _aspetto(n) {
      return '<div class="heading">Aspetto Edera</div><div class="desc">Titolo, intestazione e tema, coerenti con le altre card.</div>' +
        this._field('Intestazione superiore', '<input class="input" type="text" id="eyebrow" maxlength="60" value="' + esc(n.eyebrow) + '">') +
        this._field('Titolo', '<input class="input" type="text" id="title" maxlength="60" value="' + esc(n.title) + '">', 'Il punto verde finale lo aggiunge la card.') +
        this._check('show-eyebrow', 'Mostra intestazione superiore', '', n.show_eyebrow) +
        this._check('show-title', 'Mostra titolo', '', n.show_title) +
        this._field('Larghezza su tablet e desktop', '<select class="input" id="cw">' + [['center', 'Stretta al centro'], ['left', 'Stretta a sinistra'], ['right', 'Stretta a destra'], ['full', 'Tutta la larghezza disponibile']].map((o) => '<option value="' + o[0] + '" ' + (n.width === o[0] ? 'selected' : '') + '>' + o[1] + '</option>').join('') + '</select>', 'Con “Tutta la larghezza” la card segue lo spazio che Home Assistant le assegna; le altre la limitano a 460 px.') +
        this._field('Tema', '<select class="input" id="theme">' + [['auto', 'Automatico (Home Assistant)'], ['light', 'Light Edera'], ['dark', 'Dark Edera']].map((o) => '<option value="' + o[0] + '" ' + (n.theme_mode === o[0] ? 'selected' : '') + '>' + o[1] + '</option>').join('') + '</select>');
    }
    _mount(slot, selector, value, cb) {
      const el = document.createElement('ha-selector');
      el.hass = this._hass; el.selector = selector; el.value = value; el.required = false;
      el.addEventListener('value-changed', (ev) => { ev.stopPropagation(); cb(ev.detail ? ev.detail.value : undefined); });
      slot.appendChild(el);
    }
    _render() {
      const n = this._norm(), t = this._tab;
      const act = this.shadowRoot.activeElement ? this.shadowRoot.activeElement.id : '';
      this.shadowRoot.innerHTML = '<style>' + EDITOR_CSS + '</style><div class="ed"><div class="tabs" role="group" aria-label="Sezioni">' +
        [['allarme', 'Allarme'], ['moduli', 'Moduli'], ['aspetto', 'Aspetto']].map((a) => '<button type="button" class="tab" data-tab="' + a[0] + '" id="t-' + a[0] + '" aria-pressed="' + (t === a[0]) + '">' + a[1] + '</button>').join('') + '</div>' +
        (t === 'allarme' ? this._allarme(n) : t === 'moduli' ? this._moduli(n) : this._aspetto(n)) + '</div>';
      this._built = true;
      const sl = (name) => this.shadowRoot.querySelector('[data-slot="' + name + '"]');
      if (sl('entity')) this._mount(sl('entity'), { entity: { domain: 'alarm_control_panel' } }, n.entity || undefined, (v) => this._set('entity', v || undefined));
      MOD_ORDER.forEach((k) => {
        const s = sl('mod-' + k);
        if (s) this._mount(s, { entity: Object.assign({ multiple: true }, MODS[k].sel) }, n.modules[k].entities, (v) => this._setMod(k, { entities: Array.isArray(v) ? v : [] }));
      });
      if (act) { const el = this.shadowRoot.getElementById(act); if (el && !el.disabled) el.focus({ preventScroll: true }); }
    }
    _click(e) {
      let t = e.target.closest('[data-tab]'); if (t) { this._tab = t.dataset.tab; this._render(); return; }
      t = e.target.closest('[data-move]');
      if (t) {
        const a = t.dataset.move.split(':').map(Number), i = a[0], j = i + a[1], n = this._norm();
        if (j < 0 || j >= n.order.length) return;
        const o = n.order.slice(), tmp = o[i]; o[i] = o[j]; o[j] = tmp;
        const c = clone(this._config); c.order = o; this._emit(c); this._render();
      }
    }
    _change(e) {
      const el = e.target, c = clone(this._config);
      if (el.dataset && el.dataset.on) { this._setMod(el.dataset.on, { on: el.checked }); return; }
      if (el.dataset && el.dataset.tile) { this._setMod(el.dataset.tile, { tile: el.checked }); return; }
      const map = { 'show-eyebrow': 'show_eyebrow', 'show-title': 'show_title', panel: 'panel', commands: 'commands', legend: 'legend', hands: 'hands' };
      if (map[el.id]) { c[map[el.id]] = el.checked; this._emit(c); if (el.id === 'panel') this._render(); return; }
      if (el.id === 'cw') { c.width = el.value; this._emit(c); return; }
      if (el.id === 'theme') { c.theme_mode = el.value; this._emit(c); return; }
      if (el.dataset && el.dataset.room && el.value) {
        const k = el.dataset.room, n = this._norm(), r = this._roomsFor(k, n.modules[k]).filter((x) => x.id === el.value)[0];
        if (r) { this._setMod(k, { entities: n.modules[k].entities.concat(r.ids) }); this._render(); }
      }
    }
    _input(e) {
      const el = e.target;
      if (el.id === 'eyebrow') this._set('eyebrow', el.value);
      else if (el.id === 'title') this._set('title', el.value);
    }
  }

  if (!customElements.get(TAG)) customElements.define(TAG, AlarmKeeperCard);
  if (!customElements.get(EDITOR_TAG)) customElements.define(EDITOR_TAG, AlarmKeeperCardEditor);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === TAG)) {
    window.customCards.push({ type: TAG, name: 'Alarm Keeper Card', description: 'Modular alarm card: 12-hour activity clock, code-protected disarming, siren confirmation and optional sensors, cameras, volumes and settings.', preview: true });
  }
  // eslint-disable-next-line no-console
  console.info('%c ALARM-KEEPER-CARD %c ' + VERSION + ' ', 'color:#fff;background:#0a7156;font-weight:700', 'color:#0a7156;background:#fff');
})();
