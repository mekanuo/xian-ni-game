// Canvas pixels and world units are deliberately separate. DOM controls stay in CSS pixels.
export const display = { density: 1, worldScale: 1 };
export function measureDisplay() {
  const width=Math.max(1,window.innerWidth),height=Math.max(1,window.innerHeight);
  display.density=Math.max(1,Math.min(window.devicePixelRatio||1,3,Math.sqrt(5_000_000/(width*height))));
  display.worldScale=Math.min(width,height)<600?.85:1;
  return {width:Math.round(width*display.density),height:Math.round(height*display.density)};
}
