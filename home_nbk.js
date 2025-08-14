// 🔧 Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDaERrSbbXOpYVcjUIvx_X1HtGi8kFyHCI",
  authDomain: "infonbk-e6448.firebaseapp.com",
  projectId: "infonbk-e6448",
  storageBucket: "infonbk-e6448.appspot.com",
  messagingSenderId: "999879953189",
  appId: "1:999879953189:web:395a6da1e00660be2b68cc"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const campiDaVisualizzare = ["codice", "marca", "nome", "pollici", "cpu", "generazione", "gpu", "ram", "ssd", "prezzo", "ivrea", "sede"];
let datiCorrenti = null;

window.onload = function() {
  console.log("🚀 JS caricato e DOM pronto");
  visualizzaNotebook();

  document.getElementById("btnModifica").addEventListener("click", abilitaModifica);
  document.getElementById("btnElimina").addEventListener("click", eliminaRecord);
  document.getElementById("btnAnnulla").addEventListener("click", chiudiOverlay);
  document.getElementById("modificaForm").addEventListener("submit", aggiornaRecord);

  document.getElementById("filtriForm").addEventListener("submit", e => {
    e.preventDefault();
    const datiFiltri = {};
    const elementi = e.target.elements;
    for (let i = 0; i < elementi.length; i++) {
      const el = elementi[i];
      if (el.name && el.value !== "") {
        datiFiltri[el.name] = el.value;
      }
    }
    visualizzaNotebook(datiFiltri);
    document.getElementById("sezioneFiltri").style.display = "none";
  });
  document.getElementById("fastfilterinput").addEventListener("input", fastfilter);


  // ✅ CLIC ESTERNO CHIUDE MODALE
  document.getElementById("overlayModifica").addEventListener("click", function(e) {
    const contenuto = document.querySelector(".overlay-content");
    if (!contenuto.contains(e.target)) {
      chiudiOverlay();
    }
  });
}


// Popola select campi filtrabili
const campiFiltrabili = [
  "marca", "pollici", "cpu", "gruppo", "gpu", "ram", "ssd",
  "sistemaoperativo", "webcam"
];
const campiBooleani = [
  "evo","game", "touch", "retroilluminazione", "RJ45", "cardReader",
  "volantino", "expo", "x"
];

// 🎛️ Campi da metadata
campiFiltrabili.forEach(async campo => {
  const snap = await db.collection("metadata_nbk").doc(campo).get();
  const valori = snap.data()?.values || [];

  const selectFiltro = document.querySelector(`#filtriForm select[name="${campo}"]`);
  if (selectFiltro) {
    selectFiltro.innerHTML = "";
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "-- Nessuna selezione --";
    selectFiltro.appendChild(blank);
    valori.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      selectFiltro.appendChild(opt);
    });
  }

  if (campo === "cpu") {
    const selectCpu2 = document.querySelector(`#filtriForm select[name="cpu2"]`);
    if (selectCpu2) {
      selectCpu2.innerHTML = "";
      const blank = document.createElement("option");
      blank.value = "";
      blank.textContent = "-- Nessuna selezione --";
      selectCpu2.appendChild(blank);
      valori.forEach(v => {
        const opt = document.createElement("option");
        opt.value = v;
        opt.textContent = v;
        selectCpu2.appendChild(opt);
      });
    }
  }

  const selectModifica = document.querySelector(`#modificaForm select[name="${campo}"]`);
  if (selectModifica) {
    selectModifica.innerHTML = "";
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "-- Nessuna selezione --";
    selectModifica.appendChild(blank);
    valori.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      selectModifica.appendChild(opt);
    });
  }
});

// 🎛️ Campi booleani: SI / NO
campiBooleani.forEach(campo => {
  const selectModifica = document.querySelector(`#modificaForm select[name="${campo}"]`);
  if (selectModifica) {
    selectModifica.innerHTML = "";
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "-- Nessuna selezione --";
    selectModifica.appendChild(blank);

    ["SI", "NO"].forEach(val => {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = val;
      selectModifica.appendChild(opt);
    });
  }
});


