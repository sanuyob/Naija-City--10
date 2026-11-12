import * as pc from 'playcanvas';
import './style.css';

const canvas = document.getElementById('application');
const speedLabel = document.getElementById('speed');
const statusLabel = document.getElementById('status');

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Missing #application canvas');
}

function showStatus(message) {
  if (statusLabel) statusLabel.textContent = message;
}

async function startGame() {
  showStatus('Starting 3D engine…');

  // WebGL 2 is the compatibility-first target for this mobile prototype.
  const device = await pc.createGraphicsDevice(canvas, {
    deviceTypes: [pc.DEVICETYPE_WEBGL2]
  });
  device.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);

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

  window.addEventListener('resize', () => app.resizeCanvas());
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    showStatus('Graphics context lost. Reload this page to try again.');
  });

  function material(color, roughness = 0.85) {
    const result = new pc.StandardMaterial();
    result.diffuse = new pc.Color(...color);
    result.shininess = (1 - roughness) * 80;
    result.update();
    return result;
  }

  function box(name, position, scale, mat) {
    const entity = new pc.Entity(name);
    entity.addComponent('render', { type: 'box', material: mat });
    entity.setLocalPosition(...position);
    entity.setLocalScale(...scale);
    app.root.addChild(entity);
    return entity;
  }

  // Camera and daylight.
  const camera = new pc.Entity('chase-camera');
  camera.addComponent('camera', {
    clearColor: new pc.Color(0.49, 0.72, 0.88),
    fov: 62,
    farClip: 250
  });
  camera.setPosition(0, 7, 13);
  camera.lookAt(0, 0, 0);
  app.root.addChild(camera);

  const sun = new pc.Entity('sun');
  sun.addComponent('light', {
    type: 'directional',
    color: new pc.Color(1, 0.91, 0.78),
    intensity: 1.1
  });
  sun.setEulerAngles(48, 28, 0);
  app.root.addChild(sun);

  // Compact Lagos-inspired street blockout.
  const asphalt = material([0.12, 0.14, 0.15]);
  const concrete = material([0.48, 0.47, 0.42]);
  const lanePaint = material([0.92, 0.83, 0.55]);
  const groundMat = material([0.24, 0.34, 0.24]);
  const shopMats = [
    material([0.68, 0.49, 0.31]),
    material([0.56, 0.62, 0.58]),
    material([0.70, 0.66, 0.52]),
    material([0.43, 0.53, 0.60])
  ];

  box('ground', [0, -0.35, -18], [42, 0.5, 150], groundMat);
  box('road', [0, -0.07, -18], [11, 0.16, 150], asphalt);
  box('left-shoulder', [-6.1, 0.02, -18], [1.1, 0.2, 150], concrete);
  box('right-shoulder', [6.1, 0.02, -18], [1.1, 0.2, 150], concrete);

  for (let z = -86; z < 54; z += 9) {
    box('lane-dash', [0, 0.025, z], [0.14, 0.025, 3.8], lanePaint);
  }

  for (let i = 0; i < 16; i += 1) {
    const z = -82 + i * 9.5;
    const leftHeight = 4 + (i % 3) * 1.3;
    const rightHeight = 4.5 + ((i + 1) % 3) * 1.1;
    box('street-shop-left', [-9.2, leftHeight / 2, z], [5.2, leftHeight, 6.8], shopMats[i % shopMats.length]);
    box('street-shop-right', [9.2, rightHeight / 2, z - 2], [5.2, rightHeight, 6.8], shopMats[(i + 2) % shopMats.length]);
  }

  // Primitive player car. Forward is the engine's negative Z direction.
  const car = new pc.Entity('player-car');
  app.root.addChild(car);
  const carPaint = material([0.72, 0.12, 0.08], 0.35);
  const glass = material([0.10, 0.20, 0.24], 0.25);
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

  // Keyboard and pointer controls. Pointer capture prevents stuck buttons
  // when a finger slides outside a control while it is held.
  const keys = Object.create(null);
  const held = { left: false, right: false, accelerate: false, brake: false };

  window.addEventListener('keydown', (event) => {
    keys[event.key.toLowerCase()] = true;
  });
  window.addEventListener('keyup', (event) => {
    keys[event.key.toLowerCase()] = false;
  });
  window.addEventListener('blur', () => {
    for (const key of Object.keys(held)) held[key] = false;
    for (const key of Object.keys(keys)) keys[key] = false;
  });

  document.querySelectorAll('[data-control]').forEach((button) => {
    const control = button.dataset.control;
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      held[control] = true;
    });
    const release = (event) => {
      event.preventDefault();
      held[control] = false;
    };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', () => { held[control] = false; });
  });

  let speed = 0;
  let heading = 0;
  const maxSpeed = 24;

  app.on('update', (dt) => {
    const accelerate = held.accelerate || keys.w || keys.arrowup;
    const brake = held.brake || keys.s || keys.arrowdown;
    const left = held.left || keys.a || keys.arrowleft;
    const right = held.right || keys.d || keys.arrowright;

    if (accelerate) speed = Math.min(maxSpeed, speed + 13 * dt);
    else speed = Math.max(0, speed - 3.8 * dt);
    if (brake) speed = Math.max(0, speed - 22 * dt);

    const steering = (left ? 1 : 0) - (right ? 1 : 0);
    heading += steering * Math.min(1, speed / 7) * 72 * dt;
    const radians = heading * Math.PI / 180;
    const position = car.getPosition();

    // Keep the vehicle inside the road corridor; this is a simple arcade
    // boundary, not rigid-body collision physics.
    const nextX = pc.math.clamp(position.x + Math.sin(radians) * speed * dt, -4.1, 4.1);
    let nextZ = position.z - Math.cos(radians) * speed * dt;
    if (nextZ < -38) nextZ = 8;
    car.setPosition(nextX, 0, nextZ);
    car.setEulerAngles(0, heading, 0);

    const target = car.getPosition();
    const desiredCameraPosition = new pc.Vec3(
      target.x + Math.sin(radians) * 2.2,
      6.2,
      target.z + 11
    );
    const smoothedCameraPosition = camera.getPosition().lerp(
      desiredCameraPosition,
      Math.min(1, dt * 4)
    );
    camera.setPosition(smoothedCameraPosition);
    camera.lookAt(target.x, 0.8, target.z - 2);
    speedLabel.textContent = `${Math.round(speed * 3.6)} km/h`;
  });

  app.start();
  showStatus('Ready — hold GO to drive');
}

startGame().catch((error) => {
  console.error('Naija City Drive failed to start:', error);
  showStatus(`Could not start the 3D scene: ${error.message}`);
});
