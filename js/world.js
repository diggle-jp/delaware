import Controller from './controller.js';

const $ = (...args) => document.querySelector(...args);

const SLOW_DEBUG = false;
const WORLD_WIDTH = 100;
const WORLD_HEIGHT = 100;

const rAF = (() => {
  if (SLOW_DEBUG) return (f) => setTimeout(f, 1000);
  return window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.requestAnimationFrame;
})()

const image = (url) => {
  const img = new Image();
  img.src = url;
  return img;
}

const findGamepad = () => {
  var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
  if (gamepads.length > 0) {
    return gamepads[0];
  }
  return null;
}

// UTIL

const groupBy = (list, f) => {
  const map = new Map();
  for (let el of list) {
    const v = f(el);
    let listOrNone = map.get(v);
    if (!listOrNone) {
      listOrNone = [];
      map.set(v. listOrNone);
    }
    listOrNone.push(el);
  }
  return map;
}

const mapToEntryArray = (map) => {
  const arr = [];
  for (let kv of map.entries()) arr.push(kv);
  return arr
}

const LAYER_PLAYER = 1;
const LAYER_SHOT = 2;
const LAYER_ENEMY = 3;

class AbstrElement {
  static layer = 9;
  static metadata = {};

  constructor(world) {
    this.world = world;
  }

  act() {
    // impl
  }

  render(ctx) {
    // impl
  }

  remove() {
    this.world.removeElement(this);
  }

  dist(other) {
    return Math.sqrt((other.x - this.x) ** 2 + (other.y - this.y) ** 2);
  }

  get layer() {
    return this.constructor.layer;
  }

  get metadata() {
    return this.constructor.metadata;
  }
}

class Exsol extends AbstrElement {
  static layer = LAYER_ENEMY;
  static metadata = {
    isEnemy: true,
  };
  static image = image('./imgs/exsol.png');

  constructor(fx, fy, ...args) {
    super(...args);
    this.x = fx(0);
    this.y = fy(0);
    this.fx = fx;
    this.fy = fy;
    this.t = 0;
    this.shot = false;
  }

  setShot() {
    this.shot = true;
  }

  act() {
    if (this.shot) {
      this.remove();
      this.world.numRemovedExsols++;
    }
    this.t++;
    this.x = this.fx(this.t);
    this.y = this.fy(this.t);
    if (this.world.isPlaying) {
      if (this.dist(this.world.player) < 4) {
        this.world.endPlay();
      }
    }
    if (this.x < - 10 * WORLD_WIDTH
        || 12 * WORLD_WIDTH < this.x
        || this.y < - 10 * WORLD_HEIGHT
        || 12 * WORLD_HEIGHT < this.y) {
      this.remove();
    }
  }

  render(ctx) {
    ctx.translate(this.x, this.y);
    ctx.rotate(this.t / 13);
    ctx.drawImage(this.constructor.image, -2, -2, 4, 4);
  }
}

class Shot extends AbstrElement {
  static layer = LAYER_SHOT;

  constructor(x, y, vx, vy, ...args) {
    super(...args);
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
  }

  act() {
    this.x += this.vx * 5;
    this.y += this.vy * 5;
    for (let el of this.world.elements) {
      if (el.metadata.isEnemy) {
        if (el.dist(this) < 5) {
          el.setShot();
        }
      }
    }
    if (this.x < -WORLD_WIDTH
        || 2 * WORLD_WIDTH < this.x
        || this.y < -WORLD_HEIGHT
        || 2 * WORLD_HEIGHT < this.y) {
      this.remove();
    }
  }

  render(ctx) {
    ctx.beginPath();
    ctx.fillStyle = 'black';
    ctx.arc(this.x, this.y, 1, 0, 2 * Math.PI);
    ctx.fill();
    ctx.closePath();
  }
}

class Player extends AbstrElement {
  static layer = LAYER_PLAYER;
  static image = image('./imgs/player.png');
  static metadata = { isPlayer: true };

  x = 50;
  y = 50;
  prevNormalVx = 1.0;
  prevNormalVy = 0.0;
  dead = false;

  act() {
    if (this.dead) {
      this.remove();
      return;
    }
    const vx = this.world.controller.xAxis();
    const vy = this.world.controller.yAxis();
    const v = Math.sqrt(vx ** 2 + vy ** 2);
    this.x += vx * 1.2;
    this.x = Math.max(3, Math.min(this.x, WORLD_WIDTH - 3));
    this.y = Math.max(3, Math.min(this.y, WORLD_HEIGHT - 3));
    this.y += vy * 1.2;
    const shoot = this.world.controller.shootBtnPressed();
    if (shoot) {
      let shotVx, shotVy;
      if (v < 0.01) {
        shotVx = this.prevNormalVx;
        shotVy = this.prevNormalVy;
      } else {
        shotVx = vx / v;
        shotVy = vy / v;
      }
      this.world.addElement(new Shot(this.x, this.y, shotVx, shotVy, this.world));
    }
    if (v > 0.01) {
      this.prevNormalVx = vx / v;
      this.prevNormalVy = vy / v;
    }
    this.prevShootBtnPressed = shoot;
  }

  kill() {
    this.dead = true;
  }

  render(ctx) {
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.atan2(this.prevNormalVy, this.prevNormalVx));
    ctx.drawImage(this.constructor.image, -3, -3, 6, 6);
  }
}

