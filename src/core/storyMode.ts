/**
 * Story mode or classic mode, decided once from the URL.
 *
 * Story mode is the default: the children's story "The Moon Project" —
 * the prologue and epilogue chapters, the Earth and Moon talking,
 * the album, the weight meter. `?story=0` is the classic mission replay for
 * older visitors, exactly as Phases 0–4 built it, which is also what the
 * mission specs run against.
 *
 * The start screen is skipped under `?debug` so specs land straight on the
 * page; `?start=1` brings it back for the specs that test it.
 */
export interface StoryConfig {
  enabled: boolean;
  showStart: boolean;
}

export function readStoryConfig(search: string = window.location.search): StoryConfig {
  const params = new URLSearchParams(search);
  const enabled = params.get('story') !== '0';
  const showStart = enabled && (!params.has('debug') || params.get('start') === '1');
  return { enabled, showStart };
}
