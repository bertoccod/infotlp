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
const auth = firebase.auth();
const campiDaVisualizzare = ["codice", "marca", "nome", "pollici", "tipo", "ram", "ssd", "prezzo", "ivrea", "sede"];
let datiCorrenti = null;
auth.onAuthStateChanged(user => {
  if (user) {
    console.log("✅ Utente autenticato:", user.email);
    inizializzaTablet(); // Tutto il tuo codice qui
  } else {
    console.log("❌ Utente NON autenticato. Redirect...");
    window.location.href = "index.html";
  }
});

function inizializzaTablet() {
  console.log("🚀 JS caricato e DOM pronto");
  visualizzaTablet();

  document.getElementById("btnModifica").addEventListener("click", abilitaModifica);
  document.getElementById("btnElimina").addEventListener("click", eliminaRecord);
  document.getElementById("btnAnnulla").addEventListener("click", chiudiOverlay);
  document.getElementById("modificaForm").addEventListener("submit", aggiornaRecord);
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
  "marca", "pollici", "tipo", "ram", "ssd"
];
const campiBooleani = [
  "penna","volantino", "expo", "x"
];

// 🎛️ Campi da metadata
campiFiltrabili.forEach(async campo => {
  const snap = await db.collection("metadata_tab").doc(campo).get();
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
function visualizzaTablet(filtri = {}, soloYES = false) {
  db.collection("tab")
    .orderBy("tipo", "asc")
    .get()
    .then(snapshot => {
      let docs = snapshot.docs;

      // 🔍 Filtra lato client
      const filtrati = docs.filter(doc => {
        const d = doc.data();

        // Campi con confronto diretto (select)
        for (let campo of ["marca", "pollici", "ram", "ssd", "penna","volantino", "expo"]) {
          if (filtri[campo] && d[campo] !== filtri[campo]) return false;
        }

        // 💰 Filtri numerici
        const FtMax = Number(filtri.prezzoMax)/100;
        let FtMaxVal = FtMax*11;
        FtMaxVal +=Number(filtri.prezzoMax);
        const RealMax = d.prezzo/100;
        let RealMaxVal = RealMax*11;
        RealMaxVal +=Number(d.prezzo);

        if (filtri.prezzoMin && d.prezzo < Number(filtri.prezzoMin)) return false;
        if (FtMaxVal && RealMaxVal > FtMaxVal) return false;


        // 🔎 Codice contiene
        if (filtri.codice && !((d.codice || "").toLowerCase().includes(filtri.codice.toLowerCase()))) return false;

        // 🎛️ CPU doppia
        if (filtri.cpu2 && filtri.cpu) {
          if (d.cpu !== filtri.cpu && d.cpu !== filtri.cpu2) return false;
        }
        if (soloYES && d.sel !== "YES") return false;
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
  let ultimoGruppo = null;
  let usaGiallo = true;
  let html=`<table id="tabella">`;

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const data = doc.data();
    const { garanzia, totale } = risultatiGaranzia[i];

    const gruppoAttuale = data.tipo;
    if (gruppoAttuale !== ultimoGruppo) {
      ultimoGruppo = gruppoAttuale;
      usaGiallo = !usaGiallo;
    }

    const classeRiga = usaGiallo ? "riga-gialla" : "riga-rosa";
    html += `<tr class="${classeRiga}" data-classe="${classeRiga}">`;
    html += `<td><input type="checkbox" onclick="evidenzia(this, '${doc.id}')" ${data.sel === "YES" ? "checked" : ""}></td>`;
    html += `<td>${data.codice}</td>`;
    html += `<td ondblclick="apriModifica('${doc.id}')">${data.marca}</td>`;
    html += `<td ondblclick="apriModifica('${doc.id}')">${data.nome}</td>`;
    html += `<td ondblclick="apriModifica('${doc.id}')">${data.pollici}"</td>`;
    html += `<td ondblclick="apriModifica('${doc.id}')"><b>${data.tipo}</b></td>`;
    html += `<td id="tdbig" ondblclick="apriModifica('${doc.id}')"><b>${data.ram}/${data.ssd}</b></td>`;
    if (data.penna === "SI"){
      html += `<td>&#128395;</td>`;
    } else {
      html += `<td>-</td>`;
    }
    if (data.x === "SI"){
      html += `<td>&#10060;</td>`;
    } else {
      html += `<td>-</td>`;
    }
    if (data.volantino === "SI"){
      html += `<td style="font-size:17px">&#128226;</td>`;
    } else {
      html += `<td>-</td>`;
    }
    html += `<td><input name="prezzo" value="${data.prezzo}" class="stdinp"></td>`;
    html += `<td><span id="gar">${garanzia.toFixed(2)}</span></td>`;
    html += `<td ${data.sel === "YES" ? ' class="rigaevid"' : ""} id="tdbig"><b><span id="tot">${totale.toFixed(2)} €</span></b></td>`;
    const classe = data.expo === "SI" ? "inputexpo" : "stdinp";
    html += `<td><input name="ivrea" value="${data.ivrea}" class="${classe}"></td>`;
    html += `<td><input name="sede" value="${data.sede}" class="stdinp"></td>`;
    html += `<td><button class="updpricebt" onclick="aggiornaPrezzo('${doc.id}', event,'${data.marca}')">✅</button></td>`;
    html += `<td><input type="checkbox" onclick="spuntalo(this, '${doc.id}')" ${data.check === "YES" ? "checked" : ""}></td>`;
    html += `</tr>`;
  }
  html+=`</table>`;
  document.getElementById("tabella").innerHTML = html;
}
async function calcolaGaranziaEsatta(marca, prezzoTablet) {
  try {
    // 1️⃣ Recupera il documento "gruppi" per trovare la lettera del gruppo associato alla marca
    const gruppiDoc = await db.collection("gar_tab").doc("gruppi").get();
    const gruppoLettera = gruppiDoc.data()?.[marca];

    if (!gruppoLettera) {
      console.warn(`⚠️ Nessun gruppo trovato per la marca: ${marca}`);
      return { garanzia: 0, totale: prezzoTablet };
    }

    // 2️⃣ Recupera il documento con ID uguale alla lettera
    const gruppoDoc = await db.collection("gar_tab").doc(gruppoLettera).get();
    const garanziaValore = gruppoDoc.data()?.[String(prezzoTablet)];

    if (garanziaValore === undefined) {
      console.warn(`⚠️ Nessuna garanzia trovata per il prezzo ${prezzoTablet} nel gruppo ${gruppoLettera}`);
      return { garanzia: 0, totale: prezzoTablet };
    }

    // 3️⃣ Calcola il totale
    return {
      garanzia: garanziaValore,
      totale: prezzoTablet + garanziaValore
    };

  } catch (err) {
    console.error("❌ Errore nel calcolo della garanzia:", err);
    return { garanzia: 0, totale: prezzoTablet };
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
      db.collection("tab").doc(idDoc).update({ sel: "YES" });
    } else {
      cellaDaEvidenziare.classList.remove("rigaevid");
      if (classeOriginale) {
        cellaDaEvidenziare.classList.add(classeOriginale);
      }
      db.collection("tab").doc(idDoc).update({ sel: "NO" });
    }
  }
//SPUNTALO
function spuntalo(checkbox, idDoc) {
  const riga = checkbox.parentNode.parentNode;
  if (checkbox.checked) {
    db.collection("tab").doc(idDoc).update({ check: "YES" });
  } else {
    db.collection("tab").doc(idDoc).update({ check: "NO" });
  }
}

// 🛠️ Apri overlay
function apriModifica(idDoc) {
  db.collection("tab").doc(idDoc).get().then(doc => {
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
  db.collection("tab").doc(datiCorrenti).update(aggiornati).then(() => {
    const msg = document.getElementById("msgStato");
    msg.innerText = "✅ Record aggiornato!";
    msg.style.color = "green";
    setTimeout(() => {
      msg.innerText = "";
      msg.style.color = "";
    }, 3000);
    visualizzaTablet();
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
    db.collection("tab").doc(datiCorrenti).delete().then(() => {
      chiudiOverlay();
      visualizzaTablet();
    });
  }
}

// 🧹 Reset filtri
function resetFiltri() {
  visualizzaTablet();
}

async function aggiornaPrezzo(idDoc, event, marca) {
  const riga = event.target.closest("tr");
  const prezzoInput = riga.querySelector('input[name="prezzo"]');
  const ivreaInput = riga.querySelector('input[name="ivrea"]');
  const sedeInput = riga.querySelector('input[name="sede"]');

  const nuovoPrezzo = Number(prezzoInput.value);
  const nuovoIvrea = ivreaInput.value.trim();
  const nuovaSede = sedeInput.value.trim();
  try {
    await db.collection("tab").doc(idDoc).update({
      prezzo: nuovoPrezzo,
      ivrea: nuovoIvrea,
      sede: nuovaSede
    });
    
    prezzoInput.style.border = "2px solid green";
    ivreaInput.style.border = "2px solid green";
    sedeInput.style.border = "2px solid green";

    setTimeout(() => {
      prezzoInput.style.border = "";
      ivreaInput.style.border = "";
      sedeInput.style.border = "";
    }, 1500);

    const newgar = await calcolaGaranziaEsatta(marca, nuovoPrezzo);   
    const tdgar = riga.querySelector('span[id="gar"]');
    const tdtot = riga.querySelector('span[id="tot"]');
    tdgar.textContent = newgar.garanzia.toFixed(2);
    tdtot.textContent = `${newgar.totale.toFixed(2)} €`;
    //visualizzaTablet();
  } catch(err) {
    alert("⚠️ Errore nell'aggiornamento: " + err.message);
  }
}

//FILTRO VELOCE
function fastfilter() {
  const valoreCodice = document.getElementById("fastfilterinput").value.trim().toLowerCase();
console.log(valoreCodice);
  // Imposta solo il filtro codice, gli altri restano vuoti
  visualizzaTablet({ codice: valoreCodice });
}

function delsel() {
  const userConfirmed = confirm("Sei sicuro di voler procedere?");
  if (userConfirmed) {
    db.collection("tab").get().then(snapshot => {
      const aggiornamenti = snapshot.docs.map(doc => {
        return doc.ref.update({ sel: "NO"});
      });
  
      Promise.all(aggiornamenti).then(() => {
        visualizzaTablet();
      });
    });
  }
}


function delspunte() {
  const userConfirmed = confirm("Sei sicuro di voler procedere?");
  if (userConfirmed) {
    db.collection("tab").get().then(snapshot => {
      const aggiornamenti = snapshot.docs.map(doc => {
        return doc.ref.update({ check: "NO" });
      });
  
      Promise.all(aggiornamenti).then(() => {
          visualizzaTablet();
      });
    });
  }
}

function delvolantino() {
  const userConfirmed = confirm("Sei sicuro di voler procedere?");
  if (userConfirmed) {
    db.collection("tab").get().then(snapshot => {
      const aggiornamenti = snapshot.docs.map(doc => {
        return doc.ref.update({ volantino: "NO" });
      });
  
      Promise.all(aggiornamenti).then(() => {
        visualizzaTablet();
      });
    });
  }
}

function filtraSoloYES() {
  db.collection("tab").get().then(snapshot => {
    const filtrati = snapshot.docs
      .map(doc => doc.data())
      .filter(d => d.sel === "YES")
      .sort((a, b) => {
        if (a.gruppo < b.gruppo) return -1;
        if (a.gruppo > b.gruppo) return 1;
        return 0;
      });

    mostraTabella(filtrati);
  }).catch(err => {
    console.error("❌ Errore nel filtro YES:", err.message);
  });
}