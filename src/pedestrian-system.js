import * as pc from "playcanvas";
import { createActorPhysics } from "./actor-physics.js";
import { BT, action, condition, createBehaviourTree, selector, sequence } from "./behavior-tree.js";
import { createCharacterPerception } from "./character-perception.js";
import { createNavigationGrid } from "./navigation-grid.js";

const DEFS = [
  ["Hero 01", -5.82, -9, [.13,.31,.48], [.34,.18,.1]],
  ["Commuter", 5.82, -12, [.62,.23,.16], [.43,.24,.14]],
  ["Vendor", -5.82, -17, [.15,.37,.23], [.29,.15,.08]],
  ["Office worker", 5.82, -20, [.35,.38,.4], [.37,.2,.11]],
  ["Shopper", -5.82, -25, [.55,.37,.12], [.42,.22,.13]],
  ["Courier", 5.82, -28, [.12,.4,.39], [.31,.16,.09]],
  ["Resident", -5.82, -33, [.43,.23,.34], [.36,.19,.1]],
  ["Mechanic", 5.82, -36, [.35,.27,.17], [.4,.21,.12]],
  ["Visitor", -5.82, -41, [.25,.3,.54], [.32,.17,.09]],
  ["Commuter", 5.82, -44, [.58,.28,.22], [.44,.24,.15]]
];

