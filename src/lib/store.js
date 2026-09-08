const SESSION_KEY = "forma.session";
const seedCreations = [
  { id: "sample-1", title: "Quiet desert forms", prompt: "Sculptural terracotta sand dunes beneath a pale blue sky, warm afternoon light, minimalist composition.", style: "Cinematic", ratio: "4:3", image: "/gallery/dunes.jpg", createdAt: "2026-09-08T08:30:00.000Z" },
  { id: "sample-2", title: "A room with soft light", prompt: "A serene contemporary living space, natural linen, sunlit neutral tones, architectural photography.", style: "Photographic", ratio: "1:1", image: "/gallery/architecture.jpg", createdAt: "2026-09-07T10:10:00.000Z" },
];
function keyFor(email) { return `forma.creations.${email.toLowerCase()}`; }
export function getSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; } }
export function signIn(email) { const user = { email: email.toLowerCase(), name: email.split("@")[0].replace(/[._-]/g, " ") || "Creator" }; localStorage.setItem(SESSION_KEY, JSON.stringify(user)); const key = keyFor(user.email); if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(seedCreations)); return user; }
export function signOut() { localStorage.removeItem(SESSION_KEY); }
export function getCreations(email) { try { return JSON.parse(localStorage.getItem(keyFor(email))) || []; } catch { return []; } }
export function saveCreation(email, creation) { const creations = [creation, ...getCreations(email)]; localStorage.setItem(keyFor(email), JSON.stringify(creations)); return creations; }
export function deleteCreation(email, id) { const creations = getCreations(email).filter((item) => item.id !== id); localStorage.setItem(keyFor(email), JSON.stringify(creations)); return creations; }
