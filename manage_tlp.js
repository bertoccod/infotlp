// 1) Inizializza Firebase (compat)
// --------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDaERrSbbXOpYVcjUIvx_X1HtGi8kFyHCI",
  authDomain: "infonbk-e6448.firebaseapp.com",
  projectId: "infonbk-e6448",
  storageBucket: "infonbk-e6448.appspot.com",
  messagingSenderId: "999879953189",
  appId: "1:999879953189:web:395a6da1e00660be2b68cc"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 2) Stato applicazione
// ----------------------
let currentSub = null;       // 'specs' | 'warranty'
let currentCollection = '';  // 'metadata_nbk' | 'gar_nbk'
let currentDocId = null;

// 3) Mappature
// -------------
const MAP = {
  specs:    { label: 'Specifiche', collection: 'metadata_tlp' },
  warranty: { label: 'Garanzie',  collection: 'gar_tlp' }
};

// 4) Riferimenti DOM
// -------------------
const breadcrumb    = document.getElementById('breadcrumb');
const submenuEl     = document.getElementById('submenu');
const formContainer = document.getElementById('formContainer');

// 5) Carica sottomenu (colonna 2)
// --------------------------------
function loadSubmenu(subkey) {
  currentSub = subkey;
  currentCollection = MAP[subkey].collection;
  currentDocId = null;
  breadcrumb.textContent = `📌 Sezione: ${MAP[subkey].label}`;
  submenuEl.innerHTML = '';
  formContainer.innerHTML = '';

  db.collection(currentCollection).get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const li = document.createElement('li');
        li.textContent = doc.id;
        li.onclick = () => loadDoc(doc.id, doc.data(), li);
        submenuEl.appendChild(li);
      });
    })
    .catch(err => {
      console.error(err);
      alert('Errore nel caricamento dei documenti');
    });
}

// 6) Seleziona documento e costruisci form (colonna 3)
// ----------------------------------------------------
function loadDoc(docId, docData, liElement) {
  Array.from(submenuEl.children)
    .forEach(li => li.classList.remove('selected'));
  liElement.classList.add('selected');

  currentDocId = docId;
  // Specifiche usa editor a lista
  if (currentSub === 'specs') {
    buildFormSpecs(docData);
  } else {
    buildFormWarranty(docData);
  }
}

// 7A) Form per Specifiche (lista di valori in input singolo)
// -----------------------------------------------------------
function buildFormSpecs(data) {
  formContainer.innerHTML = '';
  const form = document.createElement('form');
  formContainer.appendChild(form);

  // Recupero array di valori
  // Se il doc è { values: [...] } oppure chiavi dirette
  const list = Array.isArray(data.values)
    ? data.values
    : Object.keys(data);

  // 1) Crea input per ogni valore esistente
  list.forEach(val => {
    const row = document.createElement('div');
    row.className = 'field-row';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = val;
    row.appendChild(input);

    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = '×';
    del.onclick = () => row.remove();
    row.appendChild(del);

    form.appendChild(row);
  });

  // 2) Riga di aggiunta
  const addRow = document.createElement('div');
  addRow.className = 'field-row';

  const newInput = document.createElement('input');
  newInput.type = 'text';
  newInput.placeholder = 'Nuova voce...';
  addRow.appendChild(newInput);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.textContent = '+';
  addBtn.onclick = () => {
    const v = newInput.value.trim();
    if (!v) return;
    // crea nuova riga come le esistenti
    const row = document.createElement('div');
    row.className = 'field-row';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = v;
    row.appendChild(input);

    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = '×';
    del.onclick = () => row.remove();
    row.appendChild(del);

    form.insertBefore(row, addRow);
    newInput.value = '';
  };
  addRow.appendChild(addBtn);
  form.appendChild(addRow);

  // 3) Salva
  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.id = 'saveBtn';
  saveBtn.textContent = 'Salva';
  saveBtn.onclick = async () => {
    const values = [];
    form.querySelectorAll('.field-row input[type="text"]').forEach(i => {
      const v = i.value.trim();
      if (v) values.push(v);
    });

    // Decidi struttura payload
    const payload = Array.isArray(data.values)
      ? { values }
      : values.reduce((o, v) => { o[v] = v; return o; }, {});

    try {
      await db.collection(currentCollection)
              .doc(currentDocId)
              .set(payload);
      alert('Specifiche aggiornate');
      buildFormSpecs(payload);
    } catch (e) {
      console.error(e);
      alert('Errore durante il salvataggio');
    }
  };
  form.appendChild(saveBtn);
}


