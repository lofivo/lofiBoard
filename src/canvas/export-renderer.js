import Konva from "konva";

export function createExportBackground({ stage, contentLayer, backgroundMode }) {
  const scale = stage.scaleX();
  const viewport = {
    x: -stage.x() / scale,
    y: -stage.y() / scale,
    width: stage.width() / scale,
    height: stage.height() / scale,
  };
  const background = new Konva.Rect({
    ...viewport,
    fill: "#ffffff",
    listening: false,
  });
  contentLayer.add(background);
  background.moveToBottom();

  if (backgroundMode !== "dots") {
    return [background];
  }

  const dotGroup = new Konva.Group({ listening: false });
  const spacing = 32;
  const startX = Math.floor(viewport.x / spacing) * spacing;
  const endX = viewport.x + viewport.width;
  const startY = Math.floor(viewport.y / spacing) * spacing;
  const endY = viewport.y + viewport.height;

  for (let x = startX; x <= endX; x += spacing) {
    for (let y = startY; y <= endY; y += spacing) {
      dotGroup.add(
        new Konva.Circle({
          x,
          y,
          radius: 1,
          fill: "rgba(100, 116, 139, 0.38)",
          listening: false,
        }),
      );
    }
  }

  contentLayer.add(dotGroup);
  dotGroup.moveToBottom();
  background.moveToBottom();
  return [background, dotGroup];
}
