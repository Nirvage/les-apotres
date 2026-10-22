(function () {
'use strict';

const THEME_STORAGE_KEY = 'dnd_theme';
const DARK = 'dark';
const LIGHT = 'light';
const documentRoot = document.documentElement;
const systemPrefersDark = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;

function savedTheme() {
  try {
    const theme = localStorage.getItem(THEME_STORAGE_KEY);
    return theme === DARK || theme === LIGHT ? theme : null;
  } catch (error) {
    return null;
  }
}

function wantedTheme() {
  return savedTheme() || (systemPrefersDark && systemPrefersDark.matches ? DARK : LIGHT);
}

function parseHexColor(hex) {
  let digits = hex.slice(1);
  if (digits.length === 3 || digits.length === 4) digits = digits.replace(/./g, '$&$&');
  if (digits.length !== 6 && digits.length !== 8) return null;
  const channel = start => parseInt(digits.slice(start, start + 2), 16);
  return [channel(0), channel(2), channel(4), digits.length === 8 ? channel(6) / 255 : 1];
}

function parseAlpha(text) {
  return text.slice(-1) === '%' ? parseFloat(text) / 100 : parseFloat(text);
}

function parseRgbColor(argumentsText) {
  const parts = argumentsText.split(/[\s,\/]+/).filter(Boolean);
  if (parts.length < 3 || parts.some(part => /[a-z]/.test(part))) return null;
  const alpha = parts.length > 3 ? parseAlpha(parts[3]) : 1;
  return [parseFloat(parts[0]), parseFloat(parts[1]), parseFloat(parts[2]), alpha];
}

function parseColor(text) {
  const color = text.trim().toLowerCase();
  if (color === 'white') return [255, 255, 255, 1];
  if (color === 'black') return [0, 0, 0, 1];
  if (color[0] === '#') return parseHexColor(color);
  const rgbMatch = color.match(/^rgba?\(([^)]*)\)$/);
  return rgbMatch ? parseRgbColor(rgbMatch[1]) : null;
}

function rgbToHsl([red255, green255, blue255]) {
  const red = red255 / 255, green = green255 / 255, blue = blue255 / 255;
  const max = Math.max(red, green, blue), min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (!delta) return [0, 0, lightness];
  const saturation = lightness > .5 ? delta / (2 - max - min) : delta / (max + min);
  let hue;
  if (max === red) hue = (green - blue) / delta + (green < blue ? 6 : 0);
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;
  return [hue / 6, saturation, lightness];
}

function hslToHex(hue, saturation, lightness, alpha) {
  const channel = offset => {
    const k = (offset + hue * 12) % 12;
    const chroma = saturation * Math.min(lightness, 1 - lightness);
    return Math.round(255 * (lightness - chroma * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  const hex = '#' + [channel(0), channel(8), channel(4)].map(value => (value < 16 ? '0' : '') + value.toString(16)).join('');
  return alpha < 1 ? hex + Math.round(alpha * 255).toString(16).padStart(2, '0') : hex;
}

function darkBackgroundFor(color) {
  if (color[3] < .9) return null;
  const [hue, saturation, lightness] = rgbToHsl(color);
  if (lightness < .6) return null;
  if (saturation < .12) return hslToHex(.64, .22, .13 + (1 - lightness) * .5, color[3]);
  return hslToHex(hue, saturation * .55, .13 + (1 - lightness) * .5, color[3]);
}

function lightTextFor(color) {
  const [hue, saturation, lightness] = rgbToHsl(color);
  if (lightness > .5) return null;
  return hslToHex(hue, Math.min(1, saturation * 1.05), .64 + (.5 - lightness) * .55, color[3]);
}

function darkBorderFor(color) {
  if (color[3] < .5) return null;
  const [hue, saturation, lightness] = rgbToHsl(color);
  if (lightness >= .7) return hslToHex(hue, saturation * .5, .2 + (1 - lightness) * .6, color[3]);
  if (lightness < .38) return hslToHex(hue, saturation, .45 + (.38 - lightness) * .4, color[3]);
  return null;
}

const COLOR_TOKEN = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black)\b/gi;
const THEME_AWARE_VARIABLE = /var\(--(ink|soft|line|gold|bg)\b/;
const OTHER_VARIABLE = /var\(--(?!ink|soft|line|gold|bg)/;
const NO_BACKGROUND_VALUE = /^(none|transparent|initial|inherit|unset)\b/i;
const TEXT_COLOR_PROPERTIES = ['color', 'caret-color', '-webkit-text-fill-color'];

function replaceColors(value, convertColor) {
  let changed = false;
  const converted = value.replace(COLOR_TOKEN, token => {
    const color = parseColor(token);
    const replacement = color && convertColor(color);
    if (!replacement) return token;
    changed = true;
    return replacement;
  });
  return { value: converted, changed: changed };
}

function splitDeclarationTexts(cssText) {
  const declarations = [];
  let current = '', parenthesisDepth = 0, openQuote = '';
  for (let index = 0; index < cssText.length; index++) {
    const character = cssText[index];
    if (openQuote) {
      if (character === openQuote && cssText[index - 1] !== '\\') openQuote = '';
      current += character;
      continue;
    }
    if (character === '"' || character === "'") { openQuote = character; current += character; continue; }
    if (character === '(') parenthesisDepth++;
    else if (character === ')') parenthesisDepth--;
    if (character === ';' && !parenthesisDepth) {
      if (current.trim()) declarations.push(current);
      current = '';
      continue;
    }
    current += character;
  }
  if (current.trim()) declarations.push(current);
  return declarations;
}

function parseDeclarations(cssText) {
  return splitDeclarationTexts(cssText).map(text => {
    const colon = text.indexOf(':');
    return colon < 0 ? null : { property: text.slice(0, colon).trim(), value: text.slice(colon + 1).trim() };
  }).filter(Boolean);
}

function isBorderProperty(property) {
  return property.indexOf('border') === 0 || property === 'column-rule' || property.indexOf('column-rule-') === 0;
}

function keepsOwnBackground(property, value) {
  return !NO_BACKGROUND_VALUE.test(value) && !THEME_AWARE_VARIABLE.test(value) && property !== 'background-image' && !/url\(/.test(value);
}

function darkenBackgroundsAndBorders(declarations) {
  let changed = false, keepsColoredBackground = false;
  declarations.forEach(declaration => {
    const property = declaration.property.toLowerCase();
    if (property.slice(0, 2) === '--') return;
    if (property.indexOf('background') === 0) {
      const result = replaceColors(declaration.value, darkBackgroundFor);
      if (result.changed) { declaration.value = result.value; changed = true; }
      else if (keepsOwnBackground(property, declaration.value)) keepsColoredBackground = true;
    } else if (isBorderProperty(property)) {
      const result = replaceColors(declaration.value, darkBorderFor);
      if (result.changed) { declaration.value = result.value; changed = true; }
    }
  });
  return { changed: changed, keepsColoredBackground: keepsColoredBackground };
}

function lightenTextColor(declaration) {
  const value = declaration.value.replace(/\s*!important\s*$/i, '');
  const important = value !== declaration.value ? ' !important' : '';
  if (/var\(/.test(value)) {
    if (THEME_AWARE_VARIABLE.test(value) && !OTHER_VARIABLE.test(value)) return false;
    declaration.value = 'color-mix(in srgb,' + value + ' 50%,#f2f4ff)' + important;
    return true;
  }
  const result = replaceColors(value, lightTextFor);
  if (result.changed) declaration.value = result.value + important;
  return result.changed;
}

function lightenTextColors(declarations) {
  let changed = false;
  declarations.forEach(declaration => {
    if (TEXT_COLOR_PROPERTIES.indexOf(declaration.property.toLowerCase()) < 0) return;
    if (lightenTextColor(declaration)) changed = true;
  });
  return changed;
}

function darkVersionOf(cssText) {
  if (!/#|rgb|white|black|var\(/i.test(cssText)) return null;
  const declarations = parseDeclarations(cssText);
  const backgrounds = darkenBackgroundsAndBorders(declarations);
  const textChanged = !backgrounds.keepsColoredBackground && lightenTextColors(declarations);
  if (!backgrounds.changed && !textChanged) return null;
  return declarations.map(declaration => declaration.property + ':' + declaration.value).join(';');
}

const themedRules = [];
const alreadyScanned = new WeakSet();

function isPrintOnlyMedia(mediaRule) {
  const mediaText = mediaRule.media.mediaText || '';
  return /print/.test(mediaText) && !/screen|all/.test(mediaText);
}

function rememberThemedRule(rule) {
  alreadyScanned.add(rule);
  const lightCss = rule.style.cssText;
  const darkCss = darkVersionOf(lightCss);
  if (darkCss !== null) themedRules.push({ rule: rule, lightCss: lightCss, darkCss: darkCss });
}

function collectThemedRules(ruleList) {
  for (const rule of ruleList) {
    if (rule.media && rule.cssRules) {
      if (!isPrintOnlyMedia(rule)) collectThemedRules(rule.cssRules);
      continue;
    }
    if (rule.style && !alreadyScanned.has(rule)) rememberThemedRule(rule);
    if (rule.cssRules && rule.cssRules.length) collectThemedRules(rule.cssRules);
  }
}

function scanStyleSheet(sheet) {
  try {
    const owner = sheet.ownerNode;
    if (owner && owner.hasAttribute && owner.hasAttribute('data-theme-skip')) return;
    if (alreadyScanned.has(sheet)) return;
    alreadyScanned.add(sheet);
    collectThemedRules(sheet.cssRules);
  } catch (error) {}
}

function scanAllStyleSheets() {
  for (const sheet of document.styleSheets) scanStyleSheet(sheet);
}

function themeInlineStyle(element, dark) {
  const lightStyle = element.getAttribute('data-th-light');
  if (!dark) {
    if (lightStyle !== null) {
      element.setAttribute('style', lightStyle);
      element.removeAttribute('data-th-light');
    }
    return;
  }
  if (lightStyle !== null) return;
  const style = element.getAttribute('style') || '';
  if (!/(^|;)\s*color\s*:/i.test(style) || /background/i.test(style)) return;
  const darkStyle = darkVersionOf(style);
  if (darkStyle === null) return;
  element.setAttribute('data-th-light', style);
  element.setAttribute('style', darkStyle);
}

function themeInlineStylesIn(dark, scope) {
  (scope || document).querySelectorAll(dark ? '[style*="color"]' : '[data-th-light]').forEach(element => themeInlineStyle(element, dark));
}

const BASE_THEME_CSS = ':root[data-theme=dark]{color-scheme:dark;--ink:#e3e5f1;--soft:#a3a9c4;--line:#3d4260;' +
  '--bg:linear-gradient(160deg,#0a0c20,#1a1434 60%,#30163a)}' +
  ':root[data-theme=dark] img:not([src$=".svg"]){filter:brightness(.92)}' +
  ':root[data-theme=dark] ::placeholder{color:#8a90ab}' +
  '.th-btn{flex:none!important;min-width:38px}' +
  '.th-float{position:fixed;top:10px;right:10px;z-index:20;font-size:16px;line-height:1;padding:8px 10px;border:1px solid #ffffff55;border-radius:999px;background:#12142fcc;color:#fff;cursor:pointer}' +
  '.th-float:hover,.th-float:focus-visible{background:#2a3170;outline:2px solid var(--gold)}' +
  '@media print{.th-btn,.th-float{display:none!important}}';

let currentTheme = LIGHT;
const themeButtons = [];

function setDarkColors(dark) {
  scanAllStyleSheets();
  themedRules.forEach(themed => {
    const css = dark ? themed.darkCss : themed.lightCss;
    if (themed.rule.style.cssText !== css) themed.rule.style.cssText = css;
  });
  if (document.body) themeInlineStylesIn(dark);
}

function applyTheme(theme, rememberChoice) {
  currentTheme = theme;
  if (theme === DARK) documentRoot.setAttribute('data-theme', DARK);
  else documentRoot.removeAttribute('data-theme');
  setDarkColors(theme === DARK);
  if (rememberChoice) {
    try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch (error) {}
  }
  updateThemeButtons();
}

function updateThemeButtons() {
  const dark = currentTheme === DARK;
  themeButtons.forEach(button => {
    button.textContent = dark ? '☀️' : '🌙';
    button.title = dark ? 'Passer en thème clair' : 'Passer en thème sombre';
    button.setAttribute('aria-label', button.title);
  });
}

function toggleTheme() {
  applyTheme(currentTheme === DARK ? LIGHT : DARK, true);
}

function isDark() {
  return currentTheme === DARK;
}

function addBaseThemeStyle() {
  const style = document.createElement('style');
  style.setAttribute('data-theme-skip', '');
  style.textContent = BASE_THEME_CSS;
  document.head.appendChild(style);
}

function themeAddedNodes(mutations) {
  if (!isDark()) return;
  let styleSheetAdded = false;
  mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
    if (node.nodeType !== 1) return;
    if (node.tagName === 'STYLE' || node.tagName === 'LINK') {
      styleSheetAdded = true;
      return;
    }
    if (node.hasAttribute('style')) themeInlineStyle(node, true);
    if (node.firstElementChild) themeInlineStylesIn(true, node);
  }));
  if (styleSheetAdded) setTimeout(() => { if (isDark()) setDarkColors(true); }, 0);
}

let printingInLight = false;

function switchToLightForPrint() {
  if (!isDark() || printingInLight) return;
  printingInLight = true;
  documentRoot.removeAttribute('data-theme');
  setDarkColors(false);
}

function restoreDarkAfterPrint() {
  if (!printingInLight) return;
  printingInLight = false;
  documentRoot.setAttribute('data-theme', DARK);
  setDarkColors(true);
}

function listenToMediaQuery(mediaQuery, listener) {
  if (mediaQuery.addEventListener) mediaQuery.addEventListener('change', listener);
  else mediaQuery.addListener(listener);
}

function followSystemThemeWhenNoChoice() {
  if (!savedTheme()) applyTheme(systemPrefersDark.matches ? DARK : LIGHT, false);
}

function addThemeButton() {
  const bar = document.querySelector('.top .bar') || document.querySelector('.bar');
  const button = document.createElement('button');
  button.type = 'button';
  button.onclick = toggleTheme;
  if (bar) {
    button.className = 'th-btn';
    bar.appendChild(button);
  } else {
    button.className = 'th-float';
    document.body.appendChild(button);
  }
  themeButtons.push(button);
  updateThemeButtons();
}

addBaseThemeStyle();
applyTheme(wantedTheme(), false);
new MutationObserver(themeAddedNodes).observe(document, { childList: true, subtree: true });
window.addEventListener('load', () => { if (isDark()) setDarkColors(true); });
window.addEventListener('beforeprint', switchToLightForPrint);
window.addEventListener('afterprint', restoreDarkAfterPrint);
const printMedia = window.matchMedia && matchMedia('print');
if (printMedia) listenToMediaQuery(printMedia, event => event.matches ? switchToLightForPrint() : restoreDarkAfterPrint());
if (systemPrefersDark) listenToMediaQuery(systemPrefersDark, followSystemThemeWhenNoChoice);
window.addEventListener('storage', event => { if (event.key === THEME_STORAGE_KEY) applyTheme(wantedTheme(), false); });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addThemeButton);
else addThemeButton();

window.Theme = { toggle: toggleTheme, set: theme => applyTheme(theme, true), get: () => currentTheme };
})();