// 7B) Form per Garanzie (campi key→value, con numerico)
// -----------------------------------------------------
function buildFormWarranty(data) {
  formContainer.innerHTML = '';
  const isGroup = currentDocId === 'gruppi';
  const requireNum = !isGroup;
  const form = document.createElement('form');
  form.noValidate = true;
  formContainer.appendChild(form);

  // righe esistenti
  Object.entries(data).forEach(([k, v]) => {
    const row = document.createElement('div');
    row.className = 'field-row';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'field-name';
    nameSpan.textContent = k;
    row.appendChild(nameSpan);

    const input = document.createElement('input');
    input.type = requireNum ? 'number' : 'text';
    input.value = v;
    row.appendChild(input);

    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = '×';
    del.onclick = () => row.remove();
    row.appendChild(del);

    form.appendChild(row);
  });

  // riga nuovo campo
  const addRow = document.createElement('div');
  addRow.className = 'field-row';

  const newKey = document.createElement('input');
  newKey.type = 'text';
  newKey.placeholder = 'Nuova chiave...';
  addRow.appendChild(newKey);

  const newVal = document.createElement('input');
  newVal.type = requireNum ? 'number' : 'text';
  newVal.placeholder = 'Nuovo valore...';
  addRow.appendChild(newVal);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.textContent = '+';
  addBtn.onclick = () => {
    const k = newKey.value.trim();
    const v = newVal.value.trim();
    if (!k || !v) return;
    if (requireNum && isNaN(v)) {
      alert('Inserisci un valore numerico valido');
      return;
    }
    // ricrea la riga
    const row = document.createElement('div');
    row.className = 'field-row';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'field-name';
    nameSpan.textContent = k;
    row.appendChild(nameSpan);

    const input = document.createElement('input');
    input.type = requireNum ? 'number' : 'text';
    input.value = v;
    row.appendChild(input);

    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = '×';
    del.onclick = () => row.remove();
    row.appendChild(del);

    form.insertBefore(row, addRow);
    newKey.value = '';
    newVal.value = '';
  };
  addRow.appendChild(addBtn);
  form.appendChild(addRow);

  // salva
  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.id = 'saveBtn';
  saveBtn.textContent = 'Salva';
  saveBtn.onclick = async () => {
    const payload = {};
    let valid = true;
    form.querySelectorAll('.field-row').forEach(r => {
      const nameEl = r.querySelector('.field-name') || r.children[0];
      const valEl  = r.querySelector('input');
      if (!nameEl || !valEl) return;
      const k = (nameEl.textContent || nameEl.value).trim();
      const v = valEl.value.trim();
      if (!k) return;
      if (requireNum) {
        const num = Number(v);
        if (v === '' || isNaN(num)) valid = false;
        else payload[k] = num;
      } else {
        payload[k] = v;
      }
    });
    if (!valid) {
      alert('Controlla i campi numerici');
      return;
    }
    try {
      await db.collection(currentCollection)
              .doc(currentDocId)
              .set(payload);
      alert('Documento aggiornato');
      loadDoc(currentDocId, payload, 
        Array.from(submenuEl.children)
             .find(li => li.textContent === currentDocId)
      );
    } catch (e) {
      console.error(e);
      alert('Errore durante il salvataggio');
    }
  };
  form.appendChild(saveBtn);
}