/**
 * Game Assets Generator
 * Draws all game assets individually on canvas and exports base64 data URLs,
 * as well as registering synchronous textures with Phaser.
 */

// Helper to draw asset onto a canvas context
export function drawAssetCtx(key: string, ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2;
  const cy = h / 2;

  if (key === 'redPiece' || key === 'redKing') {
    const r = w / 2 - 2;

    // Outer circle
    const grad = ctx.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, r);
    grad.addColorStop(0, '#ff6b6b');
    grad.addColorStop(0.7, '#d63031');
    grad.addColorStop(1, '#8b0000');

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Concentric grooves
    [r * 0.7, r * 0.45, r * 0.2].forEach(grooveR => {
      ctx.beginPath();
      ctx.arc(cx, cy, grooveR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, grooveR - 0.5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });

    if (key === 'redKing') {
      // Golden Crown Star
      ctx.fillStyle = '#f1c40f';
      ctx.strokeStyle = '#b7950b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const x = cx + (r * 0.4) * Math.cos(angle);
        const y = cy + (r * 0.4) * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (key === 'blackPiece' || key === 'blackKing') {
    const r = w / 2 - 2;

    const grad = ctx.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, r);
    grad.addColorStop(0, '#555555');
    grad.addColorStop(0.7, '#222222');
    grad.addColorStop(1, '#050505');

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#888888';
    ctx.stroke();

    [r * 0.7, r * 0.45, r * 0.2].forEach(grooveR => {
      ctx.beginPath();
      ctx.arc(cx, cy, grooveR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, grooveR - 0.5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });

    if (key === 'blackKing') {
      ctx.fillStyle = '#f1c40f';
      ctx.strokeStyle = '#b7950b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const x = cx + (r * 0.4) * Math.cos(angle);
        const y = cy + (r * 0.4) * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (key === 'darkTile') {
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    for (let i = 0; i < h; i += 3) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(w, i);
      ctx.stroke();
    }
  } else if (key === 'lightTile') {
    ctx.fillStyle = '#f5e6ca';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(139, 69, 19, 0.08)';
    for (let i = 0; i < h; i += 3) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(w, i);
      ctx.stroke();
    }
  } else if (key === 'softkeyBar') {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#27170e');
    grad.addColorStop(1, '#110a06');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Top border accent
    ctx.strokeStyle = '#4a2e22';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0.5);
    ctx.lineTo(w, 0.5);
    ctx.stroke();
  } else if (key === 'moveDot') {
    const r = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(46, 204, 113, 0.85)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  } else if (key === 'captureDot') {
    const r = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(231, 76, 60, 0.85)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#f1c40f';
    ctx.stroke();
  } else if (key === 'selectedRing') {
    const r = w / 2 - 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r - 3, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (key === 'sparkParticle') {
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, w / 2);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, '#f1c40f');
    grad.addColorStop(1, 'rgba(241, 196, 15, 0)');
    ctx.beginPath();
    ctx.arc(cx, cy, w / 2, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }
}

// Generate Base64 Data URLs for all assets
export function generateBase64Assets(): Record<string, string> {
  const assetsMap: Record<string, { w: number, h: number }> = {
    redPiece: { w: 44, h: 44 },
    blackPiece: { w: 44, h: 44 },
    redKing: { w: 44, h: 44 },
    blackKing: { w: 44, h: 44 },
    darkTile: { w: 44, h: 44 },
    lightTile: { w: 44, h: 44 },
    softkeyBar: { w: 240, h: 22 },
    moveDot: { w: 44, h: 44 },
    captureDot: { w: 44, h: 44 },
    selectedRing: { w: 44, h: 44 },
    sparkParticle: { w: 12, h: 12 }
  };

  const result: Record<string, string> = {};
  for (const [key, dim] of Object.entries(assetsMap)) {
    const canvas = document.createElement('canvas');
    canvas.width = dim.w;
    canvas.height = dim.h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      drawAssetCtx(key, ctx, dim.w, dim.h);
      result[key] = canvas.toDataURL('image/png');
    }
  }
  return result;
}

// Register all textures directly in Phaser TextureManager synchronously
export function registerPhaserTextures(scene: any) {
  const assetsMap: Record<string, { w: number, h: number }> = {
    redPiece: { w: 44, h: 44 },
    blackPiece: { w: 44, h: 44 },
    redKing: { w: 44, h: 44 },
    blackKing: { w: 44, h: 44 },
    darkTile: { w: 44, h: 44 },
    lightTile: { w: 44, h: 44 },
    softkeyBar: { w: 240, h: 22 },
    moveDot: { w: 44, h: 44 },
    captureDot: { w: 44, h: 44 },
    selectedRing: { w: 44, h: 44 },
    sparkParticle: { w: 12, h: 12 }
  };

  for (const [key, dim] of Object.entries(assetsMap)) {
    if (!scene.textures.exists(key)) {
      const tex = scene.textures.createCanvas(key, dim.w, dim.h);
      if (tex) {
        const ctx = tex.getContext();
        drawAssetCtx(key, ctx, dim.w, dim.h);
        tex.refresh();
      }
    }
  }
}