// 🎯 Visualizza notebook con filtri
function visualizzaNotebook(filtri = {}) {
  db.collection("nbk")
    .orderBy("gruppo", "asc")
    .get()
    .then(snapshot => {
      let docs = snapshot.docs;

      // 🔍 Filtra lato client
      const filtrati = docs.filter(doc => {
        const d = doc.data();

        // Campi con confronto diretto (select)
        for (let campo of ["marca", "pollici", "ram", "ssd", "gpu","game" ,"retroilluminazione", "RJ45", "cardReader", "volantino", "cpu", "expo"]) {
          if (filtri[campo] && d[campo] !== filtri[campo]) return false;
        }

        // 💰 Filtri numerici
        const FtMax = Number(filtri.prezzoMax)/100;
        let FtMaxVal = FtMax*11;
        FtMaxVal +=Number(filtri.prezzoMax)+55;
        const RealMax = d.prezzo/100;
        let RealMaxVal = RealMax*11;
        RealMaxVal +=Number(d.prezzo)+55;

        if (filtri.prezzoMin && d.prezzo < Number(filtri.prezzoMin)) return false;
        if (FtMaxVal && RealMaxVal > FtMaxVal) return false;
        
        // Filtro veloce gruppi
        if (filtri.gruppi && filtri.gruppi.length > 0) {
            if (!filtri.gruppi.includes(d.gruppo)) {
                return false;
            }
        }


        // 🔎 Codice contiene
        if (filtri.codice && !((d.codice || "").toLowerCase().includes(filtri.codice.toLowerCase()))) return false;

        // 🎛️ CPU doppia
        if (filtri.cpu2 && filtri.cpu) {
          if (d.cpu !== filtri.cpu && d.cpu !== filtri.cpu2) return false;
        }

        return true;
      });

      mostraTabella(filtrati);
    })
    .catch(err => {
      console.error("❌ Errore nella visualizzazione:", err.message);
    });
}

async function mostraTabella(docs) {
  const risultatiGaranzia = await Promise.all(docs.map(doc => {
    const data = doc.data();
    const prezzo = parseFloat(data.prezzo);
    if (data.marca && prezzo) {
      return calcolaGaranziaEsatta(data.marca, prezzo);
    }
    return Promise.resolve({ garanzia: 0, totale: prezzo + 55 });
  }));

  let html = `<table class="elenco"><thead><tr><th>Selez.</th>`;
  for (const campo of campiDaVisualizzare) {
    html += `<th>${campo}</th>`;
    if (campo === "prezzo") html += `<th>Garanzia</th><th>Totale</th>`;
  }
  html += `<th>Azioni</th><th>&#x2714</th></tr></thead><tbody>`;

  let ultimoGruppo = null;
  let usaGiallo = true;

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const data = doc.data();
    const { garanzia, totale } = risultatiGaranzia[i];

    const gruppoAttuale = data.gruppo;
    if (gruppoAttuale !== ultimoGruppo) {
      ultimoGruppo = gruppoAttuale;
      usaGiallo = !usaGiallo;
    }

    const classeRiga = usaGiallo ? "riga-gialla" : "riga-rosa";
    html += `<tr class="${classeRiga}" data-classe="${classeRiga}">`;
    html += `<td><input type="checkbox" onclick="evidenzia(this, '${doc.id}')" ${data.sel === "YES" ? "checked" : ""}></td>`;

    for (const campo of campiDaVisualizzare) {
      const valore = data[campo] || "";

      if (campo === "prezzo") {
        html += `<td><input name="${campo}" value="${valore}" class="inputprezzo"></td>`;
        html += `<td>${garanzia.toFixed(2)}</td>`;
        html += `<td${data.sel === "YES" ? ' class="rigaevid"' : ""}><b>${totale.toFixed(2)}</b></td>`;
      } else if (campo === "ivrea") {
        const classe = data.expo === "SI" ? "inputexpo" : "inputgiacenze";
        html += `<td><input name="${campo}" value="${valore}" class="${classe}"></td>`;
      } else if (campo === "sede") {
        html += `<td><input name="${campo}" value="${valore}" class="inputgiacenze"></td>`;
      } else if (campo === "codice") {
        html += `<td>${valore}</td>`;
      } else {
        html += `<td ondblclick="apriModifica('${doc.id}')">${valore}</td>`;
      }
    }

    html += `<td><button class="updpricebt" onclick="aggiornaPrezzo('${doc.id}', event)">✅</button></td>`;
    html += `<td><input type="checkbox" onclick="spuntalo(this, '${doc.id}')" ${data.check === "YES" ? "checked" : ""}></td>`;
    html += `</tr>`;
  }

  html += `</tbody></table>`;
  document.getElementById("tabella").innerHTML = html;
}

