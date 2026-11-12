import * as pc from 'playcanvas';
import './style.css';

const canvas = document.getElementById('application');
const speedLabel = document.getElementById('speed');

const device = await pc.createGraphicsDevice(canvas, {
  deviceTypes: [pc.DEVICETYPE_WEBGL2]
});

const options = new pc.AppOptions();
options.graphicsDevice = device;
options.componentSystems = [
  pc.RenderComponentSystem,
  pc.CameraComponentSystem,
  pc.LightComponentSystem
];
options.resourceHandlers = [pc.TextureHandler, pc.ContainerHandler];

const app = new pc.AppBase(canvas);
app.init(options);
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.scene.ambientLight = new pc.Color(0.42, 0.43, 0.45);
app.start();

window.addEventListener('resize', () => app.resizeCanvas());

function material(color, metalness = 0, roughness = 0.85) {
  const m = new pc.StandardMaterial();
  m.diffuse = new pc.Color(...color);
  m.metalness = metalness;
  m.shininess = (1 - roughness) * 80;
  m.update();
  return m;
}

function box(name, position, scale, mat) {
  const e = new pc.Entity(name);
  e.addComponent('render', { type: 'box', material: mat });
  e.setLocalPosition(...position);
  e.setLocalScale(...scale);
  app.root.addChild(e);
  return e;
}

// Camera and daylight.
const camera = new pc.Entity('chase-camera');
camera.addComponent('camera', {
  clearColor: new pc.Color(0.49, 0.72, 0.88),
  fov: 62,
  farClip: 500
});
camera.setPosition(0, 7, 13);
camera.lookAt(0, 0, 0);
app.root.addChild(camera);

const sun = new pc.Entity('sun');
sun.addComponent('light', {
  type: 'directional',
  color: new pc.Color(1, 0.91, 0.78),
  intensity: 1.25
});
sun.setEulerAngles(48, 28, 0);
app.root.addChild(sun);

// Starter street: asphalt, shoulders, lane markings and simple shop blocks.
const asphalt = material([0.12, 0.14, 0.15]);
const concrete = material([0.48, 0.47, 0.42]);
const lanePaint = material([0.92, 0.83, 0.55]);
const shopMats = [
  material([0.68, 0.49, 0.31]),
  material([0.56, 0.62, 0.58]),
  material([0.70, 0.66, 0.52]),
  material([0.43, 0.53, 0.60])
];
box('ground', [0, -0.35, -18], [42, 0.5, 150], material([0.24, 0.34, 0.24]));
box('road', [0, -0.07, -18], [11, 0.16, 150], asphalt);
box('left-shoulder', [-6.1, 0.02, -18], [1.1, 0.2, 150], concrete);
box('right-shoulder', [6.1, 0.02, -18], [1.1, 0.2, 150], concrete);
for (let z = -86; z < 54; z += 9) box('lane-dash', [0, 0.025, z], [0.14, 0.025, 3.8], lanePaint);

for (let i = 0; i < 16; i++) {
  const z = -82 + i * 9.5;
  const h1 = 4 + (i % 3) * 1.3;
  const h2 = 4.5 + ((i + 1) % 3) * 1.1;
  box('street-shop-left', [-9.2, h1 / 2, z], [5.2, h1, 6.8], shopMats[i % shopMats.length]);
  box('street-shop-right', [9.2, h2 / 2, z - 2], [5.2, h2, 6.8], shopMats[(i + 2) % shopMats.length]);
}

// A simple stylized car assembled from engine primitives.
const car = new pc.Entity('player-car');
app.root.addChild(car);
const carPaint = material([0.72, 0.12, 0.08], 0.15, 0.35);
const glass = material([0.10, 0.20, 0.24], 0.05, 0.25);
const rubber = material([0.025, 0.028, 0.03]);
const chassis = new pc.Entity('car-body');
chassis.addComponent('render', { type: 'box', material: carPaint });
chassis.setLocalScale(1.8, 0.62, 3.6);
chassis.setLocalPosition(0, 0.65, 0);
car.addChild(chassis);
const cabin = new pc.Entity('car-cabin');
cabin.addComponent('render', { type: 'box', material: glass });
cabin.setLocalScale(1.42, 0.72, 1.75);
cabin.setLocalPosition(0, 1.28, -0.25);
car.addChild(cabin);
for (const x of [-0.94, 0.94]) {
  for (const z of [-1.12, 1.12]) {
    const wheel = new pc.Entity('wheel');
    wheel.addComponent('render', { type: 'cylinder', material: rubber });
    wheel.setLocalScale(0.42, 0.22, 0.42);
    wheel.setLocalEulerAngles(0, 0, 90);
    wheel.setLocalPosition(x, 0.42, z);
    car.addChild(wheel);
  }
}
car.setPosition(0, 0, 8);

// Keyboard + hold-to-drive touch controls.
const keys = {};
window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
const held = { left: false, right: false, accelerate: false, brake: false };
document.querySelectorAll('[data-control]').forEach(button => {
  const key = button.dataset.control;
  const down = e => { e.preventDefault(); held[key] = true; };
  const up = e => { e.preventDefault(); held[key] = false; };
  button.addEventListener('pointerdown', down);
  button.addEventListener('pointerup', up);
  button.addEventListener('pointercancel', up);
  button.addEventListener('pointerleave', up);
});

let speed = 0;
let heading = 0;
const maxSpeed = 24;
app.on('update', dt => {
  const accelerate = held.accelerate || keys.w || keys.arrowup;
  const brake = held.brake || keys.s || keys.arrowdown;
  const left = held.left || keys.a || keys.arrowleft;
  const right = held.right || keys.d || keys.arrowright;

  if (accelerate) speed = Math.min(maxSpeed, speed + 13 * dt);
  else speed = Math.max(0, speed - 3.8 * dt);
  if (brake) speed = Math.max(0, speed - 22 * dt);

  const steer = (left ? 1 : 0) - (right ? 1 : 0);
  heading += steer * Math.min(1, speed / 7) * 72 * dt;

  car.setEulerAngles(0, heading, 0);
  const radians = heading * Math.PI / 180;
  const p = car.getPosition();
  car.setPosition(
    pc.math.clamp(p.x + Math.sin(radians) * speed * dt, -4.1, 4.1),
    0,
    p.z - Math.cos(radians) * speed * dt
  );

  // Keep the starter road under the player and the chase camera behind.
  if (p.z < -38) car.setPosition(p.x, 0, 8);
  const target = car.getPosition();
  const camPos = new pc.Vec3(target.x + Math.sin(radians) * 2.2, 6.2, target.z + 11);
  camera.setPosition(camera.getPosition().lerp(camPos, Math.min(1, dt * 4)));
  camera.lookAt(target.x, 0.8, target.z - 2);
  speedLabel.textContent = `${Math.round(speed * 3.6)} km/h`;
});
