import { esc } from './util.js';
import { HOLIDAY_BANNERS } from './holidays.js';
import { RANKED_BANNERS } from './ranked.js';

// Player banners: the card shown behind your name when you kill someone ("[BOT] Razor killed you").
// bg is a CSS background, accent tints the edge / emblem, anim adds a moving effect (see .bnr-* in style.css).
export const BANNER_STYLE = {
  standard: { bg: 'linear-gradient(100deg, #1b2029 0%, #262d38 60%, #1b2029 100%)', accent: '#ffb020', emblem: '★' },
  carbon: {
    bg: 'repeating-linear-gradient(45deg, #15181d 0 4px, #1f242b 4px 8px), #15181d', accent: '#9aa4b2', emblem: '◆',
  },
  tiger: {
    bg: 'repeating-linear-gradient(115deg, transparent 0 22px, #120c05 22px 30px, transparent 30px 44px, #120c05 44px 48px), linear-gradient(90deg, #e07a12, #ffae3a)',
    accent: '#ffcf7a', emblem: '🐯',
  },
  camo: {
    bg: 'radial-gradient(circle at 15% 30%, #2f3a22 0 14%, transparent 15%), radial-gradient(circle at 45% 70%, #5a4a2c 0 16%, transparent 17%), radial-gradient(circle at 70% 25%, #1f2616 0 13%, transparent 14%), radial-gradient(circle at 88% 75%, #3d4a2a 0 15%, transparent 16%), radial-gradient(circle at 30% 95%, #1f2616 0 12%, transparent 13%), #4a5a34',
    accent: '#b9c98a', emblem: '✪',
  },
  arctic: {
    bg: 'radial-gradient(circle at 20% 40%, #c9d6e3 0 14%, transparent 15%), radial-gradient(circle at 55% 75%, #8fa3b8 0 15%, transparent 16%), radial-gradient(circle at 80% 30%, #a9bccd 0 13%, transparent 14%), #e8eef4',
    accent: '#3d6fd8', emblem: '❄', dark: true,
  },
  ocean: {
    bg: 'radial-gradient(ellipse at 50% 140%, #3fd0ff55 0 40%, transparent 41%), repeating-radial-gradient(circle at 50% 160%, transparent 0 14px, #ffffff14 14px 16px), linear-gradient(180deg, #0a3d6b, #0d6aa0)',
    accent: '#7fe3ff', emblem: '🌊',
  },
  sunset: {
    bg: 'radial-gradient(circle at 78% 110%, #ffd34a 0 22%, #ff8a3a 23% 30%, transparent 31%), linear-gradient(180deg, #2a1146, #8a2a6a 55%, #ff7a45)',
    accent: '#ffd34a', emblem: '☀',
  },
  toxic: {
    bg: 'repeating-linear-gradient(135deg, #f2d21b 0 14px, #121212 14px 28px)', accent: '#8fff4a', emblem: '☢',
  },
  neon: {
    bg: 'linear-gradient(90deg, #ff2fd855 1px, transparent 1px) 0 0 / 18px 18px, linear-gradient(0deg, #2fe6ff55 1px, transparent 1px) 0 0 / 18px 18px, linear-gradient(100deg, #12051f, #1b0b33)',
    accent: '#ff2fd8', emblem: '⚡', anim: 'scroll',
  },
  blood: {
    bg: 'radial-gradient(circle at 18% 40%, #7a0008 0 10%, transparent 11%), radial-gradient(circle at 26% 62%, #9b000c 0 4%, transparent 5%), radial-gradient(circle at 72% 30%, #7a0008 0 7%, transparent 8%), radial-gradient(circle at 80% 70%, #9b000c 0 12%, transparent 13%), linear-gradient(100deg, #1a0204, #3a0408)',
    accent: '#ff3b3b', emblem: '☠',
  },
  matrix: {
    bg: 'repeating-linear-gradient(90deg, transparent 0 9px, #1aff6a22 9px 11px), repeating-linear-gradient(180deg, #1aff6a18 0 3px, transparent 3px 7px), #020a04',
    accent: '#3aff7a', emblem: '⌬', anim: 'rain',
  },
  flames: {
    bg: 'radial-gradient(ellipse at 15% 120%, #ffdf4a 0 18%, transparent 40%), radial-gradient(ellipse at 45% 130%, #ff8a1a 0 22%, transparent 45%), radial-gradient(ellipse at 80% 125%, #ffb02a 0 18%, transparent 42%), linear-gradient(180deg, #1a0500, #6a1300 60%, #d63a00)',
    accent: '#ffcc33', emblem: '🔥', anim: 'flicker',
  },
  galaxy: {
    bg: 'radial-gradient(1px 1px at 12% 30%, #fff, transparent), radial-gradient(1.5px 1.5px at 35% 70%, #fff, transparent), radial-gradient(1px 1px at 58% 20%, #fff, transparent), radial-gradient(1.5px 1.5px at 76% 60%, #fff, transparent), radial-gradient(1px 1px at 90% 35%, #fff, transparent), radial-gradient(ellipse at 60% 50%, #7a3aff66, transparent 60%), radial-gradient(ellipse at 25% 60%, #ff3aa855, transparent 55%), #0a0618',
    accent: '#c9a8ff', emblem: '✦', anim: 'twinkle',
  },
  dragon: {
    bg: 'radial-gradient(circle at 50% 100%, transparent 0 9px, #00000080 10px 11px, transparent 12px) 0 0 / 22px 14px, linear-gradient(100deg, #3a0000, #8a0b0b 50%, #3a0000)',
    accent: '#ffb020', emblem: '🐉',
  },
  rainbow: {
    bg: 'linear-gradient(100deg, #ff3b3b, #ffb020, #ffe94a, #3bd16f, #3b9cff, #8a4bff, #ff3b3b)', accent: '#ffffff', emblem: '✿', anim: 'hue',
  },
  gold: {
    bg: 'linear-gradient(100deg, #6b4a0a 0%, #c99a1e 25%, #fff0a8 45%, #e2b23a 60%, #7a560c 100%)', accent: '#fff3b0', emblem: '♛', anim: 'shine', dark: true,
  },
  diamond: {
    bg: 'linear-gradient(120deg, transparent 0 30%, #ffffff55 40%, transparent 50%), conic-gradient(from 30deg at 30% 50%, #bfefff, #e8f9ff, #9fd8ff, #d8c8ff, #bfefff), #bfefff',
    accent: '#ffffff', emblem: '💎', anim: 'shine', dark: true,
  },
  candy: {
    bg: 'repeating-linear-gradient(120deg, #ffffff 0 14px, #ff4f8b 14px 28px)', accent: '#ff2d75', emblem: '🍬', dark: true,
  },
  happy: {
    bg: 'repeating-linear-gradient(-60deg, #ffffff14 0 2px, transparent 2px 18px), radial-gradient(circle at 85% 0%, #ffd23a66, transparent 45%), linear-gradient(110deg, #ff3f84, #ff2d75 45%, #ff8a1f)',
    accent: '#ffd23a', emblem: '😁',
  },
  storm: {
    bg: 'radial-gradient(ellipse at 20% 0%, #8fa3c044 0 30%, transparent 55%), radial-gradient(ellipse at 75% 10%, #5a6a8a44 0 25%, transparent 50%), linear-gradient(180deg, #0b0f1c, #1d2640 60%, #2c3a5c)',
    accent: '#ffe94a', emblem: '⚡', anim: 'flicker',
  },
  vapor: {
    bg: 'linear-gradient(0deg, #ff2fd844 1px, transparent 1px) 0 0 / 100% 12px, radial-gradient(circle at 50% 125%, #ffd23a 0 26%, #ff5f9e 27% 36%, transparent 37%), linear-gradient(180deg, #1a0b3a, #6a1b8a 60%, #ff5f9e)',
    accent: '#2de2ff', emblem: '🌴', anim: 'scroll',
  },
  // Big update banners (changelog.js), also sold in the shop
  overdrive: {
    bg: 'repeating-linear-gradient(100deg, transparent 0 26px, #ffffff1c 26px 30px, transparent 30px 52px), radial-gradient(ellipse at 100% 50%, #ffe14a 0 12%, #ff7a1a 24%, transparent 55%), linear-gradient(100deg, #1a0420, #8a0f4a 55%, #ff3f6a)',
    accent: '#ffe14a', emblem: '🚀', anim: 'flicker',
  },
  harvest: {
    bg: 'radial-gradient(circle at 84% 40%, #ffe2a0 0 22px, #ffb347 23px 26px, #ff9a2a44 27px 34px, transparent 35px), radial-gradient(1px 1px at 20% 30%, #fff, transparent), radial-gradient(1.5px 1.5px at 45% 20%, #fff, transparent), radial-gradient(1px 1px at 62% 60%, #fff, transparent), linear-gradient(0deg, #12060a 0 18%, transparent 18%), linear-gradient(180deg, #1a0b33, #5a1f5a 60%, #c8501f)',
    accent: '#ffb347', emblem: '🌕', anim: 'twinkle',
  },
  mega: {
    bg: 'repeating-conic-gradient(from 0deg at 18% 50%, #ffffff10 0 6deg, transparent 6deg 18deg), radial-gradient(circle at 18% 50%, #fff7 0 6%, #2fe6ff88 12%, transparent 40%), linear-gradient(100deg, #10052a, #4a0f9a 45%, #ff2fd8)',
    accent: '#2fe6ff', emblem: '💥', anim: 'hue',
  },
  motion: { // "In Motion" (2026-10-16): speed lines
    bg: 'repeating-linear-gradient(100deg, transparent 0 18px, #ffffff14 18px 20px, transparent 20px 46px), radial-gradient(circle at 82% 50%, #3fe8ff55 0 14%, transparent 42%), linear-gradient(100deg, #0a0a1e, #1a1a4a 50%, #3a5aff 80%, #3fe8ff)',
    accent: '#3fe8ff', emblem: '🏃', anim: 'shine',
  },
  newlook: {
    bg: 'linear-gradient(90deg, #ffffff0f 1px, transparent 1px) 0 0, linear-gradient(0deg, #ffffff0f 1px, transparent 1px) 0 0, radial-gradient(circle at 82% 50%, #ff2d7555 0 16%, transparent 42%), linear-gradient(100deg, #12081e, #2a0f3a 55%, #ff2d75)',
    accent: '#ffd23f', emblem: '🖥', anim: 'shine', size: '24px 24px, 24px 24px, cover, cover',
  },
  together: {
    bg: 'radial-gradient(circle at 20% 50%, #ffd23f66 0 14%, transparent 34%), radial-gradient(circle at 50% 50%, #3bd16f55 0 14%, transparent 34%), radial-gradient(circle at 80% 50%, #3ab0ff66 0 14%, transparent 34%), linear-gradient(100deg, #1a0a3a, #3a1a6a 50%, #1a3a6a)',
    accent: '#ffd23f', emblem: '🤝', anim: 'twinkle',
  },
  sakura: {
    bg: 'radial-gradient(ellipse 6px 4px at 30% 40%, #ffd0e4 0 70%, transparent 100%) 0 0, radial-gradient(ellipse 4px 3px at 60% 60%, #ffffff 0 70%, transparent 100%) 9px 9px, radial-gradient(circle at 85% 30%, #ff9ac866 0 18%, transparent 45%), linear-gradient(100deg, #3a1030, #8a2a5a 55%, #ffb3d1)',
    accent: '#ffd6e8', emblem: '🌸', anim: 'drift', size: '36px 36px, 36px 36px, cover, cover',
  },
  deepsea: {
    bg: 'radial-gradient(circle at 50% 50%, transparent 0 2px, #cff4ffcc 2.5px 3.5px, transparent 4px) 0 0, radial-gradient(circle at 50% 50%, #ffffffaa 0 1.8px, transparent 2.5px) 9px 9px, radial-gradient(ellipse at 50% -20%, #3ad1ff55, transparent 60%), linear-gradient(180deg, #0a3a6a, #041a3a 70%, #020a1a)',
    accent: '#7fe3ff', emblem: '🫧', anim: 'rise', size: '36px 36px, 36px 36px, cover, cover',
  },
  aurora: {
    bg: 'linear-gradient(100deg, transparent 0 10%, #3affb055 25%, transparent 40%, #8a3aff55 55%, transparent 70%, #3affb044 85%, transparent 100%) 0 0, radial-gradient(1px 1px at 20% 30%, #fff, transparent), radial-gradient(1px 1px at 70% 20%, #fff, transparent), linear-gradient(180deg, #020818, #0a1a3a)',
    accent: '#8affd0', emblem: '🌌', anim: 'wave', size: '200% 100%, cover, cover, cover',
  },
  pixelarcade: {
    bg: 'linear-gradient(90deg, #ff2fd855 2px, transparent 2px), linear-gradient(0deg, #2fe6ff55 2px, transparent 2px), radial-gradient(circle at 82% 50%, #39ff6a55 0 14%, transparent 40%), linear-gradient(100deg, #0a0420, #2a0a5a 60%, #1a0a3a)',
    accent: '#39ff6a', emblem: '👾', anim: 'scroll', size: '12px 12px, 12px 12px, cover, cover',
  },
  glitch: {
    bg: 'repeating-linear-gradient(0deg, #ffffff10 0 2px, transparent 2px 5px), linear-gradient(100deg, transparent 0 30%, #ff2a5a66 30% 34%, transparent 34% 52%, #2ae8ff66 52% 55%, transparent 55% 78%, #ff2a5a55 78% 80%, transparent 80%), linear-gradient(100deg, #0a0a12, #1a1a2a 60%, #2a1a3a)',
    accent: '#2ae8ff', emblem: '📺', anim: 'flicker',
  },
  checkered: {
    bg: 'linear-gradient(90deg, #101010 0 30%, #10101099 55%, transparent 80%), repeating-linear-gradient(100deg, transparent 0 40px, #ff3a3a33 40px 46px), repeating-conic-gradient(#d8d8d8 0 25%, #1a1a1a 0 50%), linear-gradient(100deg, #141414, #2a2a2a)',
    accent: '#ff3a3a', emblem: '🏁', size: 'cover, cover, 24px 24px, cover',
  },
  gigachad: {
    bg: 'repeating-linear-gradient(135deg, #ffffff10 0 2px, transparent 2px 14px), radial-gradient(circle at 84% 50%, #fff3a0aa 0 10%, #ffd23a55 20%, transparent 45%), linear-gradient(100deg, #2a0a3a, #6a1a8a 40%, #c88a12 75%, #ffd23a)',
    accent: '#ffe27a', emblem: '♛', anim: 'shine',
  },
  modshield: { // the moderators' own
    bg: 'repeating-linear-gradient(135deg, #ffffff12 0 2px, transparent 2px 14px), radial-gradient(circle at 84% 50%, #e8f4ffaa 0 9%, #4fc3ff55 20%, transparent 45%), linear-gradient(100deg, #0a1426, #1a3a6a 45%, #3a7ac8 75%, #c8d4e2)',
    accent: '#cfe8ff', emblem: '🛡', anim: 'shine',
  },
  armory: {
    bg: 'repeating-linear-gradient(90deg, #ffffff0d 0 2px, transparent 2px 16px), radial-gradient(circle at 82% 50%, #3fe8ff55 0 14%, transparent 40%), linear-gradient(100deg, #0a1018, #1a2a3a 50%, #ff8a1a)',
    accent: '#3fe8ff', emblem: '🔫', anim: 'shine',
  },
  masquerade: {
    bg: 'radial-gradient(circle at 80% 50%, #ffd23f55 0 12%, transparent 40%), repeating-linear-gradient(135deg, #ffffff10 0 10px, transparent 10px 20px), linear-gradient(100deg, #1a0630, #5a1a8a 50%, #ff3f84)',
    accent: '#ffd23f', emblem: '🎭', anim: 'twinkle',
  },
  staffhq: {
    bg: 'linear-gradient(90deg, #4fc3ff22 1px, transparent 1px) 0 0 / 22px 22px, linear-gradient(0deg, #4fc3ff22 1px, transparent 1px) 0 0 / 22px 22px, radial-gradient(circle at 88% 50%, #ffd23f33 0 30px, transparent 70px), linear-gradient(100deg, #04101f, #0b2a4a 60%, #134a7a)',
    accent: '#ffd23f', emblem: '🛡', anim: 'scroll',
  },
};

