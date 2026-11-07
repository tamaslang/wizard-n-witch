// Little conversations between the kid and a parent: hello, questions and answers.

const GREETINGS = ["Hello, my little star! 💜", "Hello, sweetie! ✨", "Well hello there! 🦇"];
const PARENT_QUESTIONS = ["How was your day? 🌙", "Did you brew anything fun? 🧪", "Are you hungry? 🍰", "Did you do a good deed today? ⭐"];
const KID_ANSWERS = ["Great, thanks! 😄", "Yes, a little! 🤭", "It was magical! ✨", "Yes! I helped a bat! 🦇"];
const REPLIES = ["Lovely! 💜", "That's wonderful! ⭐", "I'm so proud of you! 🥰"];
const KID_QUESTIONS = [
  ["What's for dinner? 🍲", "Bat-wing stew! Yummy! 🦇"],
  ["Can I have a snack? 🍰", "Check the fridge! 🧀"],
  ["Where is my broom? 🧹", "By the door, I think! 🚪"],
  ["Can we brew a potion? 🧪", "After dinner, I promise! ✨"],
];
const SLEEPING = "Zzz… 💤";

export function createTalk(rng = Math.random) {
  const pick = (list) => list[Math.floor(rng() * list.length)];
  let clock = 0;
  const later = [];
  const state = { kid: null, parents: {}, pending: null };

  const say = (who, text, ttl) => {
    if (who === "kid") state.kid = { text, ttl };
    else state.parents[who] = { text, ttl };
  };
  const schedule = (delay, fn) => later.push({ at: clock + delay, fn });

  return {
    state,
    step(dt) {
      clock += dt;
      for (const job of later.splice(0).filter((j) => j.at > clock || (j.fn(), false))) later.push(job);
      if (state.kid && (state.kid.ttl -= dt) <= 0) state.kid = null;
      for (const [id, b] of Object.entries(state.parents)) if ((b.ttl -= dt) <= 0) delete state.parents[id];
      if (state.pending && (state.pending.ttl -= dt) <= 0) state.pending = null;
    },
    hello(parent) {
      say("kid", "Hello! 👋", 2.5);
      if (!parent) return;
      if (parent.pose === "sleep") return say(parent.id, SLEEPING, 3);
      say(parent.id, pick(GREETINGS), 2.5);
      const question = pick(PARENT_QUESTIONS);
      schedule(2.6, () => {
        say(parent.id, question, 8);
        state.pending = { id: parent.id, ttl: 8 };
      });
    },
    ask(parent) {
      const [question, answer] = pick(KID_QUESTIONS);
      say("kid", question, 3);
      state.pending = null;
      schedule(1.8, () => say(parent.id, parent.pose === "sleep" ? SLEEPING : answer, 3.5));
    },
    answer() {
      if (!state.pending) return false;
      const { id } = state.pending;
      state.pending = null;
      delete state.parents[id];
      say("kid", pick(KID_ANSWERS), 3);
      schedule(1.2, () => say(id, pick(REPLIES), 3));
      return true;
    },
  };
}
