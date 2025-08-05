const firebaseConfig = {
  apiKey: "",
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

// Campi da popolare via metadata
const campiMetadata = ["marca", "brand", "gruppo", "ram", "ssd"];

window.onload = () => {
  campiMetadata.forEach(async campo => {
    const snap = await db.collection("metadata_tlp").doc(campo).get();
    const valori = snap.data()?.values || [];
    const select = document.querySelector(`select[name="${campo}"]`);
    //TEST
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "-- Nessuna selezione --";
    select.appendChild(blank);
    //fine test
    valori.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    });
  });
};

// Invia il form
document.getElementById("smartphoneForm").addEventListener("submit", async e => {
  e.preventDefault();

  const dati = {};
  const elementi = e.target.elements;
  for (let i = 0; i < elementi.length; i++) {
    const el = elementi[i];
    if (el.name) dati[el.name] = el.type === "number" ? Number(el.value) : el.value;
  }
  /* 🔒 Controlla se il codice esiste già
  const esiste = await db.collection("nbk").doc(dati.codice).get();
  if (esiste.exists) {
    document.getElementById("statusMsg").style.color = "red";
    document.getElementById("statusMsg").innerText = "⚠️ Codice già esistente. Inserimento annullato.";
    return;
  }*/
  try {
    //await db.collection("nbk").doc(dati.codice).set(dati);
    const newDocRef = db.collection("tlp").doc();
    await newDocRef.set(dati);

    document.getElementById("statusMsg").innerText = "Smartphone salvato con successo ✅";
    e.target.reset();
    window.location.href = "home_tlp.html";
  } catch (err) {
    document.getElementById("statusMsg").innerText = "Errore nel salvataggio ❌";
  }
});
