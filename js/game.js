import World from './world.js';

// bootstrap
const world = new World();
world.start();
window.world = world; // for debug
