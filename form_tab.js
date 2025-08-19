const firebaseConfig = {
  apiKey: "AIzaSyDaERrSbbXOpYVcjUIvx_X1HtGi8kFyHCI",
  authDomain: "infonbk-e6448.firebaseapp.com",
  projectId: "infonbk-e6448",
  storageBucket: "infonbk-e6448.appspot.com",
  messagingSenderId: "999879953189",
  appId: "1:999879953189:web:395a6da1e00660be2b68cc"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

const campiMetadata = ["marca", "tipo", "pollici", "ram", "ssd"];

window.addEventListener("DOMContentLoaded", () => {
  auth.onAuthStateChanged(user => {
    if (user) {
      console.log("✅ Utente autenticato:", user.email);
      inizializzaForm();
    } else {
      console.log("❌ Utente NON autenticato. Redirect...");
      window.location.href = "index.html";
    }
  });
});

async function inizializzaForm() {
  for (const campo of campiMetadata) {
    try {
      const snap = await db.collection("metadata_tab").doc(campo).get();
      const valori = snap.data()?.values || [];
      const select = document.querySelector(`select[name="${campo}"]`);

      if (!select) {
        console.warn(`⚠️ Campo "${campo}" non trovato nel DOM`);
        continue;
      }

      // Svuota le opzioni esistenti prima di popolarle
      select.innerHTML = '';

      const defaultOpt = document.createElement("option");
      defaultOpt.value = "";
      defaultOpt.textContent = "-- Nessuna selezione --";
      defaultOpt.selected = true;
      defaultOpt.disabled = true;
      select.appendChild(defaultOpt);

      valori.forEach(v => {
        const opt = document.createElement("option");
        opt.value = v;
        opt.textContent = v;
        select.appendChild(opt);
      });
    } catch (err) {
      console.error(`❌ Errore nel recupero di "${campo}":`, err);
    }
  }

  const form = document.getElementById("tabletForm");
  form.addEventListener("submit", async e => {
    e.preventDefault();

    const dati = {};
    const elementi = e.target.elements;
    for (let i = 0; i < elementi.length; i++) {
      const el = elementi[i];
      if (el.name) {
        dati[el.name] = el.type === "number" ? Number(el.value) : el.value;
      }
    }

    const esiste = await db.collection("tab").doc(dati.codice).get();
    if (esiste.exists) {
      document.getElementById("statusMsg").style.color = "red";
      document.getElementById("statusMsg").innerText = "⚠️ Codice già esistente. Inserimento annullato.";
      return;
    }

    try {
      await db.collection("tab").doc(dati.codice).set(dati);
      document.getElementById("statusMsg").innerText = "Tablet salvato con successo ✅";
      e.target.reset();
      window.location.href = "home_tab.html";
    } catch (err) {
      document.getElementById("statusMsg").innerText = "Errore nel salvataggio ❌";
    }
  });
}