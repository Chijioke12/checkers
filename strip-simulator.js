import fs from 'fs';

const mode = process.argv[2] || 'strip'; // 'strip' or 'restore'

if (mode === 'restore') {
  if (fs.existsSync('./index-with-simulator.html')) {
    fs.copyFileSync('./index-with-simulator.html', './index.html');
    console.log("Successfully restored the full Simulator UI in index.html!");
  } else {
    console.log("No simulator backup found. The index.html is already intact or was customized.");
  }
} else {
  // Read current index.html
  const currentHtml = fs.readFileSync('./index.html', 'utf-8');
  
  // Backup if we haven't already
  if (!fs.existsSync('./index-with-simulator.html')) {
    fs.writeFileSync('./index-with-simulator.html', currentHtml);
    console.log("Created simulator backup at index-with-simulator.html");
  }

  // Pure device index.html content
  const pureHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>KaiOS Checkers</title>
    <script src="/lib/phaser-3.24.1.min.js"></script>
    <style>
      @font-face {
        font-family: 'Baloo Chettan';
        src: url('/BalooChettan-Regular.ttf') format('truetype');
        font-weight: normal;
        font-style: normal;
      }
      @font-face {
        font-family: 'Luckiest Guy';
        src: url('/LuckiestGuy-Regular.ttf') format('truetype');
        font-weight: normal;
        font-style: normal;
      }

      body {
        margin: 0;
        padding: 0;
        background-color: #000;
        overflow: hidden;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        font-family: 'Baloo Chettan', system-ui, -apple-system, sans-serif;
        color: white;
      }
      #app-root {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100vw;
        height: 100vh;
        background: #000;
      }
      #root {
        width: 240px;
        height: 320px;
        background: #4e342e;
        overflow: hidden;
      }
    </style>
  </head>
  <body>
    <div id="app-root">
      <div id="root"></div>
    </div>
    
    <script>
      // Pure physical keyboard binds only for physical device d-pad / softkeys
      function sendNav(direction) {
        window.dispatchEvent(new CustomEvent('game-nav', { detail: { direction } }));
      }

      window.addEventListener('keydown', (e) => {
        const k = e.key.toLowerCase();
        if (['arrowup', 'w'].includes(k)) { sendNav('UP'); e.preventDefault(); }
        else if (['arrowdown', 's'].includes(k)) { sendNav('DOWN'); e.preventDefault(); }
        else if (['arrowleft', 'a'].includes(k)) { sendNav('LEFT'); e.preventDefault(); }
        else if (['arrowright', 'd'].includes(k)) { sendNav('RIGHT'); e.preventDefault(); }
        else if (['enter', ' ', '5'].includes(k)) { sendNav('SELECT'); e.preventDefault(); }
        else if (['softleft', 'f1', 'b'].includes(k)) { sendNav('LSK'); e.preventDefault(); }
        else if (['softright', 'f2', 'u', 'z', 'backspace'].includes(k)) { sendNav('RSK'); e.preventDefault(); }
        else if (['r'].includes(k)) { sendNav('RULES'); e.preventDefault(); }
      });
    </script>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

  fs.writeFileSync('./index.html', pureHtml);
  console.log("Successfully stripped away simulator UI! index.html is now 100% pure device format.");
}
