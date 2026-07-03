const year = document.querySelector("#year");
const contactButton = document.querySelector("#contactButton");
const contactNote = document.querySelector("#contactNote");

year.textContent = new Date().getFullYear();

contactButton.addEventListener("click", () => {
  contactNote.hidden = !contactNote.hidden;
});
