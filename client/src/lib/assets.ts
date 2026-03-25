/**
 * CDN Asset URLs for 3D models and PDF pages
 * Design: Scandinavian Warm Minimalism — Cozy Study Room
 */

const CDN_BASE = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663463426375/NKkQA3NRgoJFshsk6jL45U';

export const PET_MODELS = {
  cat: `${CDN_BASE}/animal-cat_a1dc5110.glb`,
  dog: `${CDN_BASE}/animal-dog_879131ea.glb`,
  bunny: `${CDN_BASE}/animal-bunny_126e0456.glb`,
  monkey: `${CDN_BASE}/animal-monkey_673a1206.glb`,
  chick: `${CDN_BASE}/animal-chick_367db969.glb`,
} as const;

export const FURNITURE_MODELS = {
  desk: `${CDN_BASE}/desk_0954352b.glb`,
  chairDesk: `${CDN_BASE}/chairDesk_69ff51d8.glb`,
  computerScreen: `${CDN_BASE}/computerScreen_be30fef1.glb`,
  computerKeyboard: `${CDN_BASE}/computerKeyboard_c0ed0c3f.glb`,
  computerMouse: `${CDN_BASE}/computerMouse_bbc0c3af.glb`,
  laptop: `${CDN_BASE}/laptop_5f0c06e0.glb`,
  bookcaseOpen: `${CDN_BASE}/bookcaseOpen_ccb1bc0d.glb`,
  books: `${CDN_BASE}/books_575cd5bb.glb`,
  lampRoundTable: `${CDN_BASE}/lampRoundTable_647bd53c.glb`,
  tableCoffee: `${CDN_BASE}/tableCoffee_4f97d833.glb`,
  rugRectangle: `${CDN_BASE}/rugRectangle_5ef863c2.glb`,
  plantSmall1: `${CDN_BASE}/plantSmall1_bfb720d4.glb`,
  pottedPlant: `${CDN_BASE}/pottedPlant_d1bb0d1e.glb`,
  wall: `${CDN_BASE}/wall_2220cac4.glb`,
  wallDoorway: `${CDN_BASE}/wallDoorway_73640a1a.glb`,
  wallWindow: `${CDN_BASE}/wallWindow_7eab9a04.glb`,
} as const;

export const PDF_PAGES: string[] = Array.from({ length: 33 }, (_, i) => {
  const pageNum = i + 1;
  const hashes: Record<number, string> = {
    1: 'c2fa7579', 2: '3483b27d', 3: '496bf231', 4: '91d0b15a', 5: '73608be7',
    6: '7161f695', 7: '18351c12', 8: '738fe546', 9: 'c4007206', 10: 'fbda0475',
    11: '07d50059', 12: 'd30ba708', 13: '73fa0afd', 14: '5444e685', 15: '6ed845aa',
    16: 'c0fe8eb7', 17: '539c7276', 18: 'a02ce81c', 19: '18417515', 20: '9aeebc4b',
    21: 'ba06c226', 22: 'e0e5ba8c', 23: '3d107a41', 24: 'b846ac7c', 25: 'd147585e',
    26: '84d099df', 27: 'baa11a1b', 28: '43a51cf7', 29: '3e9f06ba', 30: 'aa922d69',
    31: 'd473896a', 32: '0235de26', 33: 'dd52218a',
  };
  return `${CDN_BASE}/page_${pageNum}_${hashes[pageNum]}.png`;
});

export const PDF_TOTAL_PAGES = 33;

export const PDF_TITLE = '从单一指令到全组织行动：面向多智能体 LLM 系统的组织镜像方法';
export const PDF_AUTHOR = '金永勋 (Yongxun Jin)';
