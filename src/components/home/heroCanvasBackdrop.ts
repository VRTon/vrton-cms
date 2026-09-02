export const HERO_CLEAR_COLOR = 0x000000;
export const HERO_CLEAR_ALPHA = 0;

interface BackdropScene {
  background: unknown
}

interface BackdropRenderer {
  setClearColor: (_color: number, _alpha: number) => void
}

export function applyTransparentBackdrop(scene: BackdropScene, renderer: BackdropRenderer) {
  scene.background = null;
  renderer.setClearColor(HERO_CLEAR_COLOR, HERO_CLEAR_ALPHA);
}