async function calcolaGaranziaEsatta(marca, prezzoNotebook) {
  try {
    // 1️⃣ Recupera il documento "gruppi" per trovare la lettera del gruppo associato alla marca
    const gruppiDoc = await db.collection("gar_nbk").doc("gruppi").get();
    const gruppoLettera = gruppiDoc.data()?.[marca];

    if (!gruppoLettera) {
      console.warn(`⚠️ Nessun gruppo trovato per la marca: ${marca}`);
      return { garanzia: 0, totale: prezzoNotebook + 55 };
    }

    // 2️⃣ Recupera il documento con ID uguale alla lettera
    const gruppoDoc = await db.collection("gar_nbk").doc(gruppoLettera).get();
    const garanziaValore = gruppoDoc.data()?.[String(prezzoNotebook)];

    if (garanziaValore === undefined) {
      console.warn(`⚠️ Nessuna garanzia trovata per il prezzo ${prezzoNotebook} nel gruppo ${gruppoLettera}`);
      return { garanzia: 0, totale: prezzoNotebook + 55 };
    }

    // 3️⃣ Calcola il totale
    return {
      garanzia: garanziaValore,
      totale: prezzoNotebook + garanziaValore + 55
    };

  } catch (err) {
    console.error("❌ Errore nel calcolo della garanzia:", err);
    return { garanzia: 0, totale: prezzoNotebook + 55 };
  }
}

//EVIDENZIA RIGA
  function evidenzia(checkbox, idDoc) {
    const riga = checkbox.parentNode.parentNode;
    const cellaDaEvidenziare = riga.cells[12]; // Cambia l'indice per scegliere la colonna

    const classeOriginale = cellaDaEvidenziare.getAttribute("data-classe");

    if (checkbox.checked) {
      cellaDaEvidenziare.classList.remove("riga-gialla", "riga-rosa");
      cellaDaEvidenziare.classList.add("rigaevid");
      db.collection("nbk").doc(idDoc).update({ sel: "YES" });
    } else {
      cellaDaEvidenziare.classList.remove("rigaevid");
      if (classeOriginale) {
        cellaDaEvidenziare.classList.add(classeOriginale);
      }
      db.collection("nbk").doc(idDoc).update({ sel: "NO" });
    }
  }


//SPUNTALO
function spuntalo(checkbox, idDoc) {
  const riga = checkbox.parentNode.parentNode;
  if (checkbox.checked) {
    db.collection("nbk").doc(idDoc).update({ check: "YES" });
  } else {
    db.collection("nbk").doc(idDoc).update({ check: "NO" });
  }
}





// 🛠️ Apri overlay
function apriModifica(idDoc) {
  db.collection("nbk").doc(idDoc).get().then(doc => {
    const data = doc.data();
    datiCorrenti = idDoc;
    const form = document.getElementById("modificaForm");
    for (let k in data) {
      const el = form[k];
      if (el) {
        if (el.tagName === "SELECT") {
          el.value = data[k] || "";
        } else {
          el.value = data[k] || "";
        }
      }
    }

    Array.from(form.elements).forEach(el => {
      if (el.tagName !== "BUTTON") el.disabled = true;
    });

    document.getElementById("overlayModifica").style.display = "flex";
    document.getElementById("msgStato").innerText = "";
  });
}

// ✏️ Abilita modifica
function abilitaModifica() {
  console.log("🚀 Modifica attivata");
  const form = document.getElementById("modificaForm");
  Array.from(form.elements).forEach(el => {
    if (el.name !== "codice") el.disabled = false;
  });
  document.getElementById("msgStato").innerText = "🔓 Modifica attivata.";
}

