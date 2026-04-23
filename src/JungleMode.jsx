import Phaser from "phaser";
import { ArrowLeft, FileText, Mail } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { jungleLocations, profile } from "./content.js";

const travelMap = {
  bcg: { area: "overworld", spawn: "strategy-door" },
  robotics: { area: "overworld", spawn: "robotics-door" },
  incubator: { area: "overworld", spawn: "incubator-door" },
  "trophy-hall": { area: "overworld", spawn: "trophy-door" }
};

/** Y-sort: higher screen Y draws above (in front). */
const DEPTH_PER_Y = 12;
const DEPTH_FLOOR = 2;
const DEPTH_PATH = 4;
const DEPTH_INTERIOR_WALL = 18;
const DEPTH_INTERIOR_RUG = 10;

function darkenHex(hex, amt) {
  const r = Math.max(0, ((hex >> 16) & 0xff) - amt);
  const g = Math.max(0, ((hex >> 8) & 0xff) - amt);
  const b = Math.max(0, (hex & 0xff) - amt);
  return (r << 16) | (g << 8) | b;
}

export function JungleMode({ onExit, onOpenDetails }) {
  const hostRef = useRef(null);
  const gameRef = useRef(null);
  const [dialogue, setDialogue] = useState(null);
  const [areaMeta, setAreaMeta] = useState({
    label: "Career District",
    hint: "Walk into doorways to enter buildings. WASD / click to move; Space to inspect."
  });

  const dismissDialogue = useCallback(() => setDialogue(null), []);

  useEffect(() => {
    if (!hostRef.current || gameRef.current) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current,
      backgroundColor: "#10151d",
      pixelArt: true,
      roundPixels: true,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 512,
        height: 384
      },
      physics: {
        default: "arcade",
        arcade: { debug: false }
      },
      scene: [new JungleScene()]
    });

    gameRef.current = game;

    const handleDialogue = (event) => setDialogue(event.detail);
    const handleClose = () => setDialogue(null);
    const handleArea = (event) => setAreaMeta(event.detail);

    window.addEventListener("jungle:dialogue", handleDialogue);
    window.addEventListener("jungle:close-dialogue", handleClose);
    window.addEventListener("jungle:area", handleArea);

    return () => {
      window.removeEventListener("jungle:dialogue", handleDialogue);
      window.removeEventListener("jungle:close-dialogue", handleClose);
      window.removeEventListener("jungle:area", handleArea);
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!dialogue) return;
    const onKey = (event) => {
      if (event.key === "Escape") dismissDialogue();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialogue, dismissDialogue]);

  const travelTo = (id) => {
    setDialogue(null);
    const travel = travelMap[id];
    if (!travel) return;
    window.dispatchEvent(new CustomEvent("jungle:travel", { detail: travel }));
  };

  return (
    <main className="jungle-shell">
      <div className="jungle-ds-bezel" aria-hidden="true">
        <div className="jungle-ds-inner">
          <div className="jungle-canvas" ref={hostRef} aria-label="Jack's Jungle interactive map" />
        </div>
      </div>

      <header className="jungle-hud">
        <button type="button" className="hud-button" onClick={onExit}>
          <ArrowLeft size={16} />
          Portfolio
        </button>

        <div className="hud-title">
          <small>Jack&apos;s Jungle</small>
          <span>{areaMeta.label}</span>
        </div>

        <div className="hud-links">
          <a href={`mailto:${profile.email}`} aria-label="Email Jack">
            <Mail size={16} />
          </a>
          <a href={profile.resume} aria-label="Open resume">
            <FileText size={16} />
          </a>
        </div>
      </header>

      <nav className="fast-travel" aria-label="Fast travel">
        {jungleLocations.map((location) => (
          <button type="button" key={location.id} onClick={() => travelTo(location.id)}>
            <span className="ft-key">{location.key}</span>
            {location.label}
          </button>
        ))}
      </nav>

      <aside className="jungle-help">
        <div className="help-label-row">
          <span className="help-tag">Area</span>
          <strong>{areaMeta.label}</strong>
        </div>
        <p>{areaMeta.hint}</p>
      </aside>

      <footer className="jungle-controls-hint" aria-hidden="true">
        <span>
          <kbd>WASD</kbd> move
        </span>
        <span>
          <kbd>Space</kbd> interact
        </span>
        <span>
          <kbd>Click</kbd> walk
        </span>
      </footer>

      {dialogue && (
        <section className="dialogue-box" aria-live="polite">
          <div className="dialogue-frame">
            <div className="dialogue-nameplate">
              <span className="dialogue-name">{dialogue.section}</span>
              <span className="dialogue-kind">{dialogue.kindLabel ?? "Message"}</span>
            </div>
            <p className="dialogue-body">{dialogue.dialogue}</p>
            <div className="dialogue-footer-row" aria-hidden="true">
              <span className="dialogue-caret">▼</span>
            </div>
            <div className="dialogue-actions">
              {dialogue.itemId && (
                <button type="button" className="dialogue-btn-primary" onClick={() => onOpenDetails(dialogue.itemId)}>
                  Open details
                </button>
              )}
              <button type="button" className="dialogue-btn-secondary" onClick={dismissDialogue}>
                Close
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

class JungleScene extends Phaser.Scene {
  constructor() {
    super("JungleScene");
    this.target = null;
    this.pendingInteraction = null;
    this.currentArea = "overworld";
    this.interactions = [];
    this.obstacles = [];
    this.rendered = [];
    this._moveActive = false;
    this._lastDoorOverlapId = null;
    this._doorCooldownUntil = 0;
  }

  create() {
    this.createTextures();
    this.createInput();
    this.createPlayer();
    this.switchArea("overworld", "default");

    window.addEventListener("jungle:travel", this.handleTravel);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("jungle:travel", this.handleTravel);
    });
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      window.removeEventListener("jungle:travel", this.handleTravel);
    });
  }

  createTextures() {
    const makeTile = (key, fill, accentA, accentB, stroke) => {
      const g = this.add.graphics();
      g.fillStyle(fill, 1);
      g.fillRect(0, 0, 16, 16);
      g.fillStyle(accentA, 1);
      g.fillRect(2, 2, 3, 3);
      g.fillRect(9, 6, 2, 2);
      g.fillStyle(accentB, 1);
      g.fillRect(12, 12, 2, 2);
      g.lineStyle(1, stroke, 0.45);
      g.strokeRect(0.5, 0.5, 15, 15);
      g.generateTexture(key, 16, 16);
      g.destroy();
    };

    makeTile("grass-a", 0x74b55d, 0x8dcb73, 0x5a9a4b, 0x3e7232);
    makeTile("grass-b", 0x6cab58, 0x80c468, 0x4a8b3f, 0x346b2d);
    makeTile("path-a", 0xd6ca9a, 0xe6dcbe, 0xc4b57c, 0xa49363);
    makeTile("path-b", 0xcfc089, 0xe2d39d, 0xb7a166, 0x958354);
    makeTile("stone-a", 0xbec5ca, 0xd9dee2, 0x9ea8af, 0x7e8a92);
    makeTile("stone-b", 0xa7b2b8, 0xcad0d3, 0x8f9aa1, 0x738087);
    makeTile("water-a", 0x4f9bc7, 0x7ad3f0, 0x2f719a, 0x27597d);
    makeTile("water-b", 0x3f88b2, 0x64c1e1, 0x2d6791, 0x234c6c);
    makeTile("wood-a", 0xc89f62, 0xe7c280, 0x9c7141, 0x7f582f);
    makeTile("wood-b", 0xb58a4c, 0xdbb26e, 0x8a6535, 0x6f4f28);
    makeTile("floor-a", 0xe6dcc2, 0xf4ebd6, 0xcbbf9f, 0xada17f);
    makeTile("floor-b", 0xd8ccaf, 0xebdfc4, 0xbbaa8a, 0x9e9074);
    makeTile("wall-blue", 0x6b88a1, 0x87a7c4, 0x4c6580, 0x3d5266);
    makeTile("wall-red", 0xa46b6b, 0xc68686, 0x7f4f4f, 0x613a3a);
    makeTile("wall-green", 0x6e9d83, 0x8fc5a8, 0x4f7a63, 0x3e5d4b);
    makeTile("wall-gold", 0xa18852, 0xc4ab6a, 0x7d6638, 0x5d4a27);

    this.makeIsoBuildingTexture("building-strategy", 0x7a8fc4, 0xbfd4f2, 0x3d4f78, 0x4a5d84);
    this.makeIsoBuildingTexture("building-robotics", 0x5fa888, 0xc8f0e4, 0x2d5c48, 0x3a6d58);
    this.makeIsoBuildingTexture("building-incubator", 0xc46860, 0xffdcc0, 0x6b3832, 0x7a4238);
    this.makeIsoBuildingTexture("building-trophy", 0x8c78c4, 0xf0e0a0, 0x4a3868, 0x5a4480);

    this.makeShadowTexture();
    this.makePlayerTexture();
    this.makeObjectTexture("terminal", 0x79c9ff, 0x203d54);
    this.makeObjectTexture("trophy", 0xf2b53f, 0x65481d);
    this.makeObjectTexture("robot", 0xb7c7d4, 0x304250);
    this.makeObjectTexture("chart", 0x87de7e, 0x244a20);
    this.makeObjectTexture("frame", 0xf1e6bf, 0x5c4728);
    this.makeObjectTexture("desk", 0xd4ac68, 0x6a4d2b);
    this.makeObjectTexture("books", 0xca8c6a, 0x52436a);
    this.makeObjectTexture("plant", 0x77c35b, 0x315f2d);
    this.makeObjectTexture("board", 0xf1efdf, 0x304250);
    this.makeObjectTexture("archive", 0xc49363, 0x4a3322);
    this.makeObjectTexture("chess", 0xf2f0e6, 0x30303a);
    this.makeDoorTexture();
    this.makeTreeTexture();
  }

  /** Simple extruded “dollhouse” facade — reads closer to DS Pokémon towns (no trademark art). */
  makeIsoBuildingTexture(key, body, roofLight, trim, sideShade) {
    const g = this.add.graphics();
    const W = 128;
    const H = 108;
    const ox = 64;
    const oy = 86;

    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(ox, oy + 10, 96, 28);

    g.lineStyle(2, 0x1a1a22, 1);

    g.fillStyle(sideShade, 1);
    g.beginPath();
    g.moveTo(ox - 54, oy - 6);
    g.lineTo(ox - 78, oy - 28);
    g.lineTo(ox - 78, oy - 62);
    g.lineTo(ox - 54, oy - 44);
    g.closePath();
    g.fillPath();
    g.strokePath();

    const roofShadow = darkenHex(body, 28);
    g.fillStyle(roofShadow, 1);
    g.beginPath();
    g.moveTo(ox - 54, oy - 44);
    g.lineTo(ox - 78, oy - 62);
    g.lineTo(ox - 26, oy - 78);
    g.lineTo(ox - 2, oy - 58);
    g.closePath();
    g.fillPath();
    g.strokePath();

    g.fillStyle(roofLight, 1);
    g.beginPath();
    g.moveTo(ox - 2, oy - 58);
    g.lineTo(ox - 26, oy - 78);
    g.lineTo(ox + 58, oy - 72);
    g.lineTo(ox + 82, oy - 52);
    g.closePath();
    g.fillPath();
    g.strokePath();

    g.fillStyle(body, 1);
    g.beginPath();
    g.moveTo(ox - 54, oy - 6);
    g.lineTo(ox - 54, oy - 44);
    g.lineTo(ox - 2, oy - 58);
    g.lineTo(ox + 58, oy - 50);
    g.lineTo(ox + 58, oy - 12);
    g.lineTo(ox + 6, oy + 2);
    g.closePath();
    g.fillPath();
    g.strokePath();

    g.fillStyle(trim, 1);
    g.fillRect(ox - 48, oy - 36, 96, 5);
    g.lineStyle(1, 0x1a1a22, 0.85);
    g.strokeRect(ox - 48, oy - 36, 96, 5);

    const winGlass = (wx) => {
      g.fillStyle(0x6a8cc4, 1);
      g.fillRect(wx, oy - 28, 14, 12);
      g.fillStyle(0xa8c8ff, 0.55);
      g.fillRect(wx + 2, oy - 26, 5, 4);
      g.lineStyle(1, 0x1a1a22, 0.9);
      g.strokeRect(wx, oy - 28, 14, 12);
    };
    winGlass(ox - 40);
    winGlass(ox + 18);

    g.fillStyle(0x2a1e1c, 1);
    g.fillRect(ox - 12, oy - 18, 24, 22);
    g.lineStyle(2, 0x1a1a22, 1);
    g.strokeRect(ox - 12, oy - 18, 24, 22);
    g.fillStyle(0xc8b88a, 1);
    g.fillRect(ox + 6, oy - 8, 3, 3);

    g.generateTexture(key, W, H);
    g.destroy();
  }

  makeShadowTexture() {
    const g = this.add.graphics();
    g.fillStyle(0x0c1020, 0.45);
    g.fillEllipse(12, 8, 22, 10);
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(12, 8, 18, 8);
    g.generateTexture("ground-shadow", 24, 16);
    g.destroy();
  }

  makeObjectTexture(key, fill, dark) {
    const g = this.add.graphics();
    const ol = 0x141018;
    g.lineStyle(2, ol, 1);
    g.fillStyle(dark, 1);
    g.fillRect(3, 15, 18, 5);
    g.strokeRect(3, 15, 18, 5);
    g.fillStyle(fill, 1);
    g.fillRect(6, 5, 12, 10);
    g.strokeRect(6, 5, 12, 10);
    g.fillRect(4, 7, 16, 4);
    g.fillStyle(0xffffff, 0.42);
    g.fillRect(8, 6, 3, 3);
    g.generateTexture(key, 24, 24);
    g.destroy();
  }

  makeDoorTexture() {
    const g = this.add.graphics();
    g.lineStyle(2, 0x141018, 1);
    g.fillStyle(0x4a362f, 1);
    g.fillRect(2, 4, 22, 26);
    g.fillStyle(0x2a1a18, 1);
    g.fillRect(5, 7, 16, 22);
    g.fillStyle(0x5c4338, 1);
    g.fillRect(7, 9, 12, 18);
    g.fillStyle(0xc8b88a, 1);
    g.fillRect(17, 16, 3, 3);
    g.strokeRect(2, 4, 22, 26);
    g.generateTexture("door", 26, 32);
    g.destroy();
  }

  makeTreeTexture() {
    const g = this.add.graphics();
    g.lineStyle(2, 0x142018, 1);
    g.fillStyle(0x4a3224, 1);
    g.fillRect(13, 20, 8, 12);
    g.strokeRect(13, 20, 8, 12);
    g.fillStyle(0x2d5a28, 1);
    g.fillEllipse(16, 14, 30, 22);
    g.fillStyle(0x4a983c, 1);
    g.fillEllipse(14, 12, 22, 16);
    g.fillStyle(0x7ad060, 0.55);
    g.fillEllipse(11, 9, 10, 8);
    g.strokeEllipse(16, 14, 30, 22);
    g.generateTexture("tree", 36, 36);
    g.destroy();
  }

  makePlayerTexture() {
    const outline = 0x101018;
    const g = this.add.graphics();
    const strokeRect = (x, y, w, h, fill) => {
      g.fillStyle(outline, 1);
      g.fillRect(x - 1, y - 1, w + 2, h + 2);
      g.fillStyle(fill, 1);
      g.fillRect(x, y, w, h);
    };

    strokeRect(9, 26, 5, 8, 0x1a1c28);
    strokeRect(16, 26, 5, 8, 0x1a1c28);
    strokeRect(10, 18, 10, 4, 0xc44444);
    strokeRect(9, 14, 12, 10, 0x2a58a8);
    strokeRect(10, 6, 10, 10, 0xf0c8a8);
    strokeRect(11, 2, 8, 6, 0x1a2040);
    strokeRect(12, 4, 6, 3, 0x283050);
    strokeRect(11, 16, 8, 2, 0xf8f8f0);
    g.fillStyle(0xffffff, 0.35);
    g.fillRect(12, 8, 3, 2);
    g.generateTexture("jack", 32, 38);
    g.destroy();
  }

  createInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D,SPACE,ENTER,ONE,TWO,THREE,FOUR");

    this.input.on("pointerdown", (pointer) => {
      if (pointer.event.target?.closest?.("button,a")) return;
      const world = pointer.positionToCamera(this.cameras.main);
      const clickedInteraction = this.interactions.find((interaction) =>
        Phaser.Geom.Rectangle.Contains(interaction.rect, world.x, world.y)
      );

      if (clickedInteraction) {
        this.queueInteraction(clickedInteraction);
        return;
      }

      this.target = { x: world.x, y: world.y };
      this.pendingInteraction = null;
      this.closeDialogue();
    });

    this.handleTravel = (event) => {
      const { area, spawn } = event.detail;
      this.closeDialogue();
      this.switchArea(area, spawn);
    };
  }

  createPlayer() {
    this.playerShadow = this.add.image(0, 0, "ground-shadow");
    this.playerShadow.setOrigin(0.5, 0.5);
    this.playerShadow.setAlpha(0.55);
    this.player = this.physics.add.sprite(0, 0, "jack");
    this.player.setOrigin(0.5, 1);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(14, 10).setOffset(9, 28);
  }

  depthFromFoot(footY) {
    return Math.round(footY * DEPTH_PER_Y + 48);
  }

  syncPlayerStack() {
    const foot = this.player.body.bottom;
    const depth = this.depthFromFoot(foot);
    this.player.setDepth(depth + 2);
    this.playerShadow.setDepth(depth + 1);
    this.playerShadow.setPosition(this.player.x, foot - 1);
  }

  clearArea() {
    this.rendered.forEach((entry) => entry.destroy());
    this.rendered = [];
    this.interactions.forEach((interaction) => interaction.zone.destroy());
    this.interactions = [];
    this.obstacles.forEach((obstacle) => obstacle.destroy());
    this.obstacles = [];
  }

  switchArea(areaId, spawnKey = "default") {
    this.currentArea = areaId;
    this.clearArea();

    if (areaId === "overworld") this.buildOverworld();
    if (areaId === "strategy-room") this.buildStrategyRoom();
    if (areaId === "robotics-room") this.buildRoboticsRoom();
    if (areaId === "incubator-room") this.buildIncubatorRoom();
    if (areaId === "trophy-room") this.buildTrophyRoom();

    const spawn = this.areaSpawns[spawnKey] || this.areaSpawns.default;
    this.player.setPosition(spawn.x, spawn.y);
    this.player.body.reset(spawn.x, spawn.y);
    this.target = null;
    this.pendingInteraction = null;
    this._moveActive = false;
    this._lastDoorOverlapId = null;
    this._doorCooldownUntil = this.time.now + 350;
    this.cameras.main.setBounds(0, 0, this.areaWidth, this.areaHeight);
    this.physics.world.setBounds(0, 0, this.areaWidth, this.areaHeight);
    this.cameras.main.startFollow(this.player, true, 1, 1);
    this.cameras.main.roundPixels = true;
    this.cameras.main.setZoom(1);

    window.dispatchEvent(
      new CustomEvent("jungle:area", {
        detail: { label: this.areaLabel, hint: this.areaHint }
      })
    );
  }

  buildOverworld() {
    this.areaWidth = 992;
    this.areaHeight = 704;
    this.areaLabel = "Career District";
    this.areaHint =
      "Walk into a doorway to enter, or press Space. WASD / click to move. Space still works on signs and objects.";
    this.areaSpawns = {
      default: { x: 500, y: 566 },
      "strategy-door": { x: 206, y: 370 },
      "robotics-door": { x: 790, y: 370 },
      "incubator-door": { x: 248, y: 576 },
      "trophy-door": { x: 760, y: 576 }
    };

    for (let y = 0; y < this.areaHeight; y += 16) {
      for (let x = 0; x < this.areaWidth; x += 16) {
        const tile = (x + y) % 64 === 0 ? "grass-b" : "grass-a";
        this.rendered.push(this.add.image(x + 8, y + 8, tile).setDepth(DEPTH_FLOOR));
      }
    }

    this.drawTileRect(160, 312, 672, 64, "path-a", DEPTH_PATH);
    this.drawTileRect(448, 130, 96, 486, "path-b", DEPTH_PATH);
    this.drawTileRect(168, 160, 664, 56, "stone-a", DEPTH_PATH);
    this.drawTileRect(150, 514, 266, 48, "stone-b", DEPTH_PATH);
    this.drawTileRect(592, 506, 230, 56, "stone-b", DEPTH_PATH);
    this.drawTileRect(602, 570, 192, 70, "water-a", DEPTH_PATH);

    for (let x = 88; x <= 896; x += 48) {
      const fy = 92 + 14;
      this.rendered.push(this.add.image(x, 92, "tree").setDepth(this.depthFromFoot(fy)));
      const fy2 = 658 + 14;
      this.rendered.push(this.add.image(x, 658, "tree").setDepth(this.depthFromFoot(fy2)));
    }
    for (let y = 120; y <= 616; y += 48) {
      const fl = y + 14;
      this.rendered.push(this.add.image(72, y, "tree").setDepth(this.depthFromFoot(fl)));
      this.rendered.push(this.add.image(922, y, "tree").setDepth(this.depthFromFoot(fl)));
    }

    this.placeBuilding("building-strategy", 206, 262);
    this.placeBuilding("building-robotics", 790, 262);
    this.placeBuilding("building-incubator", 250, 468);
    this.placeBuilding("building-trophy", 760, 468);

    this.addObject("archive", 496, 204, "Data Archive");
    this.addObject("board", 680, 330, "Pomona Quad");
    this.addObject("chess", 864, 545, "Odds / Chess");
    this.addObject("plant", 570, 280);
    this.addObject("plant", 422, 480);

    this.addInteraction({
      id: "chess-plaza",
      label: "Odds / Chess",
      kind: "inspect",
      kindLabel: "Table",
      section: "Trophy Hall",
      dialogue:
        "A corner table for pattern games and probability: the same instinct that shows up in models, robotics, and late-night strategy.",
      itemId: "trophy-hall",
      x: 842,
      y: 518,
      width: 46,
      height: 38,
      actionX: 864,
      actionY: 572
    });

    this.addSign("JACK'S JUNGLE", 497, 92);
    this.addSign("Strategy", 206, 356);
    this.addSign("Robotics", 790, 356);
    this.addSign("Incubator", 250, 560);
    this.addSign("Trophy Hall", 760, 560);

    this.addObstacle(150, 218, 112, 68);
    this.addObstacle(734, 218, 112, 68);
    this.addObstacle(198, 424, 104, 66);
    this.addObstacle(708, 424, 104, 66);
    this.addObstacle(593, 569, 198, 69);

    this.addInteraction({
      id: "strategy-enter",
      label: "Strategy Tower",
      kind: "enter",
      kindLabel: "Door",
      section: "Strategy Tower",
      dialogue: "The strategy team is inside. Step through the door.",
      x: 158,
      y: 208,
      width: 96,
      height: 118,
      actionX: 206,
      actionY: 312,
      targetArea: "strategy-room",
      targetSpawn: "door"
    });
    this.addInteraction({
      id: "robotics-enter",
      label: "Robotics Lab",
      kind: "enter",
      kindLabel: "Door",
      section: "Robotics Lab",
      dialogue: "The lab is open. Bench tools and trophies are inside.",
      x: 742,
      y: 208,
      width: 96,
      height: 118,
      actionX: 790,
      actionY: 312,
      targetArea: "robotics-room",
      targetSpawn: "door"
    });
    this.addInteraction({
      id: "incubator-enter",
      label: "Incubator",
      kind: "enter",
      kindLabel: "Door",
      section: "Incubator / Hacker House",
      dialogue: "Late-night prototypes live in here.",
      x: 202,
      y: 414,
      width: 96,
      height: 118,
      actionX: 250,
      actionY: 518,
      targetArea: "incubator-room",
      targetSpawn: "door"
    });
    this.addInteraction({
      id: "trophy-enter",
      label: "Trophy Hall",
      kind: "enter",
      kindLabel: "Door",
      section: "Trophy Hall",
      dialogue: "Photos, awards, and personal artifacts are inside.",
      x: 712,
      y: 414,
      width: 96,
      height: 118,
      actionX: 760,
      actionY: 518,
      targetArea: "trophy-room",
      targetSpawn: "door"
    });
    this.addInteraction({
      id: "archive-plaza",
      label: "Data Archive",
      kind: "inspect",
      kindLabel: "Plaque",
      section: "Data Archive",
      dialogue:
        "Paper Prisons sits in the center of town because the data work carries real-world stakes.",
      itemId: "paper-prisons",
      x: 470,
      y: 178,
      width: 52,
      height: 40,
      actionX: 496,
      actionY: 236
    });
    this.addInteraction({
      id: "quad-sign",
      label: "Pomona Quad",
      kind: "inspect",
      kindLabel: "Sign",
      section: "Campus Quad",
      dialogue:
        "Pomona anchors the whole map: CS, philosophy, TA work, and a transcript that quietly does the job.",
      itemId: "pomona",
      x: 652,
      y: 304,
      width: 56,
      height: 40,
      actionX: 680,
      actionY: 356
    });
  }

  buildStrategyRoom() {
    this.buildInteriorBase("Strategy Tower", "Inside the tower: terminal, deal board, and executive-facing tooling.", {
      width: 640,
      height: 448,
      wall: "wall-blue",
      floor: "floor-a",
      carpet: "stone-a"
    });

    this.areaSpawns = {
      default: { x: 320, y: 408 },
      door: { x: 320, y: 408 }
    };

    this.drawTileRect(176, 90, 288, 64, "stone-a", DEPTH_INTERIOR_RUG + 1);
    this.addFurniture("desk", 256, 160);
    this.addFurniture("terminal", 380, 160);
    this.addFurniture("chart", 228, 252);
    this.addFurniture("board", 408, 250);
    this.addFurniture("plant", 126, 150);
    this.addFurniture("plant", 514, 150);
    this.addDoor(320, 344);

    this.addObstacle(236, 140, 44, 24);
    this.addObstacle(360, 140, 44, 24);
    this.addObstacle(208, 236, 40, 24);
    this.addObstacle(388, 236, 40, 24);

    this.addInteraction({
      id: "strategy-terminal",
      kind: "inspect",
      kindLabel: "Terminal",
      section: "Boston Consulting Group",
      dialogue:
        "This terminal opens the workflow layer: useful tools, adoption-minded design, and no tolerance for AI theater.",
      itemId: "bcg",
      x: 358,
      y: 138,
      width: 48,
      height: 36,
      actionX: 380,
      actionY: 188
    });
    this.addInteraction({
      id: "strategy-board",
      kind: "inspect",
      kindLabel: "Board",
      section: "Boston Consulting Group",
      dialogue:
        "The board holds the line that matters here: projected efficiency gains, executive buy-in, and actual users.",
      itemId: "bcg",
      x: 384,
      y: 228,
      width: 48,
      height: 40,
      actionX: 408,
      actionY: 286
    });
    this.addExitInteraction(320, 344, "overworld", "strategy-door");
  }

  buildRoboticsRoom() {
    this.buildInteriorBase("Robotics Lab", "Benches, bots, and the trophy cabinet that started all of this.", {
      width: 640,
      height: 448,
      wall: "wall-green",
      floor: "floor-b",
      carpet: "stone-b"
    });

    this.areaSpawns = {
      default: { x: 320, y: 408 },
      door: { x: 320, y: 408 }
    };

    this.drawTileRect(144, 104, 336, 48, "stone-b", DEPTH_INTERIOR_RUG + 1);
    this.addFurniture("robot", 226, 168);
    this.addFurniture("desk", 394, 168);
    this.addFurniture("trophy", 230, 252);
    this.addFurniture("frame", 410, 252);
    this.addFurniture("books", 540, 148);
    this.addDoor(320, 344);

    this.addObstacle(210, 150, 36, 26);
    this.addObstacle(378, 150, 36, 26);
    this.addObstacle(214, 236, 32, 24);
    this.addObstacle(394, 236, 32, 24);

    this.addInteraction({
      id: "robot-bench",
      kind: "inspect",
      kindLabel: "Workbench",
      section: "Robotics Systems",
      dialogue:
        "The workbench is where the long arc begins: curriculum, prototypes, competitions, and teaching other people how to build.",
      itemId: "robotics",
      x: 206,
      y: 148,
      width: 44,
      height: 34,
      actionX: 226,
      actionY: 198
    });
    this.addInteraction({
      id: "robot-trophy",
      kind: "inspect",
      kindLabel: "Trophy",
      section: "Robotics Systems",
      dialogue:
        "This case is for the state titles, the world run, and the proof that the obsession was productive.",
      itemId: "robotics",
      x: 212,
      y: 232,
      width: 38,
      height: 34,
      actionX: 230,
      actionY: 286
    });
    this.addExitInteraction(320, 344, "overworld", "robotics-door");
  }

  buildIncubatorRoom() {
    this.buildInteriorBase("Incubator / Hacker House", "Whiteboards, demo machines, and the 1 AM half of the portfolio.", {
      width: 640,
      height: 448,
      wall: "wall-red",
      floor: "wood-a",
      carpet: "stone-a"
    });

    this.areaSpawns = {
      default: { x: 320, y: 408 },
      door: { x: 320, y: 408 }
    };

    this.drawTileRect(178, 98, 284, 50, "stone-a", DEPTH_INTERIOR_RUG + 1);
    this.addFurniture("terminal", 208, 176);
    this.addFurniture("board", 398, 174);
    this.addFurniture("chart", 236, 258);
    this.addFurniture("desk", 410, 258);
    this.addFurniture("books", 536, 152);
    this.addDoor(320, 344);

    this.addObstacle(190, 158, 38, 26);
    this.addObstacle(380, 156, 38, 26);
    this.addObstacle(220, 240, 34, 24);
    this.addObstacle(394, 240, 34, 24);

    this.addInteraction({
      id: "incubator-terminal",
      kind: "inspect",
      kindLabel: "Build Station",
      section: "P-AI + Sparkathon",
      dialogue:
        "This station is for the shipping instinct: prototype fast, lead clearly, and make the strategy legible inside the product.",
      itemId: "incubator",
      x: 190,
      y: 156,
      width: 40,
      height: 34,
      actionX: 208,
      actionY: 204
    });
    this.addInteraction({
      id: "incubator-board",
      kind: "inspect",
      kindLabel: "Whiteboard",
      section: "P-AI + Sparkathon",
      dialogue:
        "The whiteboard is the bridge between startup energy and consulting discipline: hypotheses, tasks, and a working demo by morning.",
      itemId: "incubator",
      x: 378,
      y: 154,
      width: 42,
      height: 34,
      actionX: 398,
      actionY: 204
    });
    this.addExitInteraction(320, 344, "overworld", "incubator-door");
  }

  buildTrophyRoom() {
    this.buildInteriorBase("Trophy Hall", "A denser room for the specific-human layer: trophies, photos, chess, and odds boards.", {
      width: 640,
      height: 448,
      wall: "wall-gold",
      floor: "wood-b",
      carpet: "stone-b"
    });

    this.areaSpawns = {
      default: { x: 320, y: 408 },
      door: { x: 320, y: 408 }
    };

    this.drawTileRect(176, 96, 288, 52, "stone-b", DEPTH_INTERIOR_RUG + 1);
    this.addFurniture("trophy", 208, 172);
    this.addFurniture("frame", 398, 172);
    this.addFurniture("chess", 236, 256);
    this.addFurniture("chart", 410, 256);
    this.addFurniture("plant", 122, 152);
    this.addFurniture("plant", 514, 152);
    this.addDoor(320, 344);

    this.addObstacle(192, 154, 36, 24);
    this.addObstacle(382, 154, 36, 24);
    this.addObstacle(218, 238, 34, 24);
    this.addObstacle(392, 238, 34, 24);

    this.addInteraction({
      id: "trophy-case",
      kind: "inspect",
      kindLabel: "Case",
      section: "Artifacts + Personal Signals",
      dialogue:
        "This case is where the non-corporate signals live: robotics medals, scouting, and the things people actually remember.",
      itemId: "trophy-hall",
      x: 192,
      y: 152,
      width: 36,
      height: 34,
      actionX: 208,
      actionY: 202
    });
    this.addInteraction({
      id: "chess-table",
      kind: "inspect",
      kindLabel: "Table",
      section: "Artifacts + Personal Signals",
      dialogue:
        "The chessboard and odds chart are here on purpose: pattern recognition, risk, and a little competitive weirdness.",
      itemId: "trophy-hall",
      x: 218,
      y: 238,
      width: 38,
      height: 34,
      actionX: 236,
      actionY: 292
    });
    this.addExitInteraction(320, 344, "overworld", "trophy-door");
  }

  buildInteriorBase(label, hint, theme) {
    this.areaWidth = theme.width;
    this.areaHeight = theme.height;
    this.areaLabel = label;
    this.areaHint = hint;

    for (let y = 0; y < this.areaHeight; y += 16) {
      for (let x = 0; x < this.areaWidth; x += 16) {
        const floor = (x + y) % 32 === 0 ? theme.floor : theme.floor === "floor-a" ? "floor-b" : theme.floor;
        this.rendered.push(this.add.image(x + 8, y + 8, floor).setDepth(DEPTH_FLOOR));
      }
    }

    this.drawInteriorShell();
    this.drawTileRect(0, this.areaHeight - 44, this.areaWidth, 44, theme.wall, DEPTH_INTERIOR_WALL - 1);
    this.drawTileRect(208, 314, 224, 46, theme.carpet, DEPTH_INTERIOR_RUG);
    this.addSign(label.toUpperCase(), this.areaWidth / 2, 38);

    this.addObstacle(0, 0, this.areaWidth, 62);
    this.addObstacle(0, 0, 62, this.areaHeight);
    this.addObstacle(this.areaWidth - 62, 0, 62, this.areaHeight);
  }

  drawInteriorShell() {
    const w = this.areaWidth;
    const h = this.areaHeight;
    const wallTop = darkenHex(0xd8d2c4, 40);
    const wallMid = darkenHex(0xece4d4, 10);
    const wainscot = darkenHex(0xc8c0b0, 20);
    const trim = 0x2a2420;
    const side = darkenHex(wallMid, 55);

    const gfx = this.add.graphics();
    gfx.fillStyle(side, 1);
    gfx.fillTriangle(0, 72, 0, h, 118, h);
    gfx.fillTriangle(w, 72, w, h, w - 118, h);
    gfx.fillStyle(wallTop, 1);
    gfx.fillRect(0, 0, w, 28);
    gfx.fillStyle(wallMid, 1);
    gfx.fillRect(0, 28, w, 26);
    gfx.fillStyle(wainscot, 1);
    gfx.fillRect(0, 54, w, 18);
    gfx.lineStyle(3, trim, 1);
    gfx.lineBetween(0, 72, w, 72);
    gfx.lineStyle(2, trim, 0.65);
    gfx.lineBetween(118, h, 118, 72);
    gfx.lineBetween(w - 118, h, w - 118, 72);
    gfx.fillStyle(0x000000, 0.12);
    gfx.fillRect(0, 60, w, 14);
    gfx.setDepth(DEPTH_INTERIOR_WALL);
    this.rendered.push(gfx);
  }

  placeBuilding(texture, x, y) {
    const foot = y + 52;
    const img = this.add.image(x, y, texture);
    img.setDepth(this.depthFromFoot(foot));
    this.rendered.push(img);
    const doorFoot = y + 48;
    const door = this.add.image(x, y + 36, "door");
    door.setDepth(this.depthFromFoot(doorFoot));
    this.rendered.push(door);
  }

  addFurniture(texture, x, y) {
    const foot = y + 12;
    const piece = this.add.image(x, y, texture);
    piece.setDepth(this.depthFromFoot(foot));
    this.rendered.push(piece);
    const sh = this.add.image(x, foot - 2, "ground-shadow");
    sh.setScale(0.85, 0.55);
    sh.setAlpha(0.35);
    sh.setDepth(this.depthFromFoot(foot) - 1);
    this.rendered.push(sh);
  }

  addDoor(x, y) {
    const foot = y + 14;
    const door = this.add.image(x, y, "door");
    door.setDepth(this.depthFromFoot(foot));
    this.rendered.push(door);
  }

  addObject(texture, x, y, label = null) {
    const foot = y + 12;
    const obj = this.add.image(x, y, texture);
    obj.setDepth(this.depthFromFoot(foot));
    this.rendered.push(obj);
    const sh = this.add.image(x, foot - 2, "ground-shadow");
    sh.setScale(0.75, 0.5);
    sh.setAlpha(0.32);
    sh.setDepth(this.depthFromFoot(foot) - 1);
    this.rendered.push(sh);
    if (label) this.addTinyLabel(label, x, y + 26);
  }

  addSign(text, x, y) {
    const sign = this.add.text(x, y, text, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "7px",
      color: "#102018",
      backgroundColor: "#f7f2dc",
      padding: { x: 6, y: 5 }
    });
    sign.setOrigin(0.5).setDepth(this.depthFromFoot(y + 6)).setResolution(1).setLineSpacing(4);
    this.rendered.push(sign);
  }

  addTinyLabel(text, x, y) {
    const label = this.add.text(x, y, text, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "6px",
      color: "#0f1c16",
      backgroundColor: "#fff7e4",
      padding: { x: 4, y: 3 }
    });
    label.setOrigin(0.5).setDepth(this.depthFromFoot(y + 4)).setResolution(1);
    this.rendered.push(label);
  }

  addObstacle(x, y, width, height) {
    const wall = this.add.zone(x + width / 2, y + height / 2, width, height).setOrigin(0.5);
    this.physics.add.existing(wall, true);
    this.physics.add.collider(this.player, wall);
    this.obstacles.push(wall);
  }

  addInteraction(config) {
    const rect = new Phaser.Geom.Rectangle(config.x, config.y, config.width, config.height);
    const zone = this.add.zone(
      config.x + config.width / 2,
      config.y + config.height / 2,
      config.width,
      config.height
    ).setInteractive({ useHandCursor: true });

    zone.on("pointerdown", () => this.queueInteraction(config));

    this.interactions.push({ ...config, rect, zone });
  }

  addExitInteraction(x, y, targetArea, targetSpawn) {
    this.addInteraction({
      id: `${targetArea}-${targetSpawn}-exit`,
      kind: "exit",
      kindLabel: "Exit",
      section: "Door",
      dialogue: "Step back outside.",
      x: x - 20,
      y: y - 32,
      width: 40,
      height: 26,
      actionX: x,
      actionY: y - 18,
      targetArea,
      targetSpawn
    });
  }

  queueInteraction(interaction) {
    this.pendingInteraction = interaction;
    this.target = { x: interaction.actionX, y: interaction.actionY };
  }

  triggerInteraction(interaction) {
    if (interaction.kind === "enter" || interaction.kind === "exit") {
      this.closeDialogue();
      this.switchArea(interaction.targetArea, interaction.targetSpawn);
      return;
    }

    if (interaction.kind === "inspect") {
      window.dispatchEvent(
        new CustomEvent("jungle:dialogue", {
          detail: {
            section: interaction.section,
            dialogue: interaction.dialogue,
            kindLabel: interaction.kindLabel,
            itemId: interaction.itemId
          }
        })
      );
    }
  }

  closeDialogue() {
    window.dispatchEvent(new CustomEvent("jungle:close-dialogue"));
  }

  findNearbyInteraction() {
    const reach = (i) => (i.kind === "enter" || i.kind === "exit" ? 56 : 48);
    const candidates = this.interactions.filter((interaction) => {
      return (
        Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          interaction.actionX,
          interaction.actionY
        ) < reach(interaction)
      );
    });

    if (!candidates.length) return null;

    return candidates.sort((a, b) => {
      const da = Phaser.Math.Distance.Between(this.player.x, this.player.y, a.actionX, a.actionY);
      const db = Phaser.Math.Distance.Between(this.player.x, this.player.y, b.actionX, b.actionY);
      return da - db;
    })[0];
  }

  drawTileRect(x, y, width, height, key, depth = DEPTH_FLOOR) {
    for (let yy = y; yy < y + height; yy += 16) {
      for (let xx = x; xx < x + width; xx += 16) {
        this.rendered.push(this.add.image(xx + 8, yy + 8, key).setDepth(depth));
      }
    }
  }

  updateDoorOverlap() {
    if (this.time.now < this._doorCooldownUntil) return;
    let insideId = null;
    for (const interaction of this.interactions) {
      if (interaction.kind !== "enter" && interaction.kind !== "exit") continue;
      if (Phaser.Geom.Rectangle.Contains(interaction.rect, this.player.x, this.player.y)) {
        insideId = interaction.id;
        break;
      }
    }
    if (insideId && this._lastDoorOverlapId !== insideId) {
      this._lastDoorOverlapId = insideId;
      const hit = this.interactions.find((i) => i.id === insideId);
      if (hit) this.triggerInteraction(hit);
    } else if (!insideId) {
      this._lastDoorOverlapId = null;
    }
  }

  update() {
    const speed = 112;
    const body = this.player.body;
    let vx = 0;
    let vy = 0;

    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up = this.cursors.up.isDown || this.keys.W.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;

    if (left) vx -= speed;
    if (right) vx += speed;
    if (up) vy -= speed;
    if (down) vy += speed;

    if (vx || vy) {
      if (!this._moveActive) {
        this.closeDialogue();
        this._moveActive = true;
      }
      this.target = null;
      this.pendingInteraction = null;
    } else if (this.target) {
      const dx = this.target.x - this.player.x;
      const dy = this.target.y - this.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 4) {
        this.target = null;
        if (this.pendingInteraction) {
          const interaction = this.pendingInteraction;
          this.pendingInteraction = null;
          this.triggerInteraction(interaction);
        }
        this._moveActive = false;
      } else {
        if (!this._moveActive) {
          this.closeDialogue();
          this._moveActive = true;
        }
        vx = (dx / dist) * speed;
        vy = (dy / dist) * speed;
      }
    } else {
      this._moveActive = false;
    }

    body.setVelocity(vx, vy);
    if (vx || vy) body.velocity.normalize().scale(speed);

    this.syncPlayerStack();
    this.updateDoorOverlap();

    const nearby = this.findNearbyInteraction();
    if (nearby && Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) this.triggerInteraction(nearby);
    if (nearby && Phaser.Input.Keyboard.JustDown(this.keys.ENTER)) this.triggerInteraction(nearby);

    if (Phaser.Input.Keyboard.JustDown(this.keys.ONE)) this.switchArea("overworld", "strategy-door");
    if (Phaser.Input.Keyboard.JustDown(this.keys.TWO)) this.switchArea("overworld", "robotics-door");
    if (Phaser.Input.Keyboard.JustDown(this.keys.THREE)) this.switchArea("overworld", "incubator-door");
    if (Phaser.Input.Keyboard.JustDown(this.keys.FOUR)) this.switchArea("overworld", "trophy-door");
  }
}