/** Ten sidewalk pedestrians; Hero 01 is a rigged, independently controlled city NPC. */
export function createPedestrianSystem({ app, physics, colliders = [], heroCharacter = null, occluders = colliders, navigationColliders = occluders } = {}) {
  if (!app) throw new Error("Pedestrians require app");
  const solver = physics || createActorPhysics({ colliders });
  const materials = new Map();
  const actors = [];
  const perception = createCharacterPerception({ occluders, viewDistance: 14, fieldOfView: 125, hearingDistance: 17, vehicleHearingDistance: 32 });
  const navigation = createNavigationGrid({ colliders: navigationColliders, cellSize: 1.35, agentHeight: 1.75, groundY: 0, minColliderHeight: .55 });
  const stats = { updates: 0, moved: 0, greetings: 0, routeChanges: 0, sightings: 0, heardEvents: 0, behaviourTicks: 0, pathRequests: 0 };

  const material = color => {
    const key = color.join(",");
    if (materials.has(key)) return materials.get(key);
    const mat = new pc.StandardMaterial();
    mat.diffuse = new pc.Color(...color);
    mat.update();
    materials.set(key, mat);
    return mat;
  };

  const part = (root, name, type, scale, position, mat) => {
    const entity = new pc.Entity(name);
    entity.addComponent("render", { type, material: mat });
    entity.setLocalScale(...scale);
    entity.setLocalPosition(...position);
    root.addChild(entity);
    return entity;
  };

  const idleClip = heroCharacter?.clipNames?.find(name => /^Hero01_Idle$/i.test(name))
    || heroCharacter?.defaultClips?.idle || null;
  const walkClip = heroCharacter?.clipNames?.find(name => /^Hero01_Walk$/i.test(name))
    || heroCharacter?.defaultClips?.walk || heroCharacter?.defaultClips?.run || null;

  const facePlayer = (actor, player) => {
    const dx = player[0] - actor.motion.position[0];
    const dz = player[2] - actor.motion.position[2];
    actor.facingYaw = Math.atan2(dx, -dz) * 180 / Math.PI;
    actor.root.setEulerAngles(0, actor.facingYaw, 0);
  };

  function buildBehaviour(actor) {
    return createBehaviourTree(selector(
      sequence(
        condition(ctx => ctx.senses.visible && actor.noticeCooldown <= 0),
        action(ctx => {
          stats.sightings++;
          actor.noticeCooldown = 2.8;
          actor.notice = .58;
          actor.state = ctx.senses.distance < 2.6 ? 'greeting' : 'noticing-player';
          actor.desired = [0, 0, 0];
          facePlayer(actor, ctx.player);
          if (ctx.senses.distance < 2.6) stats.greetings++;
          return BT.SUCCESS;
        })
      ),
      sequence(
        condition(ctx => ctx.senses.heard && !ctx.senses.visible && actor.noticeCooldown <= 0),
        action(ctx => {
          stats.heardEvents++;
          actor.noticeCooldown = 1.65;
          actor.investigate = .48;
          actor.state = 'hearing-alert';
          actor.desired = [0, 0, 0];
          facePlayer(actor, ctx.player);
          return BT.SUCCESS;
        })
      ),
      sequence(
        condition(() => actor.notice > 0),
        action(ctx => {
          actor.notice = Math.max(0, actor.notice - ctx.dt);
          actor.state = actor.state === 'greeting' ? 'greeting' : 'noticing-player';
          actor.desired = [0, 0, 0];
          facePlayer(actor, ctx.player);
          return actor.notice > 0 ? BT.RUNNING : BT.SUCCESS;
        })
      ),
      sequence(
        condition(() => actor.investigate > 0),
        action(ctx => {
          actor.investigate = Math.max(0, actor.investigate - ctx.dt);
          actor.state = 'hearing-alert';
          actor.desired = [0, 0, 0];
          facePlayer(actor, ctx.player);
          return actor.investigate > 0 ? BT.RUNNING : BT.SUCCESS;
        })
      ),
      sequence(
        condition(() => actor.wait > 0),
        action(ctx => {
          actor.wait = Math.max(0, actor.wait - ctx.dt);
          actor.state = actor.role.startsWith('Vendor') ? 'browsing' : 'waiting';
          actor.desired = [0, 0, 0];
          return actor.wait > 0 ? BT.RUNNING : BT.SUCCESS;
        })
      ),
      sequence(
        condition(() => {
          const target = actor.route[actor.waypoint];
          return Math.hypot(target[0] - actor.motion.position[0], target[2] - actor.motion.position[2]) < .75;
        }),
        action(() => {
          if (actor.waypoint === 0 || actor.waypoint === 3) {
            actor.direction *= -1;
            stats.routeChanges++;
          }
          actor.waypoint = Math.max(0, Math.min(3, actor.waypoint + actor.direction));
          actor.wait = actor.isHero01 ? .25 : actor.role === 'Vendor' ? 1.2 : .35;
          actor.path = [];
          actor.pathTarget = null;
          actor.state = 'waiting';
          actor.desired = [0, 0, 0];
          return BT.SUCCESS;
        })
      ),
      action(() => {
        const p = actor.motion.position;
        const target = actor.route[actor.waypoint];
        if (!actor.pathTarget || Math.hypot(target[0] - actor.pathTarget[0], target[2] - actor.pathTarget[2]) > .01 || actor.pathIndex >= actor.path.length) {
          actor.path = navigation.findPath(p, target, { radius: actor.motion.radius, maxNodes: 950 });
          actor.pathTarget = target.slice();
          actor.pathIndex = 0;
          stats.pathRequests++;
          if (!actor.path.length) actor.path = [target.slice()];
        }
        while (actor.pathIndex < actor.path.length - 1 && Math.hypot(actor.path[actor.pathIndex][0] - p[0], actor.path[actor.pathIndex][2] - p[2]) < .65) actor.pathIndex++;
        const next = actor.path[Math.min(actor.pathIndex, actor.path.length - 1)] || target;
        const dx = next[0] - p[0], dz = next[2] - p[2];
        const remaining = Math.hypot(dx, dz);
        const speed = actor.isHero01 ? 1.18 : actor.role === 'Courier' ? 1.55 : actor.role === 'Student' ? 1.35 : 1.1;
        actor.desired = remaining > .02 ? [dx / remaining * speed, 0, dz / remaining * speed] : [0, 0, 0];
        actor.state = 'walking';
        return BT.SUCCESS;
      })
    ));
  }

  for (let i = 0; i < DEFS.length; i++) {
    const [role, x, z, shirt, skin] = DEFS[i];
    const isHero01 = i === 0 && !!heroCharacter?.root?.anim;
    const root = isHero01 ? heroCharacter.root : new pc.Entity("ambient-pedestrian-" + (i + 1));
    root.name = isHero01 ? "city-npc-hero01" : "ambient-pedestrian-" + (i + 1);
    root.tags.add("ambient-pedestrian");
    if (isHero01) {
      root.tags.add("hero01-city-npc");
      root.setLocalScale(1, 1, 1);
    } else {
      const shirtMat = material(shirt);
      const skinMat = material(skin);
      const trouserMat = material([.09,.1,.12]);
      const shoeMat = material([.025,.03,.035]);

      part(root, "torso", "cylinder", [.42,.76,.3], [0,1.02,0], shirtMat);
      part(root, "head", "sphere", [.25,.28,.24], [0,1.62,0], skinMat);
      part(root, "hair", "sphere", [.255,.12,.245], [0,1.79,-.02], shoeMat);
    }

    let la = null, ra = null, ll = null, rl = null;
    if (!isHero01) {
      la = new pc.Entity("left-arm");
      ra = new pc.Entity("right-arm");
      ll = new pc.Entity("left-leg");
      rl = new pc.Entity("right-leg");
      la.setLocalPosition(-.25,1.35,0);
      ra.setLocalPosition(.25,1.35,0);
      ll.setLocalPosition(-.12,.65,0);
      rl.setLocalPosition(.12,.65,0);
      for (const entity of [la,ra,ll,rl]) root.addChild(entity);
      part(la,"arm","cylinder",[.12,.52,.12],[0,-.24,0],material(shirt));
      part(ra,"arm","cylinder",[.12,.52,.12],[0,-.24,0],material(shirt));
      part(ll,"leg","cylinder",[.14,.58,.14],[0,-.27,0],material([.09,.1,.12]));
      part(ll,"shoe","box",[.22,.12,.32],[0,-.58,-.06],material([.025,.03,.035]));
      part(rl,"leg","cylinder",[.14,.58,.14],[0,-.27,0],material([.09,.1,.12]));
      part(rl,"shoe","box",[.22,.12,.32],[0,-.58,-.06],material([.025,.03,.035]));
    }

    root.setPosition(x, 0, z);
    app.root.addChild(root);
    const side = x < 0 ? -1 : 1;
    const route = side < 0
      ? [[-5.82,0,4],[-5.82,0,-14],[-5.82,0,-32],[-5.82,0,-50]]
      : [[5.82,0,-50],[5.82,0,-32],[5.82,0,-14],[5.82,0,4]];

    const actor = {
      id: root.name,
      role: isHero01 ? "Hero 01 · City NPC" : role,
      root,
      isHero01,
      la, ra, ll, rl,
      side,
      direction: 1,
      route,
      waypoint: side < 0 ? (z < -32 ? 3 : z < -14 ? 2 : 1) : (z < -32 ? 0 : z < -14 ? 1 : 2),
      motion: { position: [x,0,z], velocity: [0,0,0], radius: .27, height: 1.8, grounded: true },
      state: "walking",
      wait: 0,
      notice: 0,
      investigate: 0,
      noticeCooldown: 0,
      gait: 0,
      activeClip: "",
      path: [],
      pathIndex: 0,
      pathTarget: null,
      desired: [0, 0, 0],
      facingYaw: 0,
      senses: { visible: false, heard: false, distance: Infinity, source: 'none' },
      behaviour: null
    };
    actor.behaviour = buildBehaviour(actor);
    actors.push(actor);
    if (isHero01 && walkClip) {
      actor.activeClip = walkClip;
      root.anim.baseLayer.transition(walkClip, .12);
    }
  }

  let accumulator = 0;
  function playNpcClip(actor, clip) {
    if (!actor.isHero01 || !clip || actor.activeClip === clip || !actor.root.anim) return;
    try {
      actor.root.anim.baseLayer.transition(clip, .18);
      actor.activeClip = clip;
    } catch (error) {
      console.warn("Hero 01 NPC animation failed:", clip, error);
    }
  }

  function update(dt, playerState) {
    accumulator += Math.min(.05, Math.max(0, dt));
    if (accumulator < .08) return;
    const h = accumulator;
    accumulator = 0;
    stats.updates++;

    const player = playerState?.position || [0,0,0];
    const playerBody = { position: player, radius: .34, height: 1.8 };

    for (const actor of actors) {
      const p = actor.motion.position;
      actor.noticeCooldown = Math.max(0, actor.noticeCooldown - h);
      const distance = Math.hypot(player[0] - p[0], player[2] - p[2]);
      const senses = perception.sense(
        { position: p, yaw: actor.facingYaw, eyeHeight: 1.45 },
        { position: player, eyeHeight: playerState?.vehicleOccupied ? 1.0 : 1.1 },
        { running: Boolean(playerState?.running), vehicle: Boolean(playerState?.vehicleOccupied), noise: Boolean(playerState?.noiseEvent) }
      );
      actor.senses = senses;
      actor.behaviour.tick({ actor, player, playerState, senses, distance, dt: h });
      stats.behaviourTicks++;
      const oldX = p[0], oldZ = p[2];
      solver.step(actor.motion, actor.desired, h, [playerBody, ...actors.filter(other => other !== actor).map(other => other.motion)]);
      actor.root.setPosition(...p);

      const vx = actor.motion.velocity[0];
      const vz = actor.motion.velocity[2];
      if (Math.hypot(vx, vz) > .12) {
        actor.facingYaw = Math.atan2(vx, -vz) * 180 / Math.PI;
        actor.root.setEulerAngles(0, actor.facingYaw, 0);
        actor.gait += h * 7.5;
      }

      if (actor.isHero01) {
        playNpcClip(actor, actor.state === "walking" ? walkClip : idleClip);
      } else {
        const swing = Math.sin(actor.gait) * (actor.state === "walking" ? 24 : 0);
        actor.ll.setLocalEulerAngles(swing,0,0);
        actor.rl.setLocalEulerAngles(-swing,0,0);
        actor.la.setLocalEulerAngles(-swing * .72,0,0);
        actor.ra.setLocalEulerAngles(swing * .72,0,0);
      }

      if (Math.hypot(p[0] - oldX, p[2] - oldZ) > .006) stats.moved++;
    }
  }

  function destroy() {
    for (const actor of actors) actor.root.destroy();
    actors.length = 0;
  }

  function getState() {
    const heroNpc = actors.find(actor => actor.isHero01);
    return {
      stage: "09-ambient-pedestrians",
      activeCount: actors.length,
      visibleCount: actors.filter(actor => actor.root.enabled).length,
      renderMeshInstances: actors.reduce((sum, actor) =>
        sum + actor.root.findComponents("render").reduce((count, render) => count + (render.meshInstances?.length || 0), 0), 0),
      updates: stats.updates,
      moved: stats.moved,
      greetings: stats.greetings,
      routeChanges: stats.routeChanges,
      sightings: stats.sightings,
      heardEvents: stats.heardEvents,
      behaviourTicks: stats.behaviourTicks,
      pathRequests: stats.pathRequests,
      perception: perception.getState(),
      navigation: navigation.getState(),
      states: actors.reduce((result, actor) => {
        result[actor.state] = (result[actor.state] || 0) + 1;
        return result;
      }, {}),
      heroNpc: heroNpc ? {
        id: heroNpc.id,
        name: "Hero 01",
        role: heroNpc.role,
        active: heroNpc.root.enabled,
        isPlayer: false,
        state: heroNpc.state,
        activeClip: heroNpc.activeClip,
        position: heroNpc.motion.position.slice(),
        senses: { ...heroNpc.senses },
        moved: stats.moved > 0 && heroNpc.motion.velocity.some(value => Math.abs(value) > .05),
        rigged: !!heroNpc.root.anim
      } : null,
      roster: actors.map(actor => ({
        id: actor.id,
        role: actor.role,
        state: actor.state,
        senses: { ...actor.senses },
        position: actor.motion.position.slice()
      }))
    };
  }

  return { update, destroy, getState };
}
