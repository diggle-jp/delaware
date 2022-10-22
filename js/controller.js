class KeyboardController {
  constructor() {
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    document.addEventListener('keyup', (e) => this.onKeyUp(e));
    this.L = false;
    this.R = false;
    this.U = false;
    this.D = false;
    this.Sp = false;
  }

  onKeyDown(e) {
    this.setByKeyCode(e.code, true);
  }

  onKeyUp(e) {
    this.setByKeyCode(e.code, false);
  }

  setByKeyCode(code, flag) {
    console.log(code);
    switch (code) {
      case 'ArrowLeft':
        this.L = flag;
        break;
      case 'ArrowRight':
        this.R = flag;
        break;
      case 'ArrowUp':
        this.U = flag;
        break;
      case 'ArrowDown':
        this.D = flag;
        break;
      case 'Space':
        this.Sp = flag;
        break;
    }
  }

  xAxis() {
    return (this.L ? -1.0 : 0.0) + (this.R ? 1.0 : 0.0);
  }

  yAxis() {
    return (this.U ? -1.0 : 0.0) + (this.D ? 1.0 : 0.0);
  }

  shootBtnPressed() {
    return this.Sp;
  }
}

export default class Controller {
  constructor() {
    this.kbController = new KeyboardController();
    this.connected = false;
    this.gamepad = null;
    window.addEventListener("gamepadconnected", this.connect.bind(this));
    window.addEventListener("gamepaddisconnected", this.disconnect.bind(this));
  }

  scan() {
    if (this.connected) {
      this.gamepad = navigator.getGamepads()[this.gamepad.index];
    }
  }

  xAxis() {
    if (!this.connected) return this.kbController.xAxis();
    return this.gamepad.axes[0];
  }

  yAxis() {
    if (!this.connected) return this.kbController.yAxis();
    return this.gamepad.axes[1];
  }

  shootBtnPressed() {
    if (!this.connected) return this.kbController.shootBtnPressed();
    return this.gamepad.buttons[0].pressed;
  }

  connect(e) {
    this.gamepad = e.gamepad;
    this.connected = true;
  }

  disconnect() {
    this.connected = false;
    this.gamepad = null;
  }
}
