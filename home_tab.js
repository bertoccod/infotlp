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

const campiDaVisualizzare = ["codice", "marca", "nome", "pollici", "tipo", "ram", "ssd", "x", "volantino","prezzo", "expo", "ivrea", "sede"];

window.onload = function() {
  console.log("🚀 JS caricato e DOM pronto");
  mostraTabella();

  document.getElementById("btnModifica").addEventListener("click", abilitaModifica);
  document.getElementById("btnElimina").addEventListener("click", eliminaRecord);
  document.getElementById("btnAnnulla").addEventListener("click", chiudiOverlay);
  document.getElementById("modificaForm").addEventListener("submit", aggiornaRecord);

// ✅ CLIC ESTERNO CHIUDE MODALE
document.getElementById("overlayModifica").addEventListener("click", function(e) {
    const contenuto = document.querySelector(".overlay-content");
    if (!contenuto.contains(e.target)) {
      chiudiOverlay();
    }
  });
}

//EVIDENZIA RIGA
function evidenzia(checkbox, idDoc) {
  const riga = checkbox.parentNode.parentNode;
  const classeOriginale = riga.getAttribute("data-classe");

  if (checkbox.checked) {
    riga.classList.remove("riga-gialla", "riga-rosa");
    riga.classList.add("rigaevid");
    db.collection("tab").doc(idDoc).update({ sel: "YES" });
  } else {
    riga.classList.remove("rigaevid");
    riga.classList.add(classeOriginale);
    db.collection("tab").doc(idDoc).update({ sel: "NO" });
  }
}

async function mostraTabella() {
  try {
    const snapshot = await db.collection("tab").orderBy("tipo", "asc").get();
    let docs = snapshot.docs;
    let html = `<table class="elenco"><thead><tr>`;
    html += '<th>Selez.</th>';

    for (const campo of campiDaVisualizzare) {
      if (campo==="volantino"){
        html += `<th>vol.</th>`;
      } else {
        html += `<th>${campo}</th>`;
      }
      if (campo === "prezzo") {
        html += `<th>Garanzia</th><th>Totale</th>`;
      }
    }

    html += `<th>Azioni</th></tr></thead><tbody>`;
    let ultimoGruppo = null;
    let usaGiallo = true;

    for (const doc of docs) {
      const data = doc.data();
      const gruppoAttuale = data.tipo;

      if (gruppoAttuale !== ultimoGruppo) {
        ultimoGruppo = gruppoAttuale;
        usaGiallo = !usaGiallo;
      }

      const classeRiga = usaGiallo ? "riga-gialla" : "riga-rosa";
      let garanzia = "";
      let totale = "";

      if (data.sel === "YES") {
        html += `<tr class="rigaevid" data-classe="${classeRiga}">`;
        html += `<td><input type="checkbox" onclick="evidenzia(this, '${doc.id}')" checked></td>`;
      } else {
        html += `<tr class="${classeRiga}" data-classe="${classeRiga}">`;
        html += `<td><input type="checkbox" onclick="evidenzia(this, '${doc.id}')"></td>`;
      }

      for (const campo of campiDaVisualizzare) {
        const valore = data[campo] || "";

        if (campo === "prezzo") {
          html += `<td><input name="${campo}" value="${valore}" class="inputprezzo"></td>`;

          if (data.marca && valore) {
            try {
              const prezzoNum = parseFloat(valore);
              const risultatoGaranzia = await calcolaGaranziaEsatta(data.marca, prezzoNum);
              garanzia = risultatoGaranzia.garanzia;
              totale = risultatoGaranzia.totale;
            } catch (err) {
              console.warn("Errore nel calcolo garanzia:", err);
            }
          }

          html += `<td>${garanzia !== "" ? garanzia.toFixed(2) : ""}</td>`;
          html += `<td><b>${totale !== "" ? totale.toFixed(2) : ""}</b></td>`;
      } else if (["ivrea"].includes(campo)){
          if (data.expo ==="SI"){
            html += `<td><input name="${campo}" value="${valore}" class="inputexpo"></td>`;
          } else {
            html += `<td><input name="${campo}" value="${valore}" class="inputgiacenze"></td>`;
          }
        } else if (["sede"].includes(campo)) {
          html += `<td><input name="${campo}" value="${valore}" class="inputgiacenze"></td>`;


        } else if (["codice"].includes(campo)){
          html += `<td>${valore}</td>`;
        } else{
          html += `<td ondblclick="apriModifica('${doc.id}')">${valore}</td>`;
        }
      }

      html += `<td><button class="updpricebt" onclick="aggiornaPrezzo('${doc.id}', event)">✅</button></td>`;
      html += `</tr>`;
    }

    html += `</tbody></table>`;
    document.getElementById("tabella").innerHTML = html;
  } catch (err) {
    console.error("❌ Errore nel mostrare la tabella:", err);
  }
}

                  
async function calcolaGaranziaEsatta(marca, prezzoTablet) {
  //console.log("🔍 Calcolo garanzia per marca:", marca, "e prezzo:", prezzoNotebook);
  try {
    // 1️⃣ Recupera il documento "gruppi" per trovare la lettera del gruppo associato alla marca
    const gruppiDoc = await db.collection("gar_tab").doc("gruppi").get();
    const gruppoLettera = gruppiDoc.data()?.[marca];

    if (!gruppoLettera) {
      console.warn(`⚠️ Nessun gruppo trovato per la marca: ${marca}`);
      return { garanzia: 0, totale: prezzoTablet};
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
    return { garanzia: 0, totale: prezzoTablet};
  }
}
// 🛠️ Apri overlay
function apriModifica(idDoc) {
  const form = document.getElementById("modificaForm");

  // Recupera documento principale
  db.collection("tab").doc(idDoc).get().then(doc => {
    const data = doc.data();
    datiCorrenti = idDoc;

    // Imposta i valori nei campi del form
    for (let k in data) {
      const el = form[k];
      if (el) {
        el.value = data[k] || "";
      }
    }

    // Disabilita i campi
    Array.from(form.elements).forEach(el => {
      if (el.tagName !== "BUTTON") el.disabled = true;
    });

    document.getElementById("overlayModifica").style.display = "flex";
    document.getElementById("msgStato").innerText = "";

    // 🔽 Popola i SELECT con le opzioni della raccolta metadata_tab
    db.collection("metadata_tab").get().then(snapshot => {
      snapshot.forEach(metaDoc => {
        const metaData = metaDoc.data();
        const key = metaDoc.id;

        // Supponiamo che nel form esista un <select name="categoria"> o simili
        const select = form[key];
        if (select && select.tagName === "SELECT") {
          // Rimuove eventuali opzioni precedenti
          select.innerHTML = "";

          // Aggiunge le opzioni disponibili
          metaData.values.forEach(opt => {
            const option = document.createElement("option");
            option.value = opt;
            option.textContent = opt;
            select.appendChild(option);
          });

          // Imposta il valore selezionato dopo aver aggiunto le opzioni
          select.value = data[key] || "";
        }
      });
    });
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
    mostraTabella();
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
      mostraTabella();
    });
  }
}