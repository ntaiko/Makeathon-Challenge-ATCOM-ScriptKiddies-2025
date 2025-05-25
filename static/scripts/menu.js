const menuController = document.querySelector(".control-sidebar");
const sidebar = document.querySelector(".sidebar");

document.addEventListener("DOMContentLoaded", function () {
  if (menuController && sidebar) {
    menuController.addEventListener("click", function () {
      sidebar.classList.toggle("hide-menu");
    });
  } else {
    console.error("Menu controller or sidebar element not found!");
  }
});
