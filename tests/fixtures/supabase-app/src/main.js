import { myNotes } from "./notes.js";

const list = document.querySelector("#notes");
for (const note of await myNotes()) {
  const item = document.createElement("li");
  item.textContent = note.body;
  list.append(item);
}
