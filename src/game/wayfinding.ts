import type Phaser from 'phaser';

const FONT = '"Noto Serif SC", "Songti SC", "Microsoft YaHei", serif';

/** Both the painted board and its lettering use this local coordinate system.
 * The entity's original x/y remains the foot of the post and interaction anchor. */
export function wayfindingLayout(name: string) {
  const text = name.replace(/[←→]/g, '').trim();
  const direction = name.includes('←') ? -1 : 1;
  const width = Math.min(156, Math.max(104, Array.from(text).length * 18 + 44));
  return {
    text, direction, width,
    top: -63, bottom: -25, centerY: -44,
    textX: -direction * 6,
    textWidth: width - 40,
    fontSize: Array.from(text).length <= 2 ? 19 : 17,
  };
}

/** Call when an exit label is created; do not overwrite it with the generic
 * entity label in the frame loop (which would put the arrow back in the text). */
export function configureWayfindingLabel(
  label: Phaser.GameObjects.Text, name: string, density: number,
) {
  const layout = wayfindingLayout(name);
  label.setStyle({
    fontFamily: FONT, fontSize: `${layout.fontSize}px`, color: '#382d20',
    backgroundColor: 'transparent', padding: { x: 0, y: 0 },
    strokeThickness: 0,
  });
  label.setText(layout.text).setOrigin(.5).setPosition(layout.textX, layout.centerY);
  label.setResolution(density).setShadow(0, 1, '#e9d3a5', 0, true, true);
  // Measure the actual selected font, including fallback fonts on Mac/Safari.
  // Long destination names stay inside the nail margins without being truncated.
  label.setScale(Math.min(1, layout.textWidth / Math.max(1, label.width)));
  return label;
}

/** Draw into the exit's existing Graphics so ordinary entity redraw/destruction
 * owns all resources. Its label is a sibling in the same entity container. */
export function drawWayfinding(g: Phaser.GameObjects.Graphics, name: string) {
  const p = wayfindingLayout(name), half = p.width / 2;
  const polygon = (points: number[], color: number, alpha = 1) => {
    g.fillStyle(color, alpha).beginPath().moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) g.lineTo(points[i], points[i + 1]);
    g.closePath().fillPath();
  };
  const board = [
    -half, p.top + 1, half - 15, p.top, half, p.centerY,
    half - 15, p.bottom, -half + 1, p.bottom - 1,
    -half + 2, p.centerY + 4, -half, p.centerY - 3,
  ];
  const directed = board.map((v, i) => i % 2 === 0 ? v * p.direction : v);

  // Footing and a weathered, slightly leaning post, lit from the upper left.
  g.fillStyle(0x343c2b, .18).fillEllipse(10, 4, 44, 13);
  polygon([-9, 2, -4, -59, 7, -58, 5, 3], 0x695239);
  polygon([-9, 2, -4, -59, -1, -58, -4, 2], 0xa48a5e);
  g.lineStyle(1, 0x332c22, .45).lineBetween(1, -21, -1, -2);
  g.lineStyle(1, 0xc3aa79, .6).lineBetween(-5, -22, -7, -2);
  polygon([-13, 3, -6, -2, 4, -1, 13, 4, 8, 7, -9, 7], 0x899080);
  g.lineStyle(1, 0xd0ceb3, .65).lineBetween(-11, 3, -4, 0);

  // Thickness is visible below the carved face rather than as a UI border.
  polygon(directed.map((v, i) => i % 2 === 0 ? v + 1 : v + 4), 0x574632);
  polygon(directed, 0xb59b6c);
  const innerLeft = -half + 4, innerRight = half - 17;
  const faceLeft = p.direction === 1 ? innerLeft : -innerRight;
  g.fillStyle(0xccb17d, .72).fillRect(faceLeft, p.top + 3, innerRight - innerLeft, 11);
  g.fillStyle(0x967b50, .38).fillRect(faceLeft + 1, p.bottom - 6, innerRight - innerLeft - 1, 4);

  // Fine, deterministic grain remains quiet behind the high-contrast lettering.
  for (let i = 0; i < 5; i++) {
    const y = p.top + 7 + i * 6;
    g.lineStyle(.65, i % 2 ? 0xead4a0 : 0x746044, .22);
    g.beginPath().moveTo((-half + 7) * p.direction, y);
    g.lineTo(-15 * p.direction, y + (i % 2 ? 1 : -1));
    g.lineTo((half - 19) * p.direction, y).strokePath();
  }
  // Upper bevel follows the arrow direction; lower edge is the shaded cut.
  g.lineStyle(1.3, 0xf0d9a0, .8);
  g.lineBetween((-half + 2) * p.direction, p.top + 2, (half - 15) * p.direction, p.top + 1);
  g.lineBetween((half - 15) * p.direction, p.top + 1, (half - 2) * p.direction, p.centerY);
  g.lineStyle(1.2, 0x675233, .6);
  g.lineBetween((-half + 2) * p.direction, p.bottom - 1, (half - 15) * p.direction, p.bottom - 1);
  for (const x of [-half + 8, half - 23]) {
    const nx = x * p.direction;
    g.fillStyle(0x665c44).fillCircle(nx, p.centerY, 2.2);
    g.fillStyle(0xddcca0).fillCircle(nx - .6, p.centerY - .7, .8);
  }
}
