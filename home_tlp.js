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

const campiDaVisualizzare = ["marca", "nome","brand", "pollici", "cpu", "ram", "ssd", "5G", "back", "front", "ottica", "x","prezzo", "expo","ivrea"];
let datiCorrenti = null;

auth.onAuthStateChanged(user => {
  if (user) {
    console.log("✅ Utente autenticato:", user.email);
    inizializzaSmartphone(); // Tutto il tuo codice qui
  } else {
    console.log("❌ Utente NON autenticato. Redirect...");
    window.location.href = "index.html";
  }
});

function inizializzaSmartphone() {
  console.log("🚀 JS caricato e DOM pronto");
  visualizzaSmartphone();

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
      visualizzaSmartphone(datiFiltri);
    document.getElementById("sezioneFiltri").style.display = "none";
  });
  document.getElementById("fastfilterinput").addEventListener("input", fastfilter);
  document.getElementById("ffmarca").addEventListener("input", ffmarcalo);
  document.getElementById("ffcpu").addEventListener("input", ffcpulo);

}
// ✅ CLIC ESTERNO CHIUDE MODALE
  document.getElementById("overlayModifica").addEventListener("click", function(e) {
    const contenuto = document.querySelector(".overlay-content");
    if (!contenuto.contains(e.target)) {
      chiudiOverlay();
    }
  });



// Popola select campi filtrabili
const campiFiltrabili = [
  "marca", "brand", "pollici", "cpu", "gruppo", "ram", "ssd",
  "front","back", "webcam"
];
const campiBooleani = [
  "5G", "dualsim","espandibile", "x", "expo"
];

