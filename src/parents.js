// Autonomous mums and dads: each one wanders, cooks, sits, sleeps, shops and visits other houses.

export const HOUSES = {
  home: { hall: "home", kitchen: "homeKitchen", mum: "mum", dad: "homeDad" },
  pink: { hall: "pink", kitchen: "pinkKitchen", mum: "pinkMum", dad: "pinkDad" },
  blue: { hall: "blue", kitchen: "blueKitchen", mum: "blueMum", dad: "blueDad" },
  yellow: { hall: "yellow", kitchen: "yellowKitchen", mum: "yellowMum", dad: "yellowDad" },
};

export const ACTIVITIES = ["walk", "cook", "sit", "sleep", "shop", "visit", "work"];

const SPEED = 140;
const STOVE_X = 1030;
const SHOP_X = 880;
const START_X = {
  mum: 1135, pinkMum: 1245, blueMum: 975, yellowMum: 880,
  homeDad: 1170, pinkDad: 1230, blueDad: 1060, yellowDad: 750,
};

export function createParents(rooms, doorW, rng = Math.random) {
  const doorCentre = (door) => door.x + doorW / 2;
  const rand = (a, b) => a + rng() * (b - a);
  const pick = (list) => list[Math.floor(rng() * list.length)];

  const routes = {};
  for (const from of Object.keys(rooms)) {
    const first = { [from]: null };
    const queue = [from];
    while (queue.length) {
      const room = queue.shift();
      for (const door of rooms[room].doors) {
        if (door.to in first) continue;
        first[door.to] = room === from ? door : first[room];
        queue.push(door.to);
      }
    }
    routes[from] = first;
  }

  const parents = [];
  for (const [house, h] of Object.entries(HOUSES)) {
    for (const [kind, id] of [["mum", h.mum], ["dad", h.dad]]) {
      parents.push({
        id, kind, house, room: id, x: START_X[id], dir: -1,
        state: "idle", pose: "stand", activity: null, goal: null,
        timer: rand(3, 8), walk: 0, carrying: false,
      });
    }
  }

  const taken = (seat) => parents.some((o) => o.goal?.seat === seat);

  function plan(p, activity) {
    const h = HOUSES[p.house];
    if (activity === "cook") return { room: h.kitchen, x: STOVE_X, dir: 1, pose: "cook", duration: rand(8, 14) };
    if (activity === "sleep") {
      const seat = rooms[p.id].seats?.find((s) => s.name === "bed");
      return seat && { room: p.id, x: seat.x, seat, dir: 1, pose: "sleep", duration: rand(10, 16) };
    }
    if (activity === "sit") {
      const options = [h.kitchen, h.mum, h.dad, h.hall].flatMap((room) =>
        (rooms[room].seats ?? []).filter((s) => s.name !== "bed" && !taken(s)).map((seat) => ({ room, seat })));
      const chosen = options.length ? pick(options) : null;
      return chosen && { room: chosen.room, x: chosen.seat.x, seat: chosen.seat, dir: chosen.seat.dir, pose: "sit", duration: rand(6, 12) };
    }
    if (activity === "shop") return { room: "shop", x: SHOP_X, dir: 1, pose: "stand", duration: rand(4, 6), shopping: true };
    if (activity === "work") return { room: "shop", x: Math.round(rand(650, 800)), dir: 1, pose: "work", duration: rand(10, 15) };
    if (activity === "visit") {
      const room = HOUSES[pick(Object.keys(HOUSES).filter((k) => k !== p.house))].hall;
      return { room, x: Math.round(rand(500, rooms[room].width - 500)), dir: rng() < 0.5 ? 1 : -1, pose: "stand", duration: rand(8, 12) };
    }
    const room = pick([h.hall, h.kitchen, h.mum, h.dad, "outside"]);
    return { room, x: Math.round(rand(150, rooms[room].width - 150)), dir: p.dir, pose: "stand", duration: rand(1.5, 3.5) };
  }

  function assign(p, activity) {
    const goal = plan(p, activity);
    if (!goal) return assign(p, "walk");
    p.activity = activity;
    p.goal = goal;
    p.state = "walking";
    p.pose = "stand";
  }

  function choose(p) {
    assign(p, pick(ACTIVITIES.filter((a) => a !== p.activity)));
  }

  function stepParent(p, dt) {
    if (p.state !== "walking") {
      p.timer -= dt;
      if (p.timer <= 0) choose(p);
      return;
    }
    const { goal } = p;
    const door = p.room === goal.room ? null : routes[p.room][goal.room];
    const target = door ? doorCentre(door) : goal.x;
    const dx = target - p.x;
    const reach = SPEED * dt;
    if (Math.abs(dx) > reach) {
      p.dir = Math.sign(dx);
      p.x += p.dir * reach;
      p.walk += dt * 10;
      return;
    }
    p.x = target;
    p.walk = 0;
    if (door) {
      const arrival = rooms[door.to].doors.find((d) => d.id === door.arrive);
      p.room = door.to;
      p.x = doorCentre(arrival);
      if (p.room === HOUSES[p.house].hall) p.carrying = false;
      return;
    }
    p.state = "doing";
    p.pose = goal.pose;
    p.dir = goal.dir;
    p.timer = goal.duration;
    if (goal.shopping) p.carrying = true;
  }

  const byId = (id) => parents.find((p) => p.id === id);

  return {
    parents,
    step(dt) {
      for (const p of parents) stepParent(p, dt);
    },
    assign(id, activity) {
      assign(byId(id), activity);
    },
    place(id, room, x) {
      Object.assign(byId(id), { room, x, state: "doing", pose: "stand", goal: null, timer: Infinity, dir: 1 });
    },
    advance(id, maxSeconds = 300) {
      const p = byId(id);
      let elapsed = 0;
      while (p.state !== "doing" && elapsed < maxSeconds) {
        for (const q of parents) stepParent(q, 0.05);
        elapsed += 0.05;
      }
      return elapsed;
    },
  };
}
