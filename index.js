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
const auth = firebase.auth();

//Login
function login(){
  const email = document.getElementById("email").value;
  const pw = document.getElementById("password").value;
  auth.signInWithEmailAndPassword(email, pw)
    .then(() => {
      document.getElementById("loginForm").style.display = "none";
      document.getElementById("app").style.display = "block";
      document.getElementById("errorMessage").innerText="";
    })
    .catch((error) => {
      document.getElementById("errorMessage").innerText="Login fallito. Controlla i dati";
    });;
}

//Logout
function logout(){
  auth.signOut().then(() =>{
    document.getElementById("loginForm").style.display = "block";
    document.getElementById("app").style.display = "none";
  });
}
//Controllo accesso automatico
auth.onAuthStateChanged((user) =>{
  if(user){
    document.getElementById("loginForm").style.display = "none";
    document.getElementById("app").style.display = "block";
  } else {
    document.getElementById("loginForm").style.display = "block";
    document.getElementById("app").style.display = "none";
  }
});
  