// 🎛️ Campi da metadata
campiFiltrabili.forEach(async campo => {
  const snap = await db.collection("metadata_tlp").doc(campo).get();
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


// 🎯 Visualizza smartphone con filtri
function visualizzaSmartphone(filtri = {}, soloYES = false) {

  db.collection("tlp")
    .orderBy("gruppo", "asc")
    .orderBy("marca", "asc")
    .orderBy("prezzo", "asc")
    .orderBy("nome", "asc")
    .get()
    .then(snapshot => {
      let docs = snapshot.docs;

      // 🔍 Filtra lato client
      const filtrati = docs.filter(doc => {
        const d = doc.data();

        // Campi con confronto diretto (select)
        for (let campo of ["brand", "gruppo", "ram", "ssd", "dualsim", "espandibile", "x", "expo"]) {
          if (filtri[campo] && d[campo] !== filtri[campo]) return false;
        }

        // 💰 Filtri numerici
        const FtMax = Number(filtri.prezzoMax)/100;
        let FtMaxVal = FtMax*11;
        FtMaxVal +=Number(filtri.prezzoMax)+25;
        const RealMax = d.prezzo/100;
        let RealMaxVal = RealMax*11;
        RealMaxVal +=Number(d.prezzo)+25;

        if (filtri.prezzoMin && d.prezzo < Number(filtri.prezzoMin)) return false;
        if (FtMaxVal && RealMaxVal > FtMaxVal) return false;

        if (filtri.nome && !((d.nome || "").toLowerCase().includes(filtri.nome.toLowerCase()))) return false;
        if (filtri.marca && !((d.marca || "").toLowerCase().includes(filtri.marca.toLowerCase()))) return false;
        if (filtri.cpu && !((d.cpu || "").toLowerCase().includes(filtri.cpu.toLowerCase()))) return false;
        if (soloYES && d.sel !== "YES" && d.selG !== "YES") return false;
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
      return calcolaGaranziaEsatta(prezzo);
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
    let pricegar = parseFloat(data.prezzo) + parseFloat(garanzia.toFixed(2));
    pricegar = pricegar.toFixed(2);

    const gruppoAttuale = data.gruppo;
    if (gruppoAttuale !== ultimoGruppo) {
      ultimoGruppo = gruppoAttuale;
      usaGiallo = !usaGiallo;
    }

    const classeRiga = usaGiallo ? "riga-gialla" : "riga-rosa";
    html += `<tr class="${classeRiga}" data-classe="${classeRiga}" ondblclick="apriModifica('${doc.id}')">`;
    html += `<td><input type="checkbox" onclick="evidenzia(this, '${doc.id}',1)" ${data.selG === "YES" ? "checked" : ""}><br>`;
    html += `<input type="checkbox" onclick="evidenzia(this, '${doc.id}',2)" ${data.sel === "YES" ? "checked" : ""}></td>`;
    html += `<td>${data.marca}`;
    html += data.brand !== "NO" ? ` (${data.brand})</td>` : "</td>";
    html += `<td id="tdbig"><b>${data.nome}</b></td>`;
    html += `<td>${data.pollici}"</td>`;
    html += `<td style="font-size: 12px;">${data.cpu}</td>`;
    html += data["5G"] === "SI" ? `<td>5G&emsp;</td>` : `<td>4G&emsp;</td>`;
    html += `<td id="tdbig"><b>${data.ram}</b>/<b>${data.ssd}&emsp;</b></td>`;
    html += `<td style="font-size: 12px;" class="mpx">${data.back} MP <br>${data.front} MP`;
    html += `<div class="ottica"><b>${data.ottica}</b></div></td>`;
    if (data.x === "SI"){
      html += `<td>&#10060;</td>`;
    } else {
      html += `<td>-</td>`;
    }
    html += `<td><input name="prezzo" value="${data.prezzo}"></td>`;
    html += `<td ${data.selG === "YES" ? ' class="rigaevid"' : ""} id="tdbig"><b><span id="pricegar">${pricegar} €</span></b></td>`;
    html += `<td ${data.sel === "YES" ? ' class="rigaevid"' : ""} id="tdbig"><b><span id="gartie">${totale.toFixed(2)} €</span></b></td>`;

    html += `<td><input name="ivrea" value="${data.ivrea}">`;
    html += `<button class="updpricebt" onclick="aggiornaPrezzo('${doc.id}', event)">✅</button></td>`;
    html += `<td><input type="checkbox" onclick="spuntalo(this, '${doc.id}')" ${data.check === "YES" ? "checked" : ""}></td>`;

    html += `</tr>`;

  }
  html+=`</table>`;
  document.getElementById("tabella").innerHTML = html;
}

async function calcolaGaranziaEsatta(prezzoSmartphone) {
  try {

    // 2️⃣ Recupera il documento con ID uguale alla lettera
    const gruppoDoc = await db.collection("gar_tlp").doc("values").get();
    const garanziaValore = gruppoDoc.data()?.[String(prezzoSmartphone)];

    if (garanziaValore === undefined) {
      console.warn(`⚠️ Nessuna garanzia trovata per il prezzo ${prezzoSmartphone}`);
      return { garanzia: 0, totale: prezzoSmartphone + 40 };
    }
    if (garanziaValore<22.5){
      return {
        garanzia: garanziaValore,
        totale: prezzoSmartphone + garanziaValore + 40
      };
    } else{
      return {
        garanzia: garanziaValore,
        totale: prezzoSmartphone + garanziaValore + 25
      };

    }

  } catch (err) {
    console.error("❌ Errore nel calcolo della garanzia:", err);
    return { garanzia: 0, totale: prezzoSmartphone + 40 };
  }
}

//EVIDENZIA RIGA
function evidenzia(checkbox, idDoc, col) {
  const riga = checkbox.parentNode.parentNode;
  let cellaDaEvidenziare;
  if (col === 1){
    cellaDaEvidenziare = riga.cells[10]; // Cambia l'indice per scegliere la colonna

  } else {
    cellaDaEvidenziare = riga.cells[11]; // Cambia l'indice per scegliere la colonna
  }

  const classeOriginale = cellaDaEvidenziare.getAttribute("data-classe");

  if (checkbox.checked) {
    cellaDaEvidenziare.classList.remove("riga-gialla", "riga-rosa");
    cellaDaEvidenziare.classList.add("rigaevid");

    if (col === 1){
      db.collection("tlp").doc(idDoc).update({ selG: "YES" });
    } else {
      db.collection("tlp").doc(idDoc).update({ sel: "YES" });
    }

  } else {
    cellaDaEvidenziare.classList.remove("rigaevid");
    if (classeOriginale) {
      cellaDaEvidenziare.classList.add(classeOriginale);
    }
    if (col === 1){
      db.collection("tlp").doc(idDoc).update({ selG: "NO" });
    } else {
      db.collection("tlp").doc(idDoc).update({ sel: "NO" });
    }
  }
}


//SPUNTALO
function spuntalo(checkbox, idDoc) {
  const riga = checkbox.parentNode.parentNode;
  if (checkbox.checked) {
    db.collection("tlp").doc(idDoc).update({ check: "YES" });
  } else {
    db.collection("tlp").doc(idDoc).update({ check: "NO" });
  }
}

// 🛠️ Apri overlay
function apriModifica(idDoc) {
  db.collection("tlp").doc(idDoc).get().then(doc => {
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
  db.collection("tlp").doc(datiCorrenti).update(aggiornati).then(() => {
    const msg = document.getElementById("msgStato");
    msg.innerText = "✅ Record aggiornato!";
    msg.style.color = "green";
    setTimeout(() => {
      msg.innerText = "";
      msg.style.color = "";
    }, 3000);
    visualizzaSmartphone();
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
    db.collection("tlp").doc(datiCorrenti).delete().then(() => {
      chiudiOverlay();
      visualizzaSmartphone();
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
  visualizzaSmartphone();
}

async function aggiornaPrezzo(idDoc, event) {
  const riga = event.target.closest("tr"); 
  const prezzoInput = riga.querySelector('input[name="prezzo"]');
  const ivreaInput = riga.querySelector('input[name="ivrea"]');

  const nuovoPrezzo = Number(prezzoInput.value);
  const nuovoIvrea = ivreaInput.value.trim();
  try {
    await db.collection("tlp").doc(idDoc).update({
    prezzo: nuovoPrezzo,
    ivrea: nuovoIvrea,
  });
  
  prezzoInput.style.border = "2px solid green";
  ivreaInput.style.border = "2px solid green";

  setTimeout(() => {
    prezzoInput.style.border = "";
    ivreaInput.style.border = "";
  }, 1500);
  const newgar = await calcolaGaranziaEsatta(nuovoPrezzo);   
  const tdgar = riga.querySelector('span[id="pricegar"]');
  const tdtot = riga.querySelector('span[id="gartie"]');
  const pricegar = Number(nuovoPrezzo)+Number(newgar.garanzia.toFixed(2));
  tdgar.textContent = `${pricegar.toFixed(2)} €`;
  tdtot.textContent = `${newgar.totale.toFixed(2)} €`;
  //visualizzaSmartphone();
  } catch(err){
    alert("⚠️ Errore nell'aggiornamento: " + err.message);
  }
}

//FILTRO VELOCE
function fastfilter() {
  const valoreCodice = document.getElementById("fastfilterinput").value.trim().toLowerCase();
  visualizzaSmartphone({ nome: valoreCodice });
}
function ffmarcalo() {
  const valoreCodice = document.getElementById("ffmarca").value.trim().toLowerCase();
  visualizzaSmartphone({ marca: valoreCodice });
}
function ffcpulo() {
  const valoreCodice = document.getElementById("ffcpu").value.trim().toLowerCase();
  visualizzaSmartphone({ cpu: valoreCodice });
}

function delsel() {
  const userConfirmed = confirm("Sei sicuro di voler procedere?");
  if (userConfirmed) {
    db.collection("tlp").get().then(snapshot => {
      const aggiornamenti = snapshot.docs.map(doc => {
        return doc.ref.update({ sel: "NO", selG: "NO" });
      });
  
      Promise.all(aggiornamenti).then(() => {
        visualizzaSmartphone(); // ✅ Ora parte al momento giusto
      });
    });
  }
}


function delspunte() {
  const userConfirmed = confirm("Sei sicuro di voler procedere?");
  if (userConfirmed) {
    db.collection("tlp").get().then(snapshot => {
      const aggiornamenti = snapshot.docs.map(doc => {
        return doc.ref.update({ check: "NO" });
      });
  
      Promise.all(aggiornamenti).then(() => {
        visualizzaSmartphone();
      });
    });
  }
}

function filtraSoloYES() {
  db.collection("tlp").get().then(snapshot => {
    const filtrati = snapshot.docs
      .map(doc => doc.data())
      .filter(d => d.sel === "YES" || d.selG === "YES")
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

