const ICONS = {
  192: {
    size: "192x192",
    path: "/icons/icon-192.png",
    maskable: "/icons/icon-192-maskable.png",
  },
  512: {
    size: "512x512",
    path: "/icons/icon-512.png",
    maskable: "/icons/icon-512-maskable.png",
  },
};

// Create a basic canvas of the specified size with text
function createIcon(size) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  
  // Background
  ctx.fillStyle = "#0EA5E9";
  ctx.fillRect(0, 0, size, size);
  
  // Text
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `${size/4}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Ludy", size/2, size/2);
  
  return canvas.toDataURL("image/png");
}

// Create icons
Object.entries(ICONS).forEach(([size, info]) => {
  const icon = createIcon(parseInt(size));
  const link = document.createElement("a");
  link.download = info.path.split("/").pop();
  link.href = icon;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Maskable version
  const maskableIcon = createIcon(parseInt(size)); // You can modify this for maskable icons
  const maskableLink = document.createElement("a");
  maskableLink.download = info.maskable.split("/").pop();
  maskableLink.href = maskableIcon;
  document.body.appendChild(maskableLink);
  maskableLink.click();
  document.body.removeChild(maskableLink);
});