////////////////////////////////////////////////////////////////////
/////////////////////// Cookie Consent
window.cookieconsent.initialise({
  container: document.getElementById("content"),
  cookie: {
    domain: window.location.hostname // or 'your.domain.com' // it is mandatory to set a domain, for cookies to work properly (see https://goo.gl/S2Hy2A)
  },
  palette: {
    popup: { background: "#000" },
    button: { background: "#f1d600" },
  },
  position: "bottom-right",
  revokable: true,
  onStatusChange: function (status) {
    console.log(this.hasConsented() ?
      window.location.reload() : 'disable cookies');
  },
  onPopupOpen: function(e) {
    document.getElementById('overlay').style.display = 'block';
  },
  onPopupClose: function(e) {
    document.getElementById('overlay').style.display = 'none';
  },
  theme: 'classic',
  type: 'opt-out',
  law: {
    regionalLaw: false,
  },
  location: true,
});
//////////////////////////////////////////////////////////////////
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

//////////////////////////////////////////////////////////////////////
//// Visitor Counter Methods
let visitor = {
  visitor_id: '',
  access_url: '',
  ip_address: '',
  city: '',
  continentCode: '',
  countryCode: '',
  countryName: '',
  stateProv: ''
};

updateVisitorCounter()
async function updateVisitorCounter() {
  if (localStorage.getItem('visitor')) {
    let v = JSON.parse(localStorage.getItem('visitor') || '{}');
    visitor.visitor_id = v.visitor_id;
    visitor.ip_address = v.ip_address;
    visitor.access_url = window.location.hostname;
    await callVisitorCounter(visitor);
  }
  else {
    let info = await getClientIP();
    visitor.ip_address = info.ipAddress;
    visitor.access_url = window.location.hostname;
    visitor.city = info.city;
    visitor.continentCode = info.continentCode;
    visitor.countryCode = info.countryCode;
    visitor.countryName = info.countryName;
    visitor.stateProv = info.stateProv;

    let visit = await callVisitorCounter(visitor);
    if (typeof visit === 'object') {
      console.log(visit.message);
    }
    else {
      localStorage.setItem('visitor', JSON.stringify({ visitor_id: visit, ip_address: visitor.ip_address }))
    }
  }
}

async function getClientIP() {
  //let url = 'https://www.cloudflare.com/cdn-cgi/trace';
  let url = 'https://api.db-ip.com/v2/free/self';
  return await (await fetch(url)).json();
}

async function callVisitorCounter(visitor) {
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json' // Set the content type based on the data you are sending
      // You can add other headers as needed
    },
    body: JSON.stringify({ visitor: visitor }) // Convert the data to JSON format
  };
  return await (await fetch('https://fair.classics.ox.ac.uk/visitorInfo.php', options)).json();
}