// ✅ Aggiorna record
function aggiornaRecord(e) {
  e.preventDefault();
  const form = e.target;
  const aggiornati = {};
  Array.from(form.elements).forEach(el => {
    if (el.name) aggiornati[el.name] = el.type === "number" ? Number(el.value) : el.value;
  });
  db.collection("nbk").doc(datiCorrenti).update(aggiornati).then(() => {
    const msg = document.getElementById("msgStato");
    msg.innerText = "✅ Record aggiornato!";
    msg.style.color = "green";
    setTimeout(() => {
      msg.innerText = "";
      msg.style.color = "";
    }, 3000);
    visualizzaNotebook();
    chiudiOverlay();
  });
}

// ❌ Chiudi overlay
function chiudiOverlay() {
  document.getElementById("overlayModifica").style.display = "none";
}

// 🗑️ Elimina record
function eliminaRecord() {
  if (confirm("Vuoi davvero eliminare questo record? ❗")) {
    db.collection("nbk").doc(datiCorrenti).delete().then(() => {
      chiudiOverlay();
      visualizzaNotebook();
    });
  }
}

// 🔁 Toggle sezione filtri
function toggleFiltri() {
  const sezione = document.getElementById("sezioneFiltri");
  sezione.style.display = sezione.style.display === "none" ? "block" : "none";
}

// 🧹 Reset filtri
function resetFiltri() {
  document.getElementById("filtriForm").reset();
  document.getElementById("sezioneFiltri").style.display = "none";
  visualizzaNotebook();
}
function aggiornaPrezzo(idDoc, event) {
  console.log("aggiorna premuto!");
  const riga = event.target.closest("tr"); // trova la <tr> del bottone cliccato
  const prezzoInput = riga.querySelector('input[name="prezzo"]');
  const ivreaInput = riga.querySelector('input[name="ivrea"]');
  const sedeInput = riga.querySelector('input[name="sede"]');

  const nuovoPrezzo = Number(prezzoInput.value);
  const nuovoIvrea = ivreaInput.value.trim();
  const nuovaSede = sedeInput.value.trim();

  db.collection("nbk").doc(idDoc).update({
    prezzo: nuovoPrezzo,
    ivrea: nuovoIvrea,
    sede: nuovaSede
  }).then(() => {
    prezzoInput.style.border = "2px solid green";
    ivreaInput.style.border = "2px solid green";
    sedeInput.style.border = "2px solid green";

    setTimeout(() => {
      prezzoInput.style.border = "";
      ivreaInput.style.border = "";
      sedeInput.style.border = "";
    }, 1500);
    visualizzaNotebook();
  }).catch(err => {
    alert("⚠️ Errore nell'aggiornamento: " + err.message);
  });
}
//FILTRO VELOCE
function fastfilter() {
  const valoreCodice = document.getElementById("fastfilterinput").value.trim().toLowerCase();

  // Imposta solo il filtro codice, gli altri restano vuoti
  visualizzaNotebook({ codice: valoreCodice });
}

  let filtroIvreaAttivo = false;

  function pronti() {
    filtroIvreaAttivo = !filtroIvreaAttivo;
    
    const bottone = document.getElementById("btnFiltroIvrea");
    bottone.textContent = filtroIvreaAttivo ? "🔍 Mostra tutti" : "🔍 Nbk Imballo chiuso";
    
    db.collection("nbk")
      .orderBy("gruppo", "asc")
      .get()
      .then(snapshot => {
        let docs = snapshot.docs;

        if (filtroIvreaAttivo) {
          docs = docs.filter(doc => {
            const valore = parseFloat(doc.data().ivrea) || 0;
            return valore > 0;
          });
        }

        mostraTabella(docs);
      })
      .catch(err => {
        console.error("❌ Errore nel toggle Ivrea:", err.message);
      });
  }

function filtraPerGruppo() {
    const gruppiSelezionati = [];
    document.querySelectorAll('input[name="gruppoFilter"]:checked').forEach(checkbox => {
        gruppiSelezionati.push(checkbox.value);
    });

    // Se nessun gruppo è selezionato, mostriamo tutti i notebook.
    // Altrimenti, filtriamo per i gruppi selezionati.
    visualizzaNotebook({ gruppi: gruppiSelezionati });
}