class Text extends AbstrElement {
  text = '';
  scoreText = '';

  constructor(x, y, ...args) {
    super(...args);
    this.x = x;
    this.y = y;
  }

  setText(text) {
    this.text = text;
  }

  setScoreText(scoreText) {
    this.scoreText = scoreText;
  }

  render(ctx) {
    ctx.textAlign = 'center';
    ctx.font = '8px Arial';
    ctx.fillText(this.text, 50, 50);
    ctx.font = '3px Arial';
    ctx.fillText(this.scoreText, 50, 60);
  }
}

const PHASE_ENDED = 0;
const PHASE_PLAYING = 1;
const SERIES = 60 * 15;

export default class World {
  #time = 0;
  #canvas = null;

  constructor() {
    this.#canvas = $('#wrapper canvas');
    this.controller = new Controller();
    this.elements = new Set();
    this.text = new Text();
    this.text.setText('Press A to start');
    this.text.setScoreText('');
    this.addElement(this.text);
    this.playTime = 0;
    this.phase = PHASE_ENDED;
    this.numRemovedExsols = 0;
  }

  addElement(el) {
    this.elements.add(el);
    this._elementsByLayer = null;
  }

  removeElement(el) {
    this.elements.delete(el);
    this._elementsByLayer = null;
  }

  // layer descending order
  get elementsByLayer() {
    return this._elementsByLayer ||= (() => {
      const elementsByLayer = _.groupBy(Array.from(this.elements), (el) => el.layer);
      const layers = _.keys(elementsByLayer);
      return _.sortBy(layers, (strKey) => -parseInt(strKey, 10)).map(key => [key, elementsByLayer[key]]);
    })();
  }

  start() {
    rAF(() => { this.#frame(); });
  }

  #frame() {
    this.#act();
    this.#render();
    this.#time++;
    rAF(() => { this.#frame(); });
  }

  get isPlaying() {
    return this.phase === PHASE_PLAYING;
  }

  endPlay() {
    this.player.kill();
    this.phase = PHASE_ENDED;
    this.text.setText('Press A to start');
    const seriesChar = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'Public'][Math.max(Math.floor(this.playTime / (SERIES * 2)), 7)];
    this.text.setScoreText(`\nYou removed ${this.numRemovedExsols} Exsols! (Series ${seriesChar})`);
  }

  #act() {
    this.controller.scan();
    if (this.phase === PHASE_ENDED && this.controller.shootBtnPressed()) {
      this.#startPlay();
    } else if (this.phase === PHASE_PLAYING) {
      this.playTime++;
      this.genEnemy();
    }
    for (let element of this.elements) {
      element.act();
    }
  }

  genEnemy() {
    if (this.playTime <= SERIES) {
      this.genEnemyPattern1(40, 1, 0.5);
    } else if (this.playTime <= 2 * SERIES) {
      this.genEnemyPattern1(35, 2, 0.6);
    } else if (this.playTime <= 3 * SERIES) {
      this.genEnemyPattern1(30, 3, 0.8);
    } else if (this.playTime <= 4 * SERIES) {
      this.genEnemyPattern1(20, 3, 1.0);
    } else if (this.playTime <= 5 * SERIES) {
      this.genEnemyPattern1(20, 3, 1.3);
    } else if (this.playTime <= 6 * SERIES) {
      this.genEnemyPattern1(20, 4, 1.5);
    } else if (this.playTime <= 7 * SERIES) {
      this.genEnemyPattern1(15, 4, 1.5);
    } else if (this.playTime <= 8 * SERIES) {
      this.genEnemyPattern1(15, 4, 1.7);
    } else if (this.playTime <= 9 * SERIES) {
      this.genEnemyPattern1(15, 4, 2.0);
    } else if (this.playTime <= 10 * SERIES) {
      this.genEnemyPattern1(10, 5, 2.0);
    }
  }

  genEnemyPattern1(period, times, velocity) {
    if (this.playTime % period === 0) {
      for (let i = 0; i < times; i++) {
        const r0 = Math.random() * 100;
        const r1 = Math.random() * 100;
        const t0 = Math.random() * 100;
        const r0x = 50 + 30 * Math.cos(r0);
        const r0y = 50 + 30 * Math.sin(r0);
        const r1x = Math.cos(r1);
        const r1y = Math.sin(r1);
        this.addElement(
          new Exsol(
            (t) => r0x + r1x * (t - 180) * velocity + 10 * Math.cos((t + t0) / 60),
            (t) => r0y + r1y * (t - 180) * velocity + 10 * Math.sin((t + t0) / 60),
            this
          )
        );
      }
    }
  }

  #startPlay() {
    this.phase = PHASE_PLAYING;
    this.player = new Player(this)
    this.text.setText('');
    this.text.setScoreText('');
    this.playTime = 0;
    this.numRemovedExsols = 0;
    this.addElement(this.player);
    for (let el of this.elements) {
      if (el.metadata.isEnemy) this.removeElement(el);
    }
  }

  #render() {
    const ctx = this.#canvas.getContext('2d');
    ctx.resetTransform();
    ctx.scale(12, 12);
    ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.#renderElements(ctx);
  }

  #renderElements(ctx) {
    for (let [layer, elements] of this.elementsByLayer) {
      for (let element of elements) {
        ctx.save();
        element.render(ctx);
        ctx.restore();
      }
    }
  }
}