// Holiday banners (holidays.js)
Object.assign(BANNER_STYLE, HOLIDAY_BANNERS);
// Weekly top clan (main.js claimTopClan)
BANNER_STYLE.clantop = { bg: 'radial-gradient(circle at 84% 50%, #ffd34a66 0 16%, transparent 40%), repeating-linear-gradient(135deg, #1b1407 0 14px, #241a09 14px 28px)', accent: '#ffd34a', emblem: '🛡' };
// Ranked season banners (ranked.js)
Object.assign(BANNER_STYLE, RANKED_BANNERS);

// Season pass banners (seasons.js)
Object.assign(BANNER_STYLE, {
  s1: { bg: 'radial-gradient(circle at 85% 50%, #ffb02055 0 20%, transparent 45%), linear-gradient(100deg, #1a0d06, #5a1e08 60%, #ff7a2a)', accent: '#ffb020', emblem: '🔥' },
  s1elite: { bg: 'repeating-linear-gradient(120deg, transparent 0 18px, #ffd23a22 18px 22px), linear-gradient(100deg, #2a0a04, #b8360a 50%, #ffd23a)', accent: '#fff0b0', emblem: '🏅', anim: 'shine' },
  s2: { bg: 'radial-gradient(circle at 85% 50%, #bfefff55 0 20%, transparent 45%), linear-gradient(100deg, #06101a, #0a3a5a 60%, #6fd8ff)', accent: '#bfefff', emblem: '❄' },
  s2elite: { bg: 'repeating-linear-gradient(60deg, transparent 0 18px, #ffffff22 18px 22px), linear-gradient(100deg, #0a0a2a, #3a5ad8 50%, #c9a8ff)', accent: '#ffffff', emblem: '💠', anim: 'shine' },
});

export const bannerOf = (id) => BANNER_STYLE[id] || BANNER_STYLE.standard;

// Banner card markup. `top` is a small label above the name, `sub` a line of chips under it.
export function bannerHtml(id, name, nameColor, top = '', sub = '') {
  const b = bannerOf(id);
  return `<div class="bnr ${b.anim ? 'bnr-' + b.anim : ''} ${b.dark ? 'bnr-light' : ''}" style="--bg:${b.bg};--ac:${b.accent}${b.size ? `;background-size:${b.size}` : ''}">
    <div class="bnr-emblem"><span>${b.emblem}</span></div>
    <div class="bnr-text">${top ? `<div class="bnr-top">${top}</div>` : ''}<div class="bnr-name" style="color:${esc(nameColor || '#fff')}">${esc(name)}</div>${sub ? `<div class="bnr-sub">${sub}</div>` : ''}</div>
  </div>`;
}
