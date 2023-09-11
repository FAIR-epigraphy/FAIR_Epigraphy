document.addEventListener('DOMContentLoaded', function () {
  const menuToggle = document.querySelector('.menu-toggle');
  const menuList = document.querySelector('.menu-list');

  menuToggle.addEventListener('click', function () {
    menuToggle.classList.toggle('active');
    menuList.classList.toggle('active');
  });

  var links = document.querySelectorAll('a[href^="#"]');

  links.forEach(function (link) {
    link.addEventListener("click", function (event) {
      var targetId = link.getAttribute("href").substring(1);
      var target = document.getElementById(targetId);

      if (target) {
        event.preventDefault();
        var offset = target.getBoundingClientRect().top;
        var scrollPosition = window.scrollY || window.pageYOffset;
        var offsetFromTop = offset + scrollPosition;

        window.scrollTo({
          top: offsetFromTop - 120, // Adjust this value based on your navigation bar's height
          behavior: "smooth",
        });
      }
    });
  });
});