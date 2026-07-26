/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'preact/hooks';
import { registerPhaserTextures } from './assets';

declare const Phaser: any;

export default function App() {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    let game: any = null;
    let active = true;

    const config: any = {
      type: Phaser.AUTO,
      width: 240,
      height: 320,
      parent: gameRef.current,
      backgroundColor: '#2a1b15',
      scene: {
        preload: preload,
        create: create,
        update: update
      }
    };

    Promise.all([
      document.fonts.load('10px "Baloo Chettan"'),
      document.fonts.load('10px "Luckiest Guy"')
    ]).then(() => {
      if (!active || !gameRef.current) return;
      game = new Phaser.Game(config);
    });

    const BOARD_SIZE = 10;
    const CELL_SIZE = 22;
    const OFFSET_X = 10;
    const OFFSET_Y = 75;

    let currentScreen: 'MENU' | 'GAME' | 'RULES' = 'MENU';
    let gameMode: 'AI' | '2P' = 'AI';
    let menuIndex = 0; // 0: vs AI, 1: 2P, 2: Rules

    let board: number[][] = []; 
    let selectedPiece: { r: number, c: number } | null = null;
    let turn = 1; // 1 for White, 2 for Black
    let cells: any[][] = [];
    let pieces: any[][] = [];
    let moveIndicators: any[] = [];
    
    // UI Elements
    let gameContainer: any;
    let menuContainer: any;
    let rulesContainer: any;

    let statusText: any;
    let scoreText: any;
    let p1NameText: any;
    let p2NameText: any;
    let cursorRect: any;
    let cursorR = 0;
    let cursorC = 0;

    let menuCards: any[] = [];
    let menuTexts: any[] = [];

    let lskPhaserText: any;
    let cskPhaserText: any;
    let rskPhaserText: any;

    let moveHistory: number[][][] = [];
    let isMidMultiJump = false;
    let isAIBusy = false;

    function preload(this: any) {}

    function create(this: any) {
      // Register Canvas generated assets
      registerPhaserTextures(this);

      // Wood Background Base Panel
      this.add.rectangle(120, 160, 240, 320, 0x3e2723);

      // Create Game Screen
      createGameScreen.call(this);

      // Create Main Menu Screen
      createMenuScreen.call(this);

      // Create Rules Screen
      createRulesScreen.call(this);

      // Softkeys Bar at the bottom (depth 180)
      this.add.image(120, 309, 'softkeyBar').setDepth(180);
      lskPhaserText = this.add.text(8, 309, "", { fontSize: '11px', color: '#f1c40f', fontStyle: 'bold', fontFamily: '"Baloo Chettan", sans-serif' }).setOrigin(0, 0.5).setDepth(190);
      cskPhaserText = this.add.text(120, 309, "SELECT", { fontSize: '11px', color: '#f1c40f', fontStyle: 'bold', fontFamily: '"Baloo Chettan", sans-serif' }).setOrigin(0.5, 0.5).setDepth(190);
      rskPhaserText = this.add.text(232, 309, "", { fontSize: '11px', color: '#f1c40f', fontStyle: 'bold', fontFamily: '"Baloo Chettan", sans-serif' }).setOrigin(1, 0.5).setDepth(190);

      // Initialize initial screen state
      showScreen.call(this, 'MENU');

      // Navigation Event Handler
      const navHandler = (e: any) => {
        const { direction } = e.detail;

        if (currentScreen === 'MENU') {
          if (direction === 'UP') {
            menuIndex = (menuIndex + 2) % 3;
            updateMenuUI.call(this);
          } else if (direction === 'DOWN') {
            menuIndex = (menuIndex + 1) % 3;
            updateMenuUI.call(this);
          } else if (direction === 'SELECT') {
            if (menuIndex === 0) {
              gameMode = 'AI';
              resetGame.call(this);
              showScreen.call(this, 'GAME');
            } else if (menuIndex === 1) {
              gameMode = '2P';
              resetGame.call(this);
              showScreen.call(this, 'GAME');
            } else if (menuIndex === 2) {
              showScreen.call(this, 'RULES');
            }
          } else if (direction === 'RULES') {
            showScreen.call(this, 'RULES');
          }
        } else if (currentScreen === 'RULES') {
          if (direction === 'SELECT' || direction === 'LSK' || direction === 'RSK') {
            showScreen.call(this, 'MENU');
          }
        } else if (currentScreen === 'GAME') {
          if (direction === 'LSK') {
            // BACK to Main Menu
            showScreen.call(this, 'MENU');
            return;
          }
          if (direction === 'RSK') {
            // UNDO Move
            undoLastMove.call(this);
            return;
          }

          if (isAIBusy || (gameMode === 'AI' && turn === 2)) return;

          if (direction === 'UP') cursorR = Math.max(0, cursorR - 1);
          if (direction === 'DOWN') cursorR = Math.min(BOARD_SIZE - 1, cursorR + 1);
          if (direction === 'LEFT') cursorC = Math.max(0, cursorC - 1);
          if (direction === 'RIGHT') cursorC = Math.min(BOARD_SIZE - 1, cursorC + 1);
          if (direction === 'SELECT') selectCell.call(this, cursorR, cursorC);

          updateCursor.call(this);
        }
      };

      window.addEventListener('game-nav', navHandler);
      this.events.on('destroy', () => window.removeEventListener('game-nav', navHandler));
    }

    function setSoftkeyLabels(lsk: string, csk: string, rsk: string) {
      if (lskPhaserText) lskPhaserText.setText(lsk);
      if (cskPhaserText) cskPhaserText.setText(csk);
      if (rskPhaserText) rskPhaserText.setText(rsk);
      window.dispatchEvent(new CustomEvent('update-softkeys', {
        detail: { lsk, csk, rsk }
      }));
    }

    function showScreen(this: any, screen: 'MENU' | 'GAME' | 'RULES') {
      currentScreen = screen;

      const screenList = [
        { name: 'MENU', container: menuContainer },
        { name: 'GAME', container: gameContainer },
        { name: 'RULES', container: rulesContainer }
      ];

      screenList.forEach(item => {
        if (item.container) {
          if (item.name === screen) {
            item.container.setVisible(true);
            item.container.setAlpha(0);
            item.container.setScale(0.96);
            if (this && this.tweens) {
              this.tweens.add({
                targets: item.container,
                alpha: 1,
                scaleX: 1,
                scaleY: 1,
                duration: 200,
                ease: 'Quad.out'
              });
            } else {
              item.container.setAlpha(1);
              item.container.setScale(1);
            }
          } else {
            item.container.setVisible(false);
          }
        }
      });

      if (screen === 'MENU') {
        setSoftkeyLabels('', 'SELECT', '');
        updateMenuUI.call(this);
      } else if (screen === 'GAME') {
        setSoftkeyLabels('BACK', 'SELECT', 'UNDO');
        updateHeaderUI();
        updateStatusText();
      } else if (screen === 'RULES') {
        setSoftkeyLabels('BACK', 'OK', '');
      }
    }

    function createMenuScreen(this: any) {
      menuContainer = this.add.container(0, 0).setDepth(50);

      // Menu Outer Frame
      const frame = this.add.rectangle(120, 160, 226, 280, 0x1a0f0a).setStrokeStyle(2, 0xd35400);

      // Header Banner
      const headerBg = this.add.rectangle(120, 48, 206, 52, 0x2c1a14).setStrokeStyle(1, 0x4a2e22);
      const title = this.add.text(120, 38, "NIGERIAN DRAFT", {
        fontSize: '15px',
        color: '#f1c40f',
        fontStyle: 'bold',
        fontFamily: '"Luckiest Guy", sans-serif'
      }).setOrigin(0.5);

      const subtitle = this.add.text(120, 58, "KAIOS EDITION", {
        fontSize: '10px',
        color: '#00e5ff',
        fontStyle: 'bold',
        fontFamily: '"Baloo Chettan", sans-serif'
      }).setOrigin(0.5);

      const selectLabel = this.add.text(120, 92, "SELECT GAME MODE", {
        fontSize: '10px',
        color: '#e67e22',
        fontStyle: 'bold',
        fontFamily: '"Baloo Chettan", sans-serif'
      }).setOrigin(0.5);

      menuContainer.add([frame, headerBg, title, subtitle, selectLabel]);

      // Menu Options
      const options = [
        "VS AMARACHI AI",
        "HUMAN VS HUMAN (2P)",
        "GAME RULES"
      ];

      menuCards = [];
      menuTexts = [];

      options.forEach((opt, idx) => {
        const y = 126 + idx * 48;
        const card = this.add.rectangle(120, y, 196, 38, 0x2c1a14).setStrokeStyle(1, 0x4a2e22);
        const txt = this.add.text(120, y, opt, {
          fontSize: '11px',
          color: '#ecf0f1',
          fontStyle: 'bold',
          fontFamily: '"Baloo Chettan", sans-serif'
        }).setOrigin(0.5);

        menuCards.push(card);
        menuTexts.push(txt);
        menuContainer.add([card, txt]);
      });
    }

    function updateMenuUI(this: any) {
      const options = [
        "VS AMARACHI AI",
        "HUMAN VS HUMAN (2P)",
        "GAME RULES"
      ];

      menuCards.forEach((card, idx) => {
        if (idx === menuIndex) {
          card.setFillStyle(0xd35400);
          card.setStrokeStyle(2, 0xffd54f);
          menuTexts[idx].setColor('#ffffff');
          menuTexts[idx].setText(`▶  ${options[idx]}  ◀`);
          if (this && this.tweens) {
            this.tweens.add({
              targets: [card, menuTexts[idx]],
              scaleX: 1.04,
              scaleY: 1.04,
              duration: 120,
              ease: 'Power1'
            });
          }
        } else {
          card.setFillStyle(0x2c1a14);
          card.setStrokeStyle(1, 0x4a2e22);
          menuTexts[idx].setColor('#bdc3c7');
          menuTexts[idx].setText(options[idx]);
          if (this && this.tweens) {
            this.tweens.add({
              targets: [card, menuTexts[idx]],
              scaleX: 1.0,
              scaleY: 1.0,
              duration: 120,
              ease: 'Power1'
            });
          }
        }
      });
    }

    function spawnSparkParticles(this: any, x: number, y: number, count = 12) {
      for (let i = 0; i < count; i++) {
        const particle = this.add.image(x, y, 'sparkParticle').setDepth(90);
        if (gameContainer) gameContainer.add(particle);
        const angle = (i * Math.PI * 2) / count + Math.random() * 0.2;
        const dist = 14 + Math.random() * 18;
        this.tweens.add({
          targets: particle,
          x: x + Math.cos(angle) * dist,
          y: y + Math.sin(angle) * dist,
          scaleX: 0.1,
          scaleY: 0.1,
          alpha: 0,
          duration: 350 + Math.random() * 200,
          ease: 'Cubic.out',
          onComplete: () => particle.destroy()
        });
      }
    }

    function triggerCaptureEffect(this: any, cr: number, cc: number) {
      if (this.cameras && this.cameras.main) {
        this.cameras.main.shake(120, 0.004);
      }

      const capX = cc * CELL_SIZE + OFFSET_X + CELL_SIZE / 2;
      const capY = cr * CELL_SIZE + OFFSET_Y + CELL_SIZE / 2;

      spawnSparkParticles.call(this, capX, capY, 12);

      const popText = this.add.text(capX, capY, "CAPTURED!", {
        fontSize: '10px',
        color: '#ff4757',
        fontStyle: 'bold',
        fontFamily: '"Luckiest Guy", sans-serif'
      }).setOrigin(0.5).setDepth(100);
      if (gameContainer) gameContainer.add(popText);

      this.tweens.add({
        targets: popText,
        y: capY - 20,
        alpha: 0,
        duration: 650,
        ease: 'Power2',
        onComplete: () => popText.destroy()
      });
    }

    function triggerKingCrownedEffect(this: any, tr: number, tc: number) {
      if (this.cameras && this.cameras.main) {
        this.cameras.main.flash(250, 241, 196, 15);
      }

      const kingX = tc * CELL_SIZE + OFFSET_X + CELL_SIZE / 2;
      const kingY = tr * CELL_SIZE + OFFSET_Y + CELL_SIZE / 2;

      spawnSparkParticles.call(this, kingX, kingY, 16);

      const crownText = this.add.text(kingX, kingY, "★ KING! ★", {
        fontSize: '11px',
        color: '#f1c40f',
        fontStyle: 'bold',
        fontFamily: '"Luckiest Guy", sans-serif'
      }).setOrigin(0.5).setDepth(100);
      if (gameContainer) gameContainer.add(crownText);

      this.tweens.add({
        targets: crownText,
        y: kingY - 22,
        scaleX: 1.3,
        scaleY: 1.3,
        alpha: 0,
        duration: 850,
        ease: 'Back.out',
        onComplete: () => crownText.destroy()
      });
    }

    function triggerVictoryEffect(this: any) {
      if (this.cameras && this.cameras.main) {
        this.cameras.main.flash(400, 255, 215, 0);
      }

      for (let i = 0; i < 35; i++) {
        const x = Math.random() * 240;
        const y = Math.random() * 20;
        const confetti = this.add.image(x, y, 'sparkParticle').setDepth(120);
        if (gameContainer) gameContainer.add(confetti);

        this.tweens.add({
          targets: confetti,
          x: x + (Math.random() - 0.5) * 60,
          y: y + 260 + Math.random() * 40,
          rotation: Math.random() * Math.PI * 2,
          alpha: 0,
          duration: 1200 + Math.random() * 800,
          ease: 'Cubic.out',
          onComplete: () => confetti.destroy()
        });
      }
    }

    function createGameScreen(this: any) {
      gameContainer = this.add.container(0, 0).setDepth(10);

      // Header UI Panel
      const headerPanel = this.add.rectangle(120, 34, 240, 68, 0x1d110c);

      // Top Row: Player Labels & Score
      // Player 1 (White) - Left
      const p1Circle = this.add.circle(18, 18, 10, 0x3498db);
      const p1Icon = this.add.text(18, 18, "W", { fontSize: '10px', color: '#ffffff', fontStyle: 'bold', fontFamily: '"Luckiest Guy", sans-serif' }).setOrigin(0.5);
      p1NameText = this.add.text(32, 18, "You", { fontSize: '12px', color: '#3498db', fontStyle: 'bold', fontFamily: '"Baloo Chettan", sans-serif' }).setOrigin(0, 0.5);

      // Score - Center
      scoreText = this.add.text(120, 18, "20 : 20", {
        fontSize: '18px',
        color: '#00e5ff',
        fontStyle: 'bold',
        fontFamily: '"Luckiest Guy", sans-serif'
      }).setOrigin(0.5);

      // Player 2 / AI (Black) - Right
      p2NameText = this.add.text(208, 18, "AI", { fontSize: '12px', color: '#e67e22', fontStyle: 'bold', fontFamily: '"Baloo Chettan", sans-serif' }).setOrigin(1, 0.5);
      const p2Circle = this.add.circle(222, 18, 10, 0xe67e22);
      const p2Icon = this.add.text(222, 18, "B", { fontSize: '10px', color: '#ffffff', fontStyle: 'bold', fontFamily: '"Luckiest Guy", sans-serif' }).setOrigin(0.5);

      // Bottom Row: Status Bar Pill
      const statusBg = this.add.rectangle(120, 48, 220, 20, 0x2c1a14).setStrokeStyle(1, 0x4a2e22);
      statusText = this.add.text(120, 48, "YOUR TURN (WHITE)", {
        fontSize: '11px',
        color: '#f1c40f',
        fontStyle: 'bold',
        fontFamily: '"Baloo Chettan", sans-serif'
      }).setOrigin(0.5);

      gameContainer.add([headerPanel, p1Circle, p1Icon, p1NameText, scoreText, p2NameText, p2Circle, p2Icon, statusBg, statusText]);

      // Initialize Board
      initBoard.call(this);

      // Yellow Selection Cursor
      cursorRect = this.add.rectangle(0, 0, CELL_SIZE, CELL_SIZE, 0xffff00, 0.4);
      cursorRect.setStrokeStyle(2, 0xffff00);
      gameContainer.add(cursorRect);

      updateCursor.call(this);
      drawPieces.call(this);
    }

    function updateHeaderUI() {
      if (gameMode === 'AI') {
        p1NameText.setText("You");
        p2NameText.setText("AI");
      } else {
        p1NameText.setText("P1");
        p2NameText.setText("P2");
      }
    }

    function updateStatusText() {
      if (!statusText) return;
      if (gameMode === 'AI') {
        statusText.setText(turn === 1 ? "YOUR TURN (WHITE)" : "AMARACHI'S TURN");
      } else {
        statusText.setText(turn === 1 ? "P1 TURN (WHITE)" : "P2 TURN (BLACK)");
      }
    }

    function initBoard(this: any) {
      for (let r = 0; r < BOARD_SIZE; r++) {
        board[r] = [];
        cells[r] = [];
        pieces[r] = [];
        for (let c = 0; c < BOARD_SIZE; c++) {
          const isDark = (r + c) % 2 === 1;
          const x = c * CELL_SIZE + OFFSET_X + CELL_SIZE / 2;
          const y = r * CELL_SIZE + OFFSET_Y + CELL_SIZE / 2;

          const tileKey = isDark ? 'darkTile' : 'lightTile';
          const cell = this.add.image(x, y, tileKey);
          cell.setDisplaySize(CELL_SIZE - 1, CELL_SIZE - 1);
          cells[r][c] = cell;
          if (gameContainer) gameContainer.add(cell);

          let pieceVal = 0;
          if (isDark) {
            if (r < 4) pieceVal = 2; // Black
            else if (r > 5) pieceVal = 1; // White
          }
          board[r][c] = pieceVal;
        }
      }
    }

    function createRulesScreen(this: any) {
      rulesContainer = this.add.container(0, 0).setDepth(100).setVisible(false);
      
      // Modal Box Background
      const bg = this.add.rectangle(120, 160, 224, 270, 0x140b07, 0.98);
      bg.setStrokeStyle(2, 0xd35400);

      const title = this.add.text(120, 42, "NIGERIAN DRAFT RULES", {
        fontSize: '12px',
        color: '#f1c40f',
        fontStyle: 'bold',
        fontFamily: '"Luckiest Guy", sans-serif'
      }).setOrigin(0.5);

      const divider = this.add.rectangle(120, 56, 190, 1, 0x553322);

      const rulesList = [
        "1. Play vs Amarachi AI or 2P Local.",
        "2. 10x10 Board (20 pieces each).",
        "3. White moves first.",
        "4. Jumps / Captures COMPULSORY.",
        "5. Can jump forwards & backwards.",
        "6. Flying Kings move any distance.",
        "7. King reaches end line & stops."
      ];

      const ruleTexts: any[] = [];
      rulesList.forEach((rule, idx) => {
        const item = this.add.text(22, 68 + idx * 22, rule, {
          fontSize: '10.5px',
          color: '#ecf0f1',
          fontFamily: '"Baloo Chettan", sans-serif'
        });
        ruleTexts.push(item);
      });

      const footerPill = this.add.rectangle(120, 260, 180, 22, 0x27170e).setStrokeStyle(1, 0x2ecc71);
      const footer = this.add.text(120, 260, "Press OK or BACK to return", {
        fontSize: '11px',
        color: '#2ecc71',
        fontStyle: 'bold',
        fontFamily: '"Baloo Chettan", sans-serif'
      }).setOrigin(0.5);

      rulesContainer.add([bg, title, divider, ...ruleTexts, footerPill, footer]);
    }

    function resetGame(this: any) {
      turn = 1;
      isAIBusy = false;
      isMidMultiJump = false;
      moveHistory = [];
      selectedPiece = null;
      initBoard.call(this);
      drawPieces.call(this);
      updateScore();
      updateHeaderUI();
      updateStatusText();
    }

    function undoLastMove(this: any) {
      if (isAIBusy) return;

      if (moveHistory.length === 0) {
        statusText.setText("NO MOVES TO UNDO!");
        return;
      }

      const prevBoard = moveHistory.pop()!;
      board = prevBoard.map(row => [...row]);
      selectedPiece = null;
      isMidMultiJump = false;

      if (gameMode === '2P') {
        turn = turn === 1 ? 2 : 1;
      } else {
        turn = 1;
      }

      drawPieces.call(this);
      updateScore();
      updateStatusText();
    }

    function updateCursor(this: any) {
      if (!cursorRect) return;
      cursorRect.x = cursorC * CELL_SIZE + OFFSET_X + CELL_SIZE / 2;
      cursorRect.y = cursorR * CELL_SIZE + OFFSET_Y + CELL_SIZE / 2;
      drawMoveIndicators.call(this);
    }

    function executePlayerMove(this: any, fromR: number, fromC: number, toR: number, toC: number) {
      if (!isMidMultiJump) {
        moveHistory.push(board.map(row => [...row]));
      }

      const isJump = Math.abs(toR - fromR) > 1;
      movePiece.call(this, fromR, fromC, toR, toC);

      let canJumpAgain = false;
      if (isJump) {
        const nextMoves = getValidMoves(toR, toC).filter(m => m.isJump);
        if (nextMoves.length > 0) {
          canJumpAgain = true;
        }
      }

      if (canJumpAgain) {
        isMidMultiJump = true;
        selectedPiece = { r: toR, c: toC };
        cursorR = toR;
        cursorC = toC;
        statusText.setText("MUST JUMP AGAIN!");
        drawPieces.call(this);

        const nextMoves = getValidMoves(toR, toC).filter(m => m.isJump);
        if (nextMoves.length === 1) {
          this.time.delayedCall(250, () => {
            executePlayerMove.call(this, toR, toC, nextMoves[0].r, nextMoves[0].tc);
          });
        }
      } else {
        isMidMultiJump = false;
        selectedPiece = null;
        cursorR = toR;
        cursorC = toC;
        turn = turn === 1 ? 2 : 1;
        drawPieces.call(this);
        updateScore();
        if (!checkGameOver.call(this)) {
          if (gameMode === 'AI' && turn === 2) {
            triggerAIMove.call(this);
          } else {
            updateStatusText();
          }
        }
      }
    }

    function selectCell(this: any, r: number, c: number) {
      if (isAIBusy) return;
      if (gameMode === 'AI' && turn !== 1) return;

      const piece = board[r][c];
      const myPieces = turn === 1 ? [1, 3] : [2, 4];
      const playerVal = turn;

      if (selectedPiece) {
        // Unselect if clicking the same piece
        if (selectedPiece.r === r && selectedPiece.c === c) {
          if (!isMidMultiJump) {
            selectedPiece = null;
            updateStatusText();
            drawPieces.call(this);
          }
          return;
        }

        if (isValidMove(selectedPiece.r, selectedPiece.c, r, c)) {
          executePlayerMove.call(this, selectedPiece.r, selectedPiece.c, r, c);
          return;
        } else {
          // Check if selecting another valid player piece
          if (!isMidMultiJump && piece !== 0 && myPieces.includes(piece)) {
            const jumps = findAllJumps(playerVal);
            if (jumps.length === 0 || jumps.some(j => j.sr === r && j.sc === c)) {
              const validMoves = getValidMoves(r, c);
              if (validMoves.length === 1) {
                executePlayerMove.call(this, r, c, validMoves[0].r, validMoves[0].tc);
                return;
              } else if (validMoves.length > 1) {
                selectedPiece = { r, c };
                statusText.setText("PIECE SELECTED - PICK MOVE");
                drawPieces.call(this);
                return;
              }
            }
          }
          if (!isMidMultiJump) {
            selectedPiece = null;
            updateStatusText();
            drawPieces.call(this);
          }
        }
      } else if (piece !== 0 && myPieces.includes(piece)) {
        const jumps = findAllJumps(playerVal);
        if (jumps.length > 0) {
          const pieceHasJump = jumps.some(j => j.sr === r && j.sc === c);
          if (!pieceHasJump) return;
        }
        
        const validMoves = getValidMoves(r, c);
        if (validMoves.length === 1) {
          executePlayerMove.call(this, r, c, validMoves[0].r, validMoves[0].tc);
        } else if (validMoves.length > 1) {
          selectedPiece = { r, c };
          statusText.setText("PIECE SELECTED - PICK MOVE");
          drawPieces.call(this);
        }
      }
    }

    function triggerAIMove(this: any) {
      isAIBusy = true;
      statusText.setText("Amarachi Thinking...");

      this.time.delayedCall(700, () => {
        executeAIMove.call(this);
      });
    }

    function executeAIMove(this: any) {
      const jumps = findAllJumps(2);
      const allMoves: { sr: number, sc: number, tr: number, tc: number, isJump: boolean, score: number }[] = [];

      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const p = board[r][c];
          if (p === 2 || p === 4) {
            if (jumps.length > 0) {
              const canJump = jumps.some(j => j.sr === r && j.sc === c);
              if (!canJump) continue;
            }
            const validMoves = getValidMoves(r, c);
            for (const m of validMoves) {
              let score = 0;
              if (m.isJump) score += 100;
              if (p === 2 && m.r === BOARD_SIZE - 1) score += 50;
              if (p === 4) score += 15;
              score += m.r * 2;
              
              allMoves.push({ sr: r, sc: c, tr: m.r, tc: m.tc, isJump: m.isJump, score });
            }
          }
        }
      }

      if (allMoves.length === 0) {
        statusText.setText("You Win! AI Has No Moves.");
        isAIBusy = false;
        return;
      }

      allMoves.sort((a, b) => b.score - a.score);
      const topScore = allMoves[0].score;
      const bestCandidates = allMoves.filter(m => m.score >= topScore - 5);
      const chosen = bestCandidates[Math.floor(Math.random() * bestCandidates.length)];

      movePiece.call(this, chosen.sr, chosen.sc, chosen.tr, chosen.tc);

      let canJumpAgain = false;
      if (chosen.isJump) {
        const nextMoves = getValidMoves(chosen.tr, chosen.tc);
        if (nextMoves.some(m => m.isJump)) {
          canJumpAgain = true;
        }
      }

      drawPieces.call(this);
      updateScore();

      if (canJumpAgain) {
        statusText.setText("Amarachi Jumps Again!");
        this.time.delayedCall(600, () => {
          executeAIMove.call(this);
        });
      } else {
        turn = 1;
        isAIBusy = false;
        if (!checkGameOver.call(this)) {
          statusText.setText("YOUR TURN (WHITE)");
        }
      }
    }

    function checkGameOver(this: any) {
      let whiteCount = 0;
      let blackCount = 0;
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (board[r][c] === 1 || board[r][c] === 3) whiteCount++;
          if (board[r][c] === 2 || board[r][c] === 4) blackCount++;
        }
      }

      if (whiteCount === 0) {
        statusText.setText(gameMode === 'AI' ? "Amarachi Wins!" : "P2 Wins (Black)!");
        triggerVictoryEffect.call(this);
        return true;
      }
      if (blackCount === 0) {
        statusText.setText(gameMode === 'AI' ? "You Win!" : "P1 Wins (White)!");
        triggerVictoryEffect.call(this);
        return true;
      }

      const currentPlayer = turn;
      let hasMove = false;
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const p = board[r][c];
          if ((currentPlayer === 1 && (p === 1 || p === 3)) || (currentPlayer === 2 && (p === 2 || p === 4))) {
            if (getValidMoves(r, c).length > 0) {
              hasMove = true;
              break;
            }
          }
        }
        if (hasMove) break;
      }

      if (!hasMove) {
        if (gameMode === 'AI') {
          statusText.setText(currentPlayer === 1 ? "Amarachi Wins (No Moves)!" : "You Win (No Moves)!");
        } else {
          statusText.setText(currentPlayer === 1 ? "P2 Wins (P1 Has No Moves)!" : "P1 Wins (P2 Has No Moves)!");
        }
        triggerVictoryEffect.call(this);
        return true;
      }

      return false;
    }

    function findAllJumps(player: number) {
      const jumps = [];
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const p = board[r][c];
          if (p === 0) continue;
          if ((player === 1 && (p === 1 || p === 3)) || (player === 2 && (p === 2 || p === 4))) {
            const moves = getValidMoves(r, c);
            for (const m of moves) {
              if (m.isJump) jumps.push({ sr: r, sc: c, tr: m.r, tc: m.tc });
            }
          }
        }
      }
      return jumps;
    }

    function getValidMoves(r: number, c: number) {
      const moves: {r: number, tc: number, isJump: boolean}[] = [];
      const piece = board[r][c];
      const player = (piece === 1 || piece === 3) ? 1 : 2;
      const dirs = [[1,1], [1,-1], [-1,1], [-1,-1]];

      if (piece === 3 || piece === 4) { // Flying King
        for (const [dr, dc] of dirs) {
          let tr = r + dr;
          let tc = c + dc;
          let hasJumped = false;
          while (tr >= 0 && tr < BOARD_SIZE && tc >= 0 && tc < BOARD_SIZE) {
            const target = board[tr][tc];
            if (target === 0) {
              moves.push({ r: tr, tc, isJump: hasJumped });
            } else {
              if (hasJumped) break;
              const targetPlayer = (target === 1 || target === 3) ? 1 : 2;
              if (targetPlayer !== player) {
                const nextR = tr + dr;
                const nextC = tc + dc;
                if (nextR >= 0 && nextR < BOARD_SIZE && nextC >= 0 && nextC < BOARD_SIZE && board[nextR][nextC] === 0) {
                  hasJumped = true;
                  tr = nextR - dr;
                  tc = nextC - dc;
                } else break;
              } else break;
            }
            tr += dr;
            tc += dc;
          }
        }
      } else {
        for (const [dr, dc] of dirs) {
          if ((player === 1 && dr === -1) || (player === 2 && dr === 1)) {
            const tr = r + dr;
            const tc = c + dc;
            if (tr >= 0 && tr < BOARD_SIZE && tc >= 0 && tc < BOARD_SIZE && board[tr][tc] === 0) {
              moves.push({ r: tr, tc, isJump: false });
            }
          }
          const midR = r + dr;
          const midC = c + dc;
          const tr = r + dr * 2;
          const tc = c + dc * 2;
          if (tr >= 0 && tr < BOARD_SIZE && tc >= 0 && tc < BOARD_SIZE && board[tr][tc] === 0) {
            const midPiece = board[midR][midC];
            if (midPiece !== 0) {
              const midPlayer = (midPiece === 1 || midPiece === 3) ? 1 : 2;
              if (midPlayer !== player) {
                moves.push({ r: tr, tc, isJump: true });
              }
            }
          }
        }
      }

      const jumpMoves = moves.filter(m => m.isJump);
      return jumpMoves.length > 0 ? jumpMoves : moves;
    }

    function isValidMove(sr: number, sc: number, tr: number, tc: number) {
      const moves = getValidMoves(sr, sc);
      return moves.some(m => m.r === tr && m.tc === tc);
    }

    function movePiece(this: any, sr: number, sc: number, tr: number, tc: number) {
      let piece = board[sr][sc];
      const wasKing = (piece === 3 || piece === 4);
      let isCrowned = false;

      if (piece === 1 && tr === 0) {
        piece = 3;
        if (!wasKing) isCrowned = true;
      }
      if (piece === 2 && tr === BOARD_SIZE - 1) {
        piece = 4;
        if (!wasKing) isCrowned = true;
      }

      board[tr][tc] = piece;
      board[sr][sc] = 0;

      const dr = Math.sign(tr - sr);
      const dc = Math.sign(tc - sc);
      let cr = sr + dr;
      let cc = sc + dc;

      while (cr !== tr && cc !== tc) {
        if (board[cr][cc] !== 0) {
          board[cr][cc] = 0;
          triggerCaptureEffect.call(this, cr, cc);
          break;
        }
        cr += dr;
        cc += dc;
      }

      if (isCrowned) {
        triggerKingCrownedEffect.call(this, tr, tc);
      }
    }

    function updateScore() {
      let white = 0;
      let black = 0;
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (board[r][c] === 1 || board[r][c] === 3) white++;
          if (board[r][c] === 2 || board[r][c] === 4) black++;
        }
      }
      scoreText.setText(`${white} : ${black}`);
    }

    function drawPieces(this: any) {
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (pieces[r][c]) {
            pieces[r][c].destroy();
            pieces[r][c] = null;
          }
          if (cells[r] && cells[r][c]) cells[r][c].clearTint();
        }
      }

      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const val = board[r][c];
          if (val === 0) continue;
          const x = c * CELL_SIZE + OFFSET_X + CELL_SIZE / 2;
          const y = r * CELL_SIZE + OFFSET_Y + CELL_SIZE / 2;
          
          let textureKey = 'redPiece';
          if (val === 1) textureKey = 'redPiece';
          else if (val === 2) textureKey = 'blackPiece';
          else if (val === 3) textureKey = 'redKing';
          else if (val === 4) textureKey = 'blackKing';

          const pieceSprite = this.add.image(x, y, textureKey);
          if (selectedPiece && selectedPiece.r === r && selectedPiece.c === c) {
            pieceSprite.setDisplaySize(CELL_SIZE + 2, CELL_SIZE + 2);
            pieceSprite.setDepth(22);
          } else {
            pieceSprite.setDisplaySize(CELL_SIZE - 2, CELL_SIZE - 2);
            pieceSprite.setDepth(10);
          }
          if (gameContainer) gameContainer.add(pieceSprite);
          pieces[r][c] = pieceSprite;
        }
      }

      drawMoveIndicators.call(this);
    }

    function drawMoveIndicators(this: any) {
      for (const ind of moveIndicators) {
        if (ind && ind.destroy) ind.destroy();
      }
      moveIndicators = [];

      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (cells[r] && cells[r][c]) cells[r][c].clearTint();
        }
      }

      if (isAIBusy) return;
      if (gameMode === 'AI' && turn !== 1) return;

      const myPieces = turn === 1 ? [1, 3] : [2, 4];
      const playerVal = turn;

      // Visual indicator on Selected Piece
      if (selectedPiece) {
        const sr = selectedPiece.r;
        const sc = selectedPiece.c;
        if (cells[sr] && cells[sr][sc]) cells[sr][sc].setTint(0xffd54f);

        const sx = sc * CELL_SIZE + OFFSET_X + CELL_SIZE / 2;
        const sy = sr * CELL_SIZE + OFFSET_Y + CELL_SIZE / 2;

        const ring = this.add.image(sx, sy, 'selectedRing');
        ring.setDisplaySize(CELL_SIZE + 2, CELL_SIZE + 2);
        ring.setDepth(25);
        if (gameContainer) gameContainer.add(ring);

        this.tweens.add({
          targets: ring,
          scaleX: 1.15,
          scaleY: 1.15,
          duration: 350,
          yoyo: true,
          repeat: -1
        });

        moveIndicators.push(ring);
      }

      let targetR = -1;
      let targetC = -1;

      if (selectedPiece) {
        targetR = selectedPiece.r;
        targetC = selectedPiece.c;
      } else if (board[cursorR] && myPieces.includes(board[cursorR][cursorC])) {
        const jumps = findAllJumps(playerVal);
        if (jumps.length === 0 || jumps.some(j => j.sr === cursorR && j.sc === cursorC)) {
          targetR = cursorR;
          targetC = cursorC;
        }
      }

      if (targetR === -1 || targetC === -1) return;

      const validMoves = getValidMoves(targetR, targetC);

      for (const m of validMoves) {
        const x = m.tc * CELL_SIZE + OFFSET_X + CELL_SIZE / 2;
        const y = m.r * CELL_SIZE + OFFSET_Y + CELL_SIZE / 2;
        const key = m.isJump ? 'captureDot' : 'moveDot';

        if (cells[m.r] && cells[m.r][m.tc]) cells[m.r][m.tc].setTint(m.isJump ? 0xef9a9a : 0xa5d6a7);

        const dot = this.add.image(x, y, key);
        dot.setDisplaySize(CELL_SIZE - 4, CELL_SIZE - 4);
        dot.setDepth(20);
        if (gameContainer) gameContainer.add(dot);

        this.tweens.add({
          targets: dot,
          scaleX: 0.85,
          scaleY: 0.85,
          duration: 400,
          yoyo: true,
          repeat: -1
        });

        moveIndicators.push(dot);
      }
    }

    function update() {}

    return () => {
      active = false;
      if (game) {
        game.destroy(true);
      }
    };
  }, []);

  return (
    <div id="game-container" ref={gameRef} style={{ width: '240px', height: '320px', overflow: 'hidden' }} />
  );
}
