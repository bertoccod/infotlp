import { getMyCollection } from './dbops.js';

window.applyFilters = applyFilters;


let activeTypes = new Set(["movie", "tv"]);
let activeStars = "all";

window.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const typeParam = urlParams.get('type');
  const starsParam = urlParams.get('stars');

  if (typeParam) {
    activeTypes = new Set(typeParam.split(','));
    for (const type of ["movie", "tv"]) {
      const btn = document.getElementById(`filter-${type}`);
      if (activeTypes.has(type)) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    }
  }

  if (starsParam) {
    activeStars = starsParam;
    const starFilter = document.getElementById("starFilter");
    if (starFilter) starFilter.value = starsParam;
  }

  getMyCollection(0).then(() => {
    applyFilters(); // <-- ora funziona perché i <li> sono nel DOM
  });

  document.getElementById("filter-movie").addEventListener("click", () => toggleType("movie"));
  document.getElementById("filter-tv").addEventListener("click", () => toggleType("tv"));
  document.getElementById("starFilter").addEventListener("change", (e) => {
    activeStars = e.target.value;
    applyFilters();
  });
});


function toggleType(type) {
  const btn = document.getElementById(`filter-${type}`);
  if (activeTypes.has(type)) {
    activeTypes.delete(type);
    btn.classList.remove("active");
  } else {
    activeTypes.add(type);
    btn.classList.add("active");
  }
  applyFilters();
}

export function applyFilters() {
  const input = document.getElementById("localSearch");
  const searchText = input.value.toLowerCase();
  const ul = document.getElementById("results");
  const li = ul.getElementsByTagName("li");

  for (let i = 0; i < li.length; i++) {
    const tipo = li[i].getAttribute("data-type");
    const voto = li[i].getAttribute("data-stars");
    const visibleText = li[i].textContent || li[i].innerText;
    const keywords = li[i].getAttribute("data-keywords") || '';
    const combinedText = (visibleText + ' ' + keywords).toLowerCase();

    const matchType = activeTypes.has(tipo);
    const matchStars = activeStars === "all" || voto === activeStars;
    const matchText = combinedText.includes(searchText);

    li[i].style.display = matchType && matchStars && matchText ? "" : "none";
  }
  const params = new URLSearchParams();
  params.set('type', Array.from(activeTypes).join(','));
  params.set('stars', activeStars);
  history.replaceState(null, '', `?${params.toString()}`);

}



/*
export function filterList(){
  const input = document.getElementById("localSearch");
  const filter = input.value.toLowerCase();
  const ul = document.getElementById("results");
  const li = ul.getElementsByTagName("li");
  for (let i=0; i<li.length; i++){
    const visibleText = li[i].textContent || li[i].innerText;
    const keywords = li[i].getAttribute('data-keywords') || '';
    const combinedText = (visibleText + ' ' + keywords).toLowerCase();
    if (combinedText.indexOf(filter) > -1){
      li[i].style.display = "";
    } else {
      li[i].style.display = "none";
    }
  }
}*